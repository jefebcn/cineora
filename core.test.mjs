import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { slugifyTitle, parseTmdbDate, readPage, readLimit } from '../apps/api/src/catalog/normalize.ts';
import { tmdbImage, year, getCatalog } from '../apps/web/lib/api.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('slug: unicode, tipo e ID differenziano le entità', () => {
  assert.equal(slugifyTitle('L’Ultimo Viaggio', 'movie', 123), 'l-ultimo-viaggio-movie-123');
  assert.notEqual(slugifyTitle('Storia', 'tv', 4), slugifyTitle('Storia', 'movie', 4));
  assert.notEqual(slugifyTitle('Storia', 'tv', 4), slugifyTitle('Storia', 'tv', 5));
  assert.match(slugifyTitle('🌕🌖', 'tv', 12), /^titolo-tv-12$/);
});

test('date: valida anno bisestile e rifiuta dati TMDB malformati', () => {
  assert.equal(parseTmdbDate('2024-02-29')?.toISOString().slice(0, 10), '2024-02-29');
  assert.equal(parseTmdbDate('2026-02-29'), null);
  assert.equal(parseTmdbDate('2026-13-01'), null);
  assert.equal(parseTmdbDate('non data'), null);
  assert.equal(parseTmdbDate(null), null);
});

test('input API: pagine e limiti vengono controllati', () => {
  assert.equal(readPage('50000'), 500);
  assert.equal(readPage('-5'), 1);
  assert.equal(readPage('NaN'), 1);
  assert.equal(readPage('2.5'), 1);
  assert.equal(readLimit('1000'), 48);
  assert.equal(readLimit('0'), 1);
  assert.equal(readLimit('no'), 20);
});

test('poster: ammesse soltanto immagini ospitate sul dominio TMDB', () => {
  assert.equal(tmdbImage('/poster_a.jpg', 'w500'), 'https://image.tmdb.org/t/p/w500/poster_a.jpg');
  assert.equal(tmdbImage('https://evil.example/attack.jpg'), undefined);
  assert.equal(tmdbImage('/x.svg'), undefined);
  assert.equal(tmdbImage('//attacker.png'), undefined);
  assert.equal(year('2025-12-05'), '2025');
});

test('client HTTP: parametri filtri URL-encoded e struttura di risposta', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.API_URL;
  const captured = [];
  process.env.API_URL = 'http://localhost:4000';
  globalThis.fetch = async (url) => {
    captured.push(new URL(url));
    return new Response(JSON.stringify({items:[],total:0,pages:0,page:2,limit:20}), {status:200,headers:{'content-type':'application/json'}});
  };
  try {
    const data = await getCatalog({type:'movie',page:'2',genre:'28',sort:'recent'});
    assert.equal(data.page, 2);
    assert.equal(captured[0].pathname, '/api/titles');
    assert.equal(captured[0].searchParams.get('genre'), '28');
    assert.equal(captured[0].searchParams.get('sort'), 'recent');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnv === undefined) delete process.env.API_URL;
    else process.env.API_URL = originalEnv;
  }
});

test('sistema: schema, SQL e comandi worker includono sincronizzazione refresh', () => {
  const schema = read('apps/api/prisma/schema.prisma');
  const migration = read('apps/api/prisma/migrations/202610150001_init/migration.sql');
  assert.match(schema, /@@unique\(\[type, tmdbId\]\)/);
  assert.match(migration, /CREATE UNIQUE INDEX "titles_type_tmdb_id_key"/);
  assert.match(migration, /CREATE EXTENSION IF NOT EXISTS "pg_trgm"/);
  const worker = read('apps/api/src/catalog/processor.ts');
  const schedule = read('apps/api/src/catalog/scheduler.service.ts');
  const importer = read('apps/api/src/catalog/sync.service.ts');
  for (const file of [worker, schedule, importer]) assert.match(file, /refresh/);
  assert.match(importer, /refreshExistingTitles/);
  assert.match(importer, /TMDB_DISCOVER_PAGES/);
});

test('sicurezza: token TMDB non nel frontend e API admin con chiave', () => {
  assert.doesNotMatch(read('apps/web/lib/api.ts'), /TMDB_READ_ACCESS_TOKEN/);
  assert.match(read('apps/api/src/catalog/admin.controller.ts'), /timingSafeEqual/);
  assert.match(read('apps/api/src/catalog/tmdb.service.ts'), /Bearer/);
});
