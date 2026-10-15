import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { readLimit, readPage } from './normalize';

@Injectable()
export class CatalogService {
  constructor(private readonly db: PrismaService) {}
  private readonly titleInclude = { genres: { include: { genre: true } } } as const;

  async home() {
    const [trending, recent, top10, movies, tv, observedRows] = await Promise.all([
      this.db.title.findMany({ where: { trendRank: { not: null } }, orderBy: { trendRank: 'asc' }, take: 18, include: this.titleInclude }),
      this.db.title.findMany({ orderBy: { createdAt: 'desc' }, take: 18, include: this.titleInclude }),
      this.db.title.findMany({ orderBy: [{ voteCount: 'desc' }, { voteAverage: 'desc' }], take: 10, include: this.titleInclude }),
      this.db.title.findMany({ where: { type: 'movie' }, orderBy: { popularity: 'desc' }, take: 18, include: this.titleInclude }),
      this.db.title.findMany({ where: { type: 'tv' }, orderBy: { popularity: 'desc' }, take: 18, include: this.titleInclude }),
      this.db.sourceObservation.findMany({ orderBy: { observedAt: 'desc' }, take: 18, include: { title: { include: this.titleInclude } } }),
    ]);
    return { featured: trending.find((t) => t.backdropPath) ?? movies[0] ?? tv[0] ?? null, trending, recent, top10, movies, tv, observed: observedRows.map((row) => row.title) };
  }

  async titles(q: Record<string, unknown>) {
    const page = readPage(q.page); const limit = readLimit(q.limit);
    const type = q.type === 'movie' || q.type === 'tv' ? q.type : undefined;
    const genre = Number(q.genre);
    const year = Number(q.year);
    const sort = q.sort === 'rating' ? [{ voteAverage: 'desc' as const }, { voteCount: 'desc' as const }] :
      q.sort === 'recent' ? [{ releaseDate: 'desc' as const }] :
      q.sort === 'added' ? [{ createdAt: 'desc' as const }] : [{ popularity: 'desc' as const }];
    const where = {
      ...(type ? { type } : {}),
      ...(Number.isInteger(genre) && genre > 0 ? { genres: { some: { genreId: genre } } } : {}),
      ...(Number.isInteger(year) && year >= 1900 && year <= 2100 ? { releaseDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.title.findMany({ where, orderBy: sort, skip: (page - 1) * limit, take: limit, include: this.titleInclude }),
      this.db.title.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async search(q: Record<string, unknown>) {
    const term = typeof q.q === 'string' ? q.q.trim().slice(0, 100) : '';
    if (term.length < 2) return { items: [], query: term };
    const type = q.type === 'movie' || q.type === 'tv' ? q.type : undefined;
    const items = await this.db.title.findMany({
      where: { ...(type ? { type } : {}), name: { contains: term, mode: 'insensitive' } },
      orderBy: { popularity: 'desc' }, take: 40, include: this.titleInclude,
    });
    return { query: term, items };
  }

  genres() { return this.db.genre.findMany({ orderBy: { name: 'asc' } }); }
  async title(id: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new NotFoundException('Titolo non trovato');
    const title = await this.db.title.findUnique({ where: { id }, include: this.titleInclude });
    if (!title) throw new NotFoundException('Titolo non trovato');
    return title;
  }
  async seasons(id: string) {
    await this.title(id);
    return this.db.season.findMany({ where: { titleId: id }, orderBy: { seasonNumber: 'asc' },
      include: { episodes: { orderBy: { episodeNumber: 'asc' } } } });
  }
  syncHistory() { return this.db.syncRun.findMany({ orderBy: { startedAt: 'desc' }, take: 20 }); }
  async health() {
    await this.db.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'connected' };
  }
}
