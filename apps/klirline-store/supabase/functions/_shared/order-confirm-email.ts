import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { sendResendEmail } from "./resend.ts";

function formatHtg(n: number): string {
  return `${Math.round(n).toLocaleString("fr-HT")} HTG`;
}

function paymentLabel(method: string | null | undefined): string {
  switch ((method ?? "").toLowerCase()) {
    case "stripe":
      return "Carte / Link (Stripe)";
    case "moncash":
      return "MonCash";
    case "natcash":
      return "NatCash";
    default:
      return method || "Paiement";
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absUrl(url: string | null | undefined): string | null {
  const u = (url ?? "").trim();
  if (!u) return null;
  if (u.startsWith("https://") || u.startsWith("http://")) return u;
  if (u.startsWith("//")) return `https:${u}`;
  return null;
}

type SellerBrand = {
  shopName: string;
  companyName: string | null;
  logoUrl: string;
};

type LineItem = {
  name: string;
  qty: number;
  price: number;
  lineTotal: number;
  shopName: string;
};

async function resolveSellersAndLines(
  admin: SupabaseClient,
  orderId: string,
): Promise<{ lines: LineItem[]; sellers: SellerBrand[]; primary: SellerBrand }> {
  const fallbackLogo = "https://klirline.com/klirmarket-cart.png";
  const { data: items } = await admin
    .from("order_items")
    .select(
      "quantity, price, product_id, products(name, image_url, seller_id, seller_shop_name)",
    )
    .eq("order_id", orderId);

  const sellerIds = [
    ...new Set(
      (items ?? [])
        .map((row) => (row.products as { seller_id?: string | null } | null)?.seller_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const vendorByUser = new Map<
    string,
    { business_name: string | null; owner_name: string | null }
  >();
  const avatarByUser = new Map<string, string | null>();

  if (sellerIds.length) {
    const [{ data: vendors }, { data: profiles }] = await Promise.all([
      admin
        .from("vendor_applications")
        .select("user_id, business_name, owner_name, status")
        .in("user_id", sellerIds)
        .eq("status", "approved"),
      admin.from("profiles").select("id, avatar_url, display_name").in("id", sellerIds),
    ]);

    for (const v of vendors ?? []) {
      vendorByUser.set(v.user_id, {
        business_name: v.business_name,
        owner_name: v.owner_name,
      });
    }
    for (const p of profiles ?? []) {
      avatarByUser.set(p.id, p.avatar_url);
    }
  }

  const sellerMap = new Map<string, SellerBrand>();
  const lines: LineItem[] = [];

  for (const row of items ?? []) {
    const product = row.products as {
      name?: string;
      image_url?: string | null;
      seller_id?: string | null;
      seller_shop_name?: string | null;
    } | null;

    const sellerId = product?.seller_id ?? null;
    const vendor = sellerId ? vendorByUser.get(sellerId) : undefined;
    const shopName =
      (product?.seller_shop_name ?? "").trim() ||
      (vendor?.business_name ?? "").trim() ||
      "Boutique KlirMarket";
    const companyName =
      (vendor?.business_name ?? "").trim() ||
      (vendor?.owner_name ?? "").trim() ||
      null;
    const logoUrl =
      absUrl(sellerId ? avatarByUser.get(sellerId) : null) ||
      absUrl(product?.image_url) ||
      fallbackLogo;

    const key = sellerId ?? shopName;
    if (!sellerMap.has(key)) {
      sellerMap.set(key, {
        shopName,
        companyName: companyName && companyName !== shopName ? companyName : companyName,
        logoUrl,
      });
    }

    const qty = Number(row.quantity) || 1;
    const price = Number(row.price) || 0;
    lines.push({
      name: product?.name ?? "Produit",
      qty,
      price,
      lineTotal: qty * price,
      shopName,
    });
  }

  const sellers = [...sellerMap.values()];
  const primary = sellers[0] ?? {
    shopName: "KlirMarket",
    companyName: "Klirline Inc.",
    logoUrl: fallbackLogo,
  };

  return { lines, sellers, primary };
}

/**
 * Sends order confirmation once (idempotent via confirmation_email_sent_at).
 * Soft-fails if Resend is not configured or send fails — never blocks payment.
 */
export async function sendOrderConfirmationEmail(
  admin: SupabaseClient,
  orderId: string,
): Promise<{ sent: boolean; reason?: string }> {
  const { data: order, error } = await admin
    .from("orders")
    .select(
      "id, user_id, guest_email, total, shipping_fee, payment_method, status, shipping_full_name, shipping_phone, shipping_street, shipping_city, shipping_department, confirmation_email_sent_at",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    return { sent: false, reason: "order_not_found" };
  }
  if (order.status !== "completed") {
    return { sent: false, reason: "not_completed" };
  }
  if (order.confirmation_email_sent_at) {
    return { sent: false, reason: "already_sent" };
  }

  let email = (order.guest_email as string | null)?.trim() || "";
  if (!email && order.user_id) {
    try {
      const { data } = await admin.auth.admin.getUserById(order.user_id);
      email = data.user?.email?.trim() || "";
    } catch (e) {
      console.error("getUserById for confirm email failed", e);
    }
  }
  if (!email) {
    return { sent: false, reason: "no_email" };
  }

  const { lines, sellers, primary } = await resolveSellersAndLines(admin, orderId);

  const shortId = orderId.slice(0, 8).toUpperCase();
  const total = Number(order.total) || 0;
  const shipping = Number(order.shipping_fee) || 0;
  const buyerName = (order.shipping_full_name as string | null)?.trim() || "Client";
  const pay = paymentLabel(order.payment_method as string | null);

  const itemRowsHtml = lines.length
    ? lines
      .map(
        (l) =>
          `<tr>
  <td style="padding:8px 0;border-bottom:1px solid #e2e8f0">
    <div style="font-weight:600">${escapeHtml(l.name)} × ${l.qty}</div>
    <div style="font-size:12px;color:#64748b;margin-top:2px">${escapeHtml(l.shopName)}</div>
  </td>
  <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top">${formatHtg(l.lineTotal)}</td>
</tr>`,
      )
      .join("")
    : `<tr><td colspan="2" style="padding:8px 0">Articles de la commande</td></tr>`;

  const sellersBlockHtml = sellers
    .map((s) => {
      const company =
        s.companyName && s.companyName !== s.shopName
          ? `<div style="font-size:12px;opacity:.85">${escapeHtml(s.companyName)}</div>`
          : "";
      return `<div style="display:flex;align-items:center;gap:12px;margin-top:10px">
  <img src="${escapeHtml(s.logoUrl)}" alt="" width="44" height="44" style="width:44px;height:44px;border-radius:10px;object-fit:cover;background:#fff;border:1px solid rgba(255,255,255,.25)" />
  <div>
    <div style="font-size:16px;font-weight:700">${escapeHtml(s.shopName)}</div>
    ${company}
  </div>
</div>`;
    })
    .join("");

  const itemText = lines.length
    ? lines
      .map((l) => `- ${l.name} × ${l.qty} (${l.shopName}) — ${formatHtg(l.lineTotal)}`)
      .join("\n")
    : "- (détail articles)";

  const sellersText = sellers
    .map((s) =>
      s.companyName && s.companyName !== s.shopName
        ? `${s.shopName} (${s.companyName})`
        : s.shopName,
    )
    .join(", ");

  const address = [
    order.shipping_street,
    order.shipping_city,
    order.shipping_department,
  ]
    .filter(Boolean)
    .join(", ");

  const html = `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#004F6E;color:#fff;padding:20px 24px">
      ${sellersBlockHtml || `<div style="font-size:18px;font-weight:700">${escapeHtml(primary.shopName)}</div>`}
      <div style="opacity:.9;margin-top:10px;font-size:13px">Confirmation de commande · via KlirMarket</div>
    </div>
    <div style="padding:24px">
      <p>Bonjour ${escapeHtml(buyerName)},</p>
      <p>Votre paiement a bien été reçu. Merci pour votre commande <strong>#${shortId}</strong>
        chez <strong>${escapeHtml(primary.shopName)}</strong>${
          primary.companyName && primary.companyName !== primary.shopName
            ? ` (${escapeHtml(primary.companyName)})`
            : ""
        }.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        ${itemRowsHtml}
        ${
          shipping > 0
            ? `<tr><td style="padding:8px 0">Livraison</td><td style="padding:8px 0;text-align:right">${formatHtg(shipping)}</td></tr>`
            : ""
        }
        <tr>
          <td style="padding:12px 0;font-weight:700">Total</td>
          <td style="padding:12px 0;text-align:right;font-weight:700;color:#004F6E">${formatHtg(total)}</td>
        </tr>
      </table>
      <p style="font-size:14px;color:#475569">
        <strong>Boutique :</strong> ${escapeHtml(sellersText)}<br/>
        <strong>Paiement :</strong> ${escapeHtml(pay)}<br/>
        ${address ? `<strong>Livraison :</strong> ${escapeHtml(address)}<br/>` : ""}
        ${order.shipping_phone ? `<strong>Tél. :</strong> ${escapeHtml(String(order.shipping_phone))}` : ""}
      </p>
      <p style="font-size:14px;color:#475569">
        L’argent est en séquestre jusqu’à confirmation de livraison. Suivez votre commande sur
        <a href="https://klirline.com" style="color:#004F6E">klirline.com</a>.
      </p>
      <p style="margin-top:24px;font-size:13px;color:#94a3b8">— ${escapeHtml(primary.shopName)} · KlirMarket</p>
    </div>
  </div>
</body>
</html>`;

  const text = `${primary.shopName} — Confirmation #${shortId} (KlirMarket)

Bonjour ${buyerName},

Votre paiement a bien été reçu chez ${sellersText}.

${itemText}
${shipping > 0 ? `Livraison : ${formatHtg(shipping)}\n` : ""}Total : ${formatHtg(total)}
Paiement : ${pay}
${address ? `Livraison : ${address}\n` : ""}

Séquestre jusqu’à confirmation de livraison.
https://klirline.com

— ${primary.shopName} · KlirMarket`;

  const result = await sendResendEmail({
    to: email,
    subject: `Commande confirmée #${shortId} — ${primary.shopName}`,
    html,
    text,
  });

  if (!result.ok) {
    return {
      sent: false,
      reason: result.skipped ? "resend_not_configured" : result.error || "send_failed",
    };
  }

  const { error: markErr } = await admin
    .from("orders")
    .update({ confirmation_email_sent_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("confirmation_email_sent_at", null);

  if (markErr) {
    console.error("confirmation_email_sent_at update failed", markErr);
  }

  return { sent: true };
}
