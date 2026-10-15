export function slugifyTitle(name: string, type: 'movie' | 'tv', tmdbId: number): string {
  const base = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'titolo';
  return `${base.slice(0, 100)}-${type}-${tmdbId}`;
}

export function parseTmdbDate(input?: string | null): Date | null {
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const date = new Date(`${input}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input ? null : date;
}

export function readPage(input: unknown): number {
  const page = Number(input);
  return Number.isInteger(page) ? Math.max(1, Math.min(500, page)) : 1;
}
export function readLimit(input: unknown): number {
  const limit = Number(input);
  return Number.isInteger(limit) ? Math.max(1, Math.min(48, limit)) : 20;
}
