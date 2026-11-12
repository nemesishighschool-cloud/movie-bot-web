import Constants from 'expo-constants';

export const CINEMA_API_URL: string = Constants.expoConfig?.extra?.cinemaApiUrl || 'https://script.google.com/macros/s/AKfycbwkbGjNKAyyXSjZ_IMnlfm2JDJzKmEIR6Ce-J3IBONwIk4-84EKpkovvvR8hKy4wRx9/exec';
export type Media = { uid: string; title?: string | null; source?: string | null; section?: string | null; kind?: string | null; year?: number | null; season?: number | null; synopsis?: string | null; poster_url?: string | null; languages?: unknown; genres?: unknown; etat_lecteur?: string | null; lecteur_pret?: boolean | string | null; notes?: string | null; download_hint?: string | null; embed_url?: string | null; embed_fallback?: string | null; stream_url?: string | null; download_url?: string | null; page_url?: string | null; telegram_url?: string | null };
type Envelope = {ok?: boolean; error?: string; results?: unknown; result?: unknown; total?: number; count?: number};

export function stringList(value: unknown): string[] {
  let parsed = value;
  if (typeof value === 'string') { try { parsed = JSON.parse(value); } catch { return []; } }
  return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
}
export function kindLabel(value: unknown): string {
  switch (String(value || '').toLowerCase()) { case 'film': case 'movie': return 'Film'; case 'serie': case 'series': return 'Série'; case 'anime': return 'Anime'; default: return 'Vidéo'; }
}
export function imageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && u.hostname === 'image.tmdb.org' ? u.href : null; } catch { return null; }
}
function media(value: unknown): value is Media { return !!value && typeof value === 'object' && !Array.isArray(value) && typeof (value as Media).uid === 'string' && !!(value as Media).uid; }
export async function cinemaRequest(action: 'random' | 'search' | 'get', params: Record<string, string | number>, signal?: AbortSignal): Promise<Envelope> {
  const url = new URL(CINEMA_API_URL); url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const controller = new AbortController(); const cancel = () => controller.abort();
  if (signal?.aborted) cancel(); else signal?.addEventListener('abort', cancel, {once:true});
  let timedOut = false; const timer = setTimeout(() => {timedOut = true; controller.abort();}, 90000);
  try {
    const response = await fetch(url.toString(), {method:'GET', headers:{Accept:'application/json'}, signal:controller.signal});
    if (!response.ok) throw new Error(`Service indisponible (HTTP ${response.status}).`);
    if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new Error('Réponse du catalogue illisible.');
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Réponse du catalogue invalide.');
    const result = data as Envelope;
    if (result.ok !== true) throw new Error(typeof result.error === 'string' ? result.error : 'Erreur du catalogue.');
    return result;
  } catch (e) { if (timedOut) throw new Error('Le catalogue met trop de temps à répondre. Réessayez.'); throw e; }
  finally {clearTimeout(timer); signal?.removeEventListener('abort', cancel);}
}
export async function getList(action: 'random' | 'search', params: Record<string, string | number>, signal?: AbortSignal) {
  const data = await cinemaRequest(action, params, signal);
  if (!Array.isArray(data.results)) throw new Error('Liste de résultats invalide.');
  return {results: data.results.filter(media), received: data.results.length, total: typeof data.total === 'number' ? data.total : undefined};
}
export async function getMedia(uid: string, signal?: AbortSignal): Promise<Media> {
  const data = await cinemaRequest('get', {id:uid}, signal);
  if (!media(data.result)) throw new Error('Fiche indisponible.');
  return data.result;
}
