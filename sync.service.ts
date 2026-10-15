import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { parseTmdbDate, slugifyTitle } from './normalize';
import { TmdbEntry, TmdbList, TmdbSeason, TmdbService } from './tmdb.service';

type JobKind = 'trending' | 'discover' | 'seasons' | 'refresh' | 'new-releases' | 'source-latest';

@Injectable()
export class SyncService {
  private readonly log = new Logger(SyncService.name);
  constructor(private readonly db: PrismaService, private readonly tmdb: TmdbService) {}

  async run(kind: JobKind): Promise<number> {
    const run = await this.db.syncRun.create({ data: { kind, status: 'running' } });
    let count = 0;
    let failures = 0;
    try {
      if (kind === 'source-latest') {
        count = await this.importObservedSourceFeed();
      } else if (kind === 'new-releases') {
        count = await this.importNewReleases();
      } else if (kind === 'seasons') {
        count = await this.importSeasons();
      } else if (kind === 'refresh') {
        const refreshed = await this.refreshExistingTitles();
        count = refreshed.processed;
        failures = refreshed.failures;
      } else {
        await this.importGenres();
        for (const type of ['movie', 'tv'] as const) {
          const items: TmdbEntry[] = [];
          const pageCount = kind === 'trending' ? 2 : Math.min(10, Math.max(1, Number(process.env.TMDB_DISCOVER_PAGES) || 5));
          for (let page = 1; page <= pageCount; page++) {
            const route = kind === 'trending' ? `/trending/${type}/week` : `/discover/${type}`;
            const data = await this.tmdb.get<TmdbList>(route, { page, ...(kind === 'discover' ? { sort_by: 'popularity.desc' } : {}) });
            items.push(...data.results);
          }
          // L'ordine deriva dalla risposta TMDB, non da una classifica inventata.
          // ID duplicati tra pagine vengono ignorati, preservando il primo ordine.
          const seen = new Set<number>();
          const uniqueItems = items.filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
          for (const [index, item] of uniqueItems.entries()) {
            const imported = await this.importTitle(type, item, kind === 'trending' ? index + 1 : undefined);
            if (imported) count++;
          }
          // Una classifica precedente rimane visibile fino al completamento dell'import.
          if (kind === 'trending') {
            const visibleIds = uniqueItems.map((item) => item.id).filter((id) => Number.isSafeInteger(id) && id > 0);
            if (!visibleIds.length) throw new Error(`Classifica ${type} vuota: classifica precedente preservata`);
            await this.db.title.updateMany({ where: { type, tmdbId: { notIn: visibleIds } }, data: { trendRank: null } });
          }
        }
      }
      // Nessuna cancellazione automatica durante la discovery: un titolo
      // non presente nelle prime pagine TMDB non e' necessariamente obsoleto.
      await this.db.syncRun.update({ where: { id: run.id }, data: { status: failures ? 'partial' : 'success', processed: count, error: failures ? `${failures} titoli non aggiornati: vedi log worker` : null, finishedAt: new Date() } });
      return count;
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      this.log.error(`${kind}: ${error}`);
      await this.db.syncRun.update({ where: { id: run.id }, data: { status: 'failed', processed: count, error: error.slice(0, 2500), finishedAt: new Date() } });
      throw e;
    }
  }

  private async importGenres() {
    for (const type of ['movie', 'tv'] as const) {
      const data = await this.tmdb.get<{ genres: { id: number; name: string }[] }>(`/genre/${type}/list`);
      for (const g of data.genres) {
        await this.db.genre.upsert({ where: { id: g.id }, create: g, update: { name: g.name } });
      }
    }
  }

  private async importTitle(type: 'movie' | 'tv', item: TmdbEntry, trendRank?: number): Promise<boolean> {
    if (!Number.isSafeInteger(item.id) || item.id <= 0) return false;
    const name = (item.title || item.name || '').trim();
    if (!name) return false;
    const data = {
      slug: slugifyTitle(name, type, item.id), name,
      originalName: item.original_title || item.original_name || null,
      overview: item.overview || '',
      releaseDate: parseTmdbDate(item.release_date || item.first_air_date),
      voteAverage: item.vote_average ?? 0, voteCount: item.vote_count ?? 0,
      popularity: item.popularity ?? 0,
      posterPath: item.poster_path || null, backdropPath: item.backdrop_path || null,
      language: item.original_language || null,
      ...(trendRank !== undefined ? { trendRank } : {}),
    };
    const title = await this.db.title.upsert({
      where: { type_tmdbId: { type, tmdbId: item.id } },
      create: { ...data, type, tmdbId: item.id },
      update: data,
    });
    const ids = item.genre_ids ?? item.genres?.map((g) => g.id);
    if (ids) {
      const knownGenres = await this.db.genre.findMany({ where: { id: { in: ids } }, select: { id: true } });
      // Un aggiornamento parziale non deve eliminare i generi se una chiamata fallisce.
      await this.db.$transaction([
        this.db.titleGenre.deleteMany({ where: { titleId: title.id } }),
        ...(knownGenres.length ? [this.db.titleGenre.createMany({ data: knownGenres.map((g) => ({ titleId: title.id, genreId: g.id })), skipDuplicates: true })] : []),
      ]);
    }
    return true;
  }

  private async refreshExistingTitles(): Promise<{processed:number;failures:number}> {
    // Una scansione a rotazione aggiorna anche i titoli che non sono più in tendenza.
    const batchSize = Math.min(200, Math.max(1, Number(process.env.TMDB_REFRESH_BATCH) || 100));
    const oldest = await this.db.title.findMany({ orderBy: { updatedAt: 'asc' }, take: batchSize,
      select: { id: true, type: true, tmdbId: true } });
    let processed = 0;
    let failures = 0;
    for (const title of oldest) {
      try {
        const detail = await this.tmdb.get<TmdbEntry>(`/${title.type}/${title.tmdbId}`);
        await this.importTitle(title.type as 'movie' | 'tv', detail);
        processed++;
      } catch (e) {
        failures++;
        this.log.warn(`Aggiornamento ${title.type}/${title.tmdbId} fallito: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (failures && !processed) throw new Error(`Aggiornamento fallito per ${failures} titoli`);
    if (failures) this.log.warn(`Aggiornamento parziale: ${processed} riusciti, ${failures} falliti`);
    return { processed, failures };
  }

  private async importNewReleases(): Promise<number> {
    // L'ordinamento per data di uscita NON equivale alla data di aggiunta su un sito terzo.
    await this.importGenres();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const start = new Date(now.getTime() - 120 * 86400000).toISOString().slice(0, 10);
    const pageCount = Math.min(10, Math.max(1, Number(process.env.TMDB_NEW_RELEASE_PAGES) || 3));
    let count = 0;
    for (const type of ['movie', 'tv'] as const) {
      const seen = new Set<number>();
      const prefix = type === 'movie' ? 'primary_release_date' : 'first_air_date';
      for (let page = 1; page <= pageCount; page++) {
        const list = await this.tmdb.get<TmdbList>(`/discover/${type}`, {
          page, sort_by: `${prefix}.desc`,
          [`${prefix}.gte`]: start, [`${prefix}.lte`]: today,
          ...(type === 'movie' ? { 'with_release_type': '2|3' } : {}),
        });
        for (const item of list.results || []) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          if (await this.importTitle(type, item)) count++;
        }
      }
    }
    return count;
  }

  private async importObservedSourceFeed(): Promise<number> {
    // Il feed contiene SOLO ID TMDB ricontrollati e URL pubblici verificati.
    // Non vengono importati player, video, cookie o token del sito originale.
    const file = resolve(process.cwd(), process.env.CINEORA_SOURCE_FEED || '../../data/source-latest-enriched.json');
    const json = JSON.parse(await readFile(file, 'utf8')) as {
      source?: string; sourceDatasetType?: string;
      items?: Array<{type: string; tmdbId: number; sourceUrl: string; matchStatus: string; sourceObservedAt?: string}>;
    };
    if (json.source !== 'streamingcommunityz.shiksha' || !['latest-page-observed', 'verified-present-not-verified-latest'].includes(json.sourceDatasetType || '')) {
      throw new Error('Feed sorgente non riconosciuto');
    }
    let count=0;
    await this.importGenres();
    for (const item of (json.items || []).slice(0, 200)) {
      if (!['movie','tv'].includes(item.type) || item.matchStatus !== 'accepted' || !Number.isSafeInteger(item.tmdbId) || item.tmdbId < 1) continue;
      if (!/^https:\/\/streamingcommunityz\.shiksha\/it\/titles\/\d+-[\p{L}\p{N}_-]+$/u.test(item.sourceUrl)) continue;
      const type = item.type as 'movie' | 'tv';
      const detail = await this.tmdb.get<TmdbEntry>(`/${type}/${item.tmdbId}`);
      if (detail.id !== item.tmdbId || !await this.importTitle(type, detail)) continue;
      const title = await this.db.title.findUniqueOrThrow({where:{type_tmdbId:{type,tmdbId:item.tmdbId}}});
      const observedAt = item.sourceObservedAt ? new Date(item.sourceObservedAt) : new Date();
      if (!Number.isFinite(observedAt.getTime())) continue;
      await this.db.sourceObservation.upsert({
        where: {sourceUrl:item.sourceUrl},
        create: {source:json.source,sourceUrl:item.sourceUrl,titleId:title.id,type,datasetType:json.sourceDatasetType!,observedAt},
        update: {titleId:title.id,type,datasetType:json.sourceDatasetType!,observedAt},
      });
      count++;
    }
    return count;
  }

  private async importSeasons(): Promise<number> {
    // Limite intenzionale per l'MVP: solo le prime 6 serie in tendenza,
    // fino a 6 stagioni per serie. Estendibile con una coda per singola serie.
    const shows = await this.db.title.findMany({ where: { type: 'tv' }, orderBy: { popularity: 'desc' }, take: 6 });
    let processed = 0;
    for (const show of shows) {
      const detail = await this.tmdb.get<{ seasons: TmdbSeason[] }>(`/tv/${show.tmdbId}`);
      const seasons = (detail.seasons || []).filter((s) => s.season_number > 0).slice(-6);
      for (const seasonInfo of seasons) {
        const data = await this.tmdb.get<TmdbSeason>(`/tv/${show.tmdbId}/season/${seasonInfo.season_number}`);
        const season = await this.db.season.upsert({
          where: { titleId_seasonNumber: { titleId: show.id, seasonNumber: data.season_number } },
          create: { titleId: show.id, seasonNumber: data.season_number, tmdbId: data.id, name: data.name,
            overview: data.overview || '', airDate: parseTmdbDate(data.air_date), posterPath: data.poster_path || null },
          update: { tmdbId: data.id, name: data.name, overview: data.overview || '',
            airDate: parseTmdbDate(data.air_date), posterPath: data.poster_path || null },
        });
        for (const episode of data.episodes || []) {
          await this.db.episode.upsert({
            where: { seasonId_episodeNumber: { seasonId: season.id, episodeNumber: episode.episode_number } },
            create: { seasonId: season.id, episodeNumber: episode.episode_number, name: episode.name,
              overview: episode.overview || '', airDate: parseTmdbDate(episode.air_date),
              stillPath: episode.still_path || null, duration: episode.runtime || null },
            update: { name: episode.name, overview: episode.overview || '', airDate: parseTmdbDate(episode.air_date),
              stillPath: episode.still_path || null, duration: episode.runtime || null },
          });
          processed++;
        }
      }
    }
    return processed;
  }
}
