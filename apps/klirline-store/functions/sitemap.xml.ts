/**
 * Cloudflare Pages Function — live sitemap (+ Google image extensions).
 * Always returns 200: homepage + legal; products when env is set.
 * Env: SUPABASE_URL + SUPABASE_ANON_KEY (or VITE_* equivalents).
 */
// @ts-nocheck

const SITE = 'https://klirline.com';

const STATIC_PATHS = [
  { loc: `${SITE}/`, priority: '1.0', changefreq: 'daily' },
  { loc: `${SITE}/cgv`, priority: '0.3', changefreq: 'monthly' },
  { loc: `${SITE}/confidentialite`, priority: '0.3', changefreq: 'monthly' },
  { loc: `${SITE}/litiges`, priority: '0.3', changefreq: 'monthly' },
  { loc: `${SITE}/retours`, priority: '0.3', changefreq: 'monthly' },
  { loc: `${SITE}/sequestre`, priority: '0.3', changefreq: 'monthly' },
];

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry({ loc, lastmod, priority, changefreq, images }) {
  let body = `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n`;
  if (lastmod) body += `    <lastmod>${xmlEscape(lastmod)}</lastmod>\n`;
  if (changefreq) body += `    <changefreq>${changefreq}</changefreq>\n`;
  if (priority) body += `    <priority>${priority}</priority>\n`;
  if (images?.length) {
    for (const img of images) {
      if (!img?.url) continue;
      body += `    <image:image>\n      <image:loc>${xmlEscape(img.url)}</image:loc>\n`;
      if (img.title) body += `      <image:title>${xmlEscape(img.title)}</image:title>\n`;
      body += `    </image:image>\n`;
    }
  }
  body += `  </url>\n`;
  return body;
}

function xmlBody(urls) {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    urls.map(urlEntry).join('') +
    `</urlset>\n`
  );
}

function xmlResponse(urls) {
  return new Response(xmlBody(urls), {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function onRequestGet(context) {
  try {
    const env = context?.env || {};
    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

    const urls = [...STATIC_PATHS];

    if (supabaseUrl && key) {
      try {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/products?select=id,name,image_url,images,created_at,in_stock,seller_id&in_stock=eq.true&seller_id=not.is.null&order=created_at.desc&limit=5000`,
          {
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
              Accept: 'application/json',
            },
          },
        );
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows)) {
            for (const row of rows) {
              if (!row?.id || !row?.seller_id) continue;
              const imgs = [];
              if (row.image_url) imgs.push({ url: row.image_url, title: row.name });
              if (Array.isArray(row.images)) {
                for (const u of row.images.slice(0, 5)) {
                  if (typeof u === 'string' && u && u !== row.image_url) {
                    imgs.push({ url: u, title: row.name });
                  }
                }
              }
              urls.push({
                loc: `${SITE}/produit/${encodeURIComponent(row.id)}`,
                lastmod: row.created_at ? String(row.created_at).slice(0, 10) : undefined,
                priority: '0.8',
                changefreq: 'weekly',
                images: imgs,
              });
            }
          }
        }
      } catch {
        /* keep static urls */
      }
    }

    return xmlResponse(urls);
  } catch {
    return xmlResponse(STATIC_PATHS);
  }
}
