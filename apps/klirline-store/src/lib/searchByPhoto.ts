import { isDemoMode, supabase } from './supabase';
import { mapVisualSearchPayload, VISUAL_COPY, type VisualSearchView } from './visualSearch';

/**
 * Sends the photo as multipart FormData. Nothing is stored in the browser
 * or in Storage: the Edge Function reads the bytes and discards them.
 */
export async function searchProductsByPhoto(
  file: File,
  options?: { catalogEmpty?: boolean },
): Promise<VisualSearchView> {
  if (isDemoMode) {
    return {
      products: [],
      reliable: false,
      notice: VISUAL_COPY.demo,
      error: null,
      emptyCatalog: false,
    };
  }

  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token || anonKey;
  const body = new FormData();
  body.append('image', file, file.name || 'photo.jpg');

  let response: Response;
  try {
    response = await fetch(`${url}/functions/v1/visual-search`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      body,
    });
  } catch {
    return mapVisualSearchPayload({ error: VISUAL_COPY.config, code: 'clip_runtime' });
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = { error: VISUAL_COPY.config, code: 'clip_runtime' };
  }
  return mapVisualSearchPayload(payload, { catalogEmpty: options?.catalogEmpty });
}
