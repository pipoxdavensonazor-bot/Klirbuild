/**
 * Publication directe Facebook / Instagram / LinkedIn
 * via tokens stockés dans SocialAccount.metaJson (sans Zapier).
 *
 * metaJson Facebook:
 *   { "pageId": "123", "accessToken": "EAAB…" }
 * metaJson Instagram:
 *   { "igUserId": "1784…", "accessToken": "EAAB…" }
 * metaJson LinkedIn:
 *   { "authorUrn": "urn:li:organization:123" | "urn:li:person:ABC", "accessToken": "AQ…" }
 */

export type SocialMeta = {
  pageId?: string;
  igUserId?: string;
  authorUrn?: string;
  accessToken?: string;
};

export function parseSocialMeta(metaJson?: string | null): SocialMeta | null {
  if (!metaJson?.trim()) return null;
  try {
    const parsed = JSON.parse(metaJson) as SocialMeta;
    if (!parsed.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasDirectCredentials(
  platform: string,
  metaJson?: string | null
): boolean {
  const meta = parseSocialMeta(metaJson);
  if (!meta?.accessToken) return false;
  if (platform === "FACEBOOK") return Boolean(meta.pageId);
  if (platform === "INSTAGRAM") return Boolean(meta.igUserId);
  if (platform === "LINKEDIN") return Boolean(meta.authorUrn);
  return false;
}

type PostInput = {
  caption: string;
  url: string;
  imageUrl?: string | null;
};

export async function postToFacebook(
  meta: SocialMeta,
  input: PostInput
): Promise<{ externalId?: string }> {
  if (!meta.pageId || !meta.accessToken) {
    throw new Error("Facebook : pageId et accessToken requis");
  }
  const token = meta.accessToken;
  const pageId = meta.pageId;

  if (input.imageUrl) {
    const endpoint = new URL(
      `https://graph.facebook.com/v21.0/${pageId}/photos`
    );
    endpoint.searchParams.set("url", input.imageUrl);
    endpoint.searchParams.set("caption", input.caption);
    endpoint.searchParams.set("access_token", token);
    const res = await fetch(endpoint, { method: "POST" });
    const data = (await res.json()) as { id?: string; error?: { message?: string } };
    if (!res.ok) {
      throw new Error(data.error?.message || `Facebook HTTP ${res.status}`);
    }
    return { externalId: data.id };
  }

  const endpoint = new URL(`https://graph.facebook.com/v21.0/${pageId}/feed`);
  endpoint.searchParams.set("message", input.caption);
  endpoint.searchParams.set("link", input.url);
  endpoint.searchParams.set("access_token", token);
  const res = await fetch(endpoint, { method: "POST" });
  const data = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data.error?.message || `Facebook HTTP ${res.status}`);
  }
  return { externalId: data.id };
}

export async function postToInstagram(
  meta: SocialMeta,
  input: PostInput
): Promise<{ externalId?: string }> {
  if (!meta.igUserId || !meta.accessToken) {
    throw new Error("Instagram : igUserId et accessToken requis");
  }
  if (!input.imageUrl) {
    throw new Error("Instagram : une image (imageUrl) est obligatoire");
  }
  const token = meta.accessToken;
  const igUserId = meta.igUserId;

  const createUrl = new URL(
    `https://graph.facebook.com/v21.0/${igUserId}/media`
  );
  createUrl.searchParams.set("image_url", input.imageUrl);
  createUrl.searchParams.set("caption", input.caption);
  createUrl.searchParams.set("access_token", token);
  const createRes = await fetch(createUrl, { method: "POST" });
  const createData = (await createRes.json()) as {
    id?: string;
    error?: { message?: string };
  };
  if (!createRes.ok || !createData.id) {
    throw new Error(
      createData.error?.message || `Instagram create HTTP ${createRes.status}`
    );
  }

  const publishUrl = new URL(
    `https://graph.facebook.com/v21.0/${igUserId}/media_publish`
  );
  publishUrl.searchParams.set("creation_id", createData.id);
  publishUrl.searchParams.set("access_token", token);
  const publishRes = await fetch(publishUrl, { method: "POST" });
  const publishData = (await publishRes.json()) as {
    id?: string;
    error?: { message?: string };
  };
  if (!publishRes.ok) {
    throw new Error(
      publishData.error?.message || `Instagram publish HTTP ${publishRes.status}`
    );
  }
  return { externalId: publishData.id };
}

export async function postToLinkedIn(
  meta: SocialMeta,
  input: PostInput
): Promise<{ externalId?: string }> {
  if (!meta.authorUrn || !meta.accessToken) {
    throw new Error("LinkedIn : authorUrn et accessToken requis");
  }

  const body = {
    author: meta.authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: input.caption },
        shareMediaCategory: "ARTICLE",
        media: [
          {
            status: "READY",
            originalUrl: input.url,
            title: { text: input.caption.slice(0, 200) },
          },
        ],
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${meta.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: { id?: string; message?: string } = {};
  try {
    data = JSON.parse(text) as { id?: string; message?: string };
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new Error(data.message || text.slice(0, 200) || `LinkedIn HTTP ${res.status}`);
  }
  return { externalId: data.id };
}

export async function postDirect(
  platform: string,
  metaJson: string | null | undefined,
  input: PostInput
): Promise<{ externalId?: string }> {
  const meta = parseSocialMeta(metaJson);
  if (!meta) throw new Error("Identifiants API manquants (metaJson)");
  if (platform === "FACEBOOK") return postToFacebook(meta, input);
  if (platform === "INSTAGRAM") return postToInstagram(meta, input);
  if (platform === "LINKEDIN") return postToLinkedIn(meta, input);
  throw new Error(`Publication directe non supportée pour ${platform}`);
}
