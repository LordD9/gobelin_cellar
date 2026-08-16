import type { SearchSource } from '../types/scan';
import type { WineIdentification } from '../types/scan';

const USER_AGENT = 'GoblinCellar/1.0 (self-hosted wine cellar; https://github.com/LordD9/gobelin_cellar)';
const FETCH_MS = 10_000;

export async function searchWineSources(
  identification: WineIdentification,
  searxngUrl: string | null,
): Promise<SearchSource[]> {
  const queries = buildQueries(identification);
  const buckets = await Promise.all([
    searxngUrl ? searchSearxng(searxngUrl, queries[0]).catch(() => []) : Promise.resolve([]),
    searchWikipedia(queries[0], 'fr').catch(() => []),
    searchWikipedia(queries[0], 'en').catch(() => []),
    searchDuckDuckGo(queries[0]).catch(() => []),
    queries[1] ? searchDuckDuckGo(queries[1]).catch(() => []) : Promise.resolve([]),
  ]);

  return dedupeSources(buckets.flat()).slice(0, 8);
}

export function buildQueries(identification: WineIdentification): string[] {
  const core = [identification.domaine, identification.cuvee, identification.appellation, identification.millesime]
    .filter((part) => part != null && String(part).trim() !== '')
    .join(' ')
    .trim();
  const fallback = identification.raw_text.split('\n').map((line) => line.trim()).find(Boolean) ?? '';
  const seed = core || fallback;
  if (!seed) return ['vin étiquette domaine'];

  const primary = `${seed} vin`;
  const secondary = [identification.domaine, identification.cuvee, identification.appellation, 'cépages', 'accords mets']
    .filter((part) => part != null && String(part).trim() !== '')
    .join(' ');
  return secondary && secondary !== primary ? [primary, secondary] : [primary];
}

async function searchWikipedia(query: string, lang: 'fr' | 'en'): Promise<SearchSource[]> {
  const searchUrl = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  searchUrl.searchParams.set('action', 'query');
  searchUrl.searchParams.set('list', 'search');
  searchUrl.searchParams.set('srsearch', query);
  searchUrl.searchParams.set('srlimit', '3');
  searchUrl.searchParams.set('utf8', '1');
  searchUrl.searchParams.set('format', 'json');

  const search = await fetchJson<{
    query?: { search?: Array<{ title: string; snippet: string; pageid: number }> };
  }>(searchUrl);

  const hits = search.query?.search ?? [];
  if (hits.length === 0) return [];

  const titles = hits.map((hit) => hit.title).join('|');
  const extractUrl = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  extractUrl.searchParams.set('action', 'query');
  extractUrl.searchParams.set('prop', 'extracts|info');
  extractUrl.searchParams.set('exintro', '1');
  extractUrl.searchParams.set('explaintext', '1');
  extractUrl.searchParams.set('inprop', 'url');
  extractUrl.searchParams.set('titles', titles);
  extractUrl.searchParams.set('format', 'json');
  extractUrl.searchParams.set('redirects', '1');

  const extracts = await fetchJson<{
    query?: {
      pages?: Record<string, { title?: string; extract?: string; fullurl?: string }>;
    };
  }>(extractUrl);

  return Object.values(extracts.query?.pages ?? {})
    .filter((page) => page.extract && page.fullurl)
    .map((page) => ({
      title: page.title ?? 'Wikipedia',
      url: page.fullurl ?? '',
      snippet: collapseWhitespace(page.extract ?? '').slice(0, 500),
    }));
}

async function searchDuckDuckGo(query: string): Promise<SearchSource[]> {
  const body = new URLSearchParams({ q: query, kl: 'fr-fr' });
  const response = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html',
      'User-Agent': USER_AGENT,
    },
    body,
    signal: AbortSignal.timeout(FETCH_MS),
    redirect: 'follow',
  });
  if (!response.ok) return [];
  const html = await response.text();
  return parseDuckDuckGo(html).slice(0, 5);
}

function parseDuckDuckGo(html: string): SearchSource[] {
  const results: SearchSource[] = [];
  const blockRe =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/)/gi;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(html)) !== null) {
    const url = decodeDuckDuckGoUrl(decodeHtml(match[1]));
    const title = collapseWhitespace(stripTags(match[2]));
    const snippet = collapseWhitespace(stripTags(match[3] ?? ''));
    if (url && title) {
      results.push({ title, url, snippet });
    }
  }
  return results;
}

function decodeDuckDuckGoUrl(href: string): string {
  try {
    const absolute = href.startsWith('//') ? `https:${href}` : href;
    const parsed = new URL(absolute);
    const uddg = parsed.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : parsed.toString();
  } catch {
    return href;
  }
}

async function searchSearxng(baseUrl: string, query: string): Promise<SearchSource[]> {
  const url = new URL(baseUrl.includes('/search') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('language', 'fr-FR');

  const data = await fetchJson<{
    results?: Array<{ title?: string; url?: string; content?: string }>;
  }>(url);

  return (data.results ?? [])
    .filter((item) => item.title && item.url)
    .slice(0, 6)
    .map((item) => ({
      title: item.title ?? '',
      url: item.url ?? '',
      snippet: collapseWhitespace(item.content ?? '').slice(0, 400),
    }));
}

async function fetchJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(FETCH_MS),
  });
  if (!response.ok) {
    throw new Error(`Recherche web ${response.status}`);
  }
  return (await response.json()) as T;
}

function dedupeSources(sources: SearchSource[]): SearchSource[] {
  const seen = new Set<string>();
  const unique: SearchSource[] = [];
  for (const source of sources) {
    const key = normalizeKey(source.url) || source.title.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(source);
  }
  return unique;
}

function normalizeKey(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.toLowerCase().replace(/\/$/, '');
  } catch {
    return url.toLowerCase();
  }
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, ' ');
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
