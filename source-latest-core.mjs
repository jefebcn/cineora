/** Estrae soltanto URL di schede /it/titles/ dalle ancore HTML pubbliche. */
export const HOST = 'streamingcommunityz.shiksha';
export const LATEST_URLS = {
  movie: `https://${HOST}/it/browse/latest?type=movie`,
  tv: `https://${HOST}/it/browse/latest?type=tv`,
};
const escapePattern = /&(?:amp|quot|apos|#39|lt|gt);/g;
const entities = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>' };
export function decodeText(text) { return String(text ?? '').replace(escapePattern, v => entities[v] || v).replace(/<[^>]+>/g, ' ').replace(/\s+/g,' ').trim(); }
export function titleFromSlug(slug) {
  return decodeText(slug.replace(/^\d+-/, '').replace(/-/g, ' '));
}
export function canonicalTitleUrl(raw) {
  try {
    const url = new URL(raw, `https://${HOST}/`);
    if (url.hostname !== HOST || !/^\/it\/titles\/\d+-[\p{L}\p{N}_-]+\/?$/u.test(url.pathname)) return null;
    return `https://${HOST}${url.pathname.replace(/\/$/, '')}`;
  } catch { return null; }
}
/** L'ordine e' quello dell'HTML; non si deduce dalla data della prima uscita. */
export function extractTitleAnchors(html, type, { limit=100 }={}) {
  if (!['movie','tv'].includes(type)) throw new Error('Tipo non valido');
  if (!Number.isInteger(limit) || limit<1 || limit>500) throw new Error('Limit 1..500');
  const items=[]; const seen=new Set();
  const re=/<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const m of String(html).matchAll(re)) {
    const attrs = m[1];
    const hrefMatch = attrs.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
    if (!hrefMatch) continue;
    const sourceUrl=canonicalTitleUrl(decodeText(hrefMatch[2]));
    if (!sourceUrl || seen.has(sourceUrl)) continue;
    const label=attrs.match(/\b(?:aria-label|title)\s*=\s*(["'])(.*?)\1/i)?.[2]
      || m[2].match(/<img\b[^>]*\balt\s*=\s*(["'])(.*?)\1/i)?.[2]
      || m[2].match(/<h[1-6]\b[^>]*>(.*?)<\/h[1-6]>/is)?.[1] || '';
    const title=decodeText(label) || titleFromSlug(sourceUrl.split('/').at(-1));
    if (!title) continue;
    seen.add(sourceUrl); items.push({title,type,sourceUrl});
    if (items.length>=limit) break;
  }
  return items;
}

/** Valuta le regole User-agent:* di robots.txt; in dubbio rifiuta la scansione. */
export function robotsAllows(robots, targetPath) {
  let inGeneral=false; const denied=[];
  for (const raw of String(robots||'').split(/\r?\n/)) {
    const line=raw.split('#')[0].trim();
    if (!line) continue;
    const sep=line.indexOf(':');if(sep<0)continue;
    const key=line.slice(0,sep).trim().toLowerCase(), val=line.slice(sep+1).trim();
    if(key==='user-agent') { inGeneral=val==='*';continue; }
    if(inGeneral && key==='disallow' && val)denied.push(val.split('*')[0]);
  }
  return !denied.some(path => path && targetPath.startsWith(path));
}
