import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

function globallyRoutable(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b, c] = ip.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || (b === 0 && c === 2))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113));
  }
  if (isIP(ip) === 6) {
    return /^2[0-9a-f]{3}:/i.test(ip) && !/^2001:db8:/i.test(ip);
  }
  return false;
}

export async function allowedUpstreamUrl(raw: string): Promise<URL | null> {
  try {
    const url = new URL(raw);
    if (!potentialUpstreamUrl(raw)) return null;
    const origins = (process.env.FEED_UPSTREAM_ORIGINS ?? '').split(',')
      .map((part) => part.trim()).filter(Boolean);
    if (!origins.includes(url.origin)) return null;
    if (url.hostname === 'localhost' || url.hostname.endsWith('.local')) return null;
    const addresses = isIP(url.hostname)
      ? [{ address: url.hostname }]
      : await lookup(url.hostname, { all: true });
    if (!addresses.length || addresses.some(({ address }) => !globallyRoutable(address))) return null;
    return url;
  } catch {
    return null;
  }
}

export function potentialUpstreamUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return false;
    if (url.hostname === 'localhost' || url.hostname.endsWith('.local') ||
        url.hostname.endsWith('.internal')) return false;
    if (isIP(url.hostname) && !globallyRoutable(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function fetchAllowedUpstream(raw: string, authorization?: string): Promise<Response | null> {
  const url = await allowedUpstreamUrl(raw);
  if (!url) return null;
  if (authorization && url.protocol !== 'https:') return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(url, {
      headers: authorization ? { Authorization: authorization, Accept: '*/*' } : { Accept: '*/*' },
      redirect: 'manual',
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
