import type {Media} from './cinema-api';

// Hôtes observés dans les fiches Frenchstream. Ne jamais accepter une URL arbitraire.
export function approvedPlayer(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || !['vidzy.org','uqload.vc'].includes(u.hostname.toLowerCase()) || !/^\/embed-[a-z0-9]+\.html$/i.test(u.pathname)) return null;
    return u.href;
  } catch { return null; }
}
export function frenchstreamPlayers(item: Media): {primary:string | null; fallback:string | null} {
  if (item.source !== 'frenchstream' || item.section !== 'streaming') return {primary:null,fallback:null};
  return {primary:approvedPlayer(item.embed_url || item.stream_url), fallback:approvedPlayer(item.embed_fallback)};
}
