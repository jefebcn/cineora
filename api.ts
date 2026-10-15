export type Genre = { id: number; name: string };
export type Episode = { id: string; episodeNumber: number; name: string; overview: string;
  airDate?: string | null; stillPath?: string | null; duration?: number | null };
export type Season = { id: string; seasonNumber: number; name: string; overview: string;
  episodes: Episode[] };
export type Title = {
  id: string; name: string; originalName?: string | null; type: 'movie' | 'tv';
  overview: string; releaseDate?: string | null; voteAverage: number; voteCount: number;
  popularity: number; posterPath?: string | null; backdropPath?: string | null;
  genres: Array<{ genre: Genre }>; trendRank?: number | null;
};
export type Home = { featured: Title | null; trending: Title[]; recent: Title[];
  top10: Title[]; movies: Title[]; tv: Title[]; observed: Title[] };
export type Catalog = { items: Title[]; total: number; page: number; limit: number; pages: number };
const emptyHome: Home = { featured: null, trending: [], recent: [], top10: [], movies: [], tv: [], observed: [] };

async function query<T>(route: string, fallback: T): Promise<T> {
  const base = process.env.API_URL || 'http://localhost:4000';
  try {
    const response = await fetch(`${base}${route}`, { next: { revalidate: 120 }, signal: AbortSignal.timeout(6000) });
    if (!response.ok) return fallback;
    return await response.json() as T;
  } catch { return fallback; }
}
export const getHome = () => query<Home>('/api/home', emptyHome);
export const getGenres = () => query<Genre[]>('/api/genres', []);
export const getCatalog = (p: Record<string, string | undefined>) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) qs.set(k, v);
  return query<Catalog>(`/api/titles?${qs.toString()}`, { items: [], total: 0, pages: 0, page: 1, limit: 20 });
};
export const searchTitles = (q: string) => query<{items: Title[]; query: string}>(`/api/search?q=${encodeURIComponent(q)}`, { items: [], query: q });
export const getTitle = (id: string) => query<Title | null>(`/api/titles/${encodeURIComponent(id)}`, null);
export const getSeasons = (id: string) => query<Season[]>(`/api/tv/${encodeURIComponent(id)}/seasons`, []);
export function tmdbImage(path?: string | null, size: 'w500' | 'original' | 'w780' = 'w500') {
  return path && /^\/[\w-]+\.(?:jpg|jpeg|png|webp)$/.test(path)
    ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;
}
export function year(date?: string | null) { return date ? date.slice(0, 4) : '—'; }
