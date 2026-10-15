import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class TmdbService {
  async get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
    const token = process.env.TMDB_READ_ACCESS_TOKEN;
    if (!token || token.startsWith('YOUR_')) {
      throw new ServiceUnavailableException('TMDB_READ_ACCESS_TOKEN non configurato');
    }
    // Endpoint definiti lato server, nessun URL remoto arbitrario accettato.
    if (!/^\/(?:trending|discover|genre|movie|tv)\//.test(path)) {
      throw new Error('Endpoint TMDB non previsto');
    }
    const url = new URL(`https://api.themoviedb.org/3${path}`);
    url.searchParams.set('language', 'it-IT');
    url.searchParams.set('include_adult', 'false');
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (response.ok) return (await response.json()) as T;
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        const seconds = Number(response.headers.get('retry-after'));
        const delay = response.status === 429 && Number.isFinite(seconds) && seconds > 0
          ? Math.min(30000, seconds * 1000) : (2 ** attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new Error(`TMDB ${path}: HTTP ${response.status}`);
    }
    throw new Error('TMDB: tentativi esauriti');
  }
}

export type TmdbList = { results: TmdbEntry[] };
export type TmdbEntry = {
  id: number; title?: string; name?: string; original_title?: string; original_name?: string;
  overview?: string; release_date?: string; first_air_date?: string;
  vote_average?: number; vote_count?: number; popularity?: number;
  poster_path?: string | null; backdrop_path?: string | null;
  original_language?: string; genre_ids?: number[]; genres?: Array<{id:number; name:string}>;
};
export type TmdbSeason = { id?: number; season_number: number; name: string; overview?: string;
  air_date?: string; poster_path?: string; episodes?: Array<{ episode_number: number; name: string;
    overview?: string; air_date?: string; still_path?: string; runtime?: number }> };
