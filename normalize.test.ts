import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTmdbDate, readLimit, readPage, slugifyTitle } from '../src/catalog/normalize';

test('slug univoco per ID e tipo', () => {
  assert.equal(slugifyTitle('L’Ultimo Viaggio', 'movie', 123), 'l-ultimo-viaggio-movie-123');
  assert.notEqual(slugifyTitle('La serie', 'tv', 123), slugifyTitle('La serie', 'movie', 123));
});
test('date non valide non vengono importate', () => {
  assert.equal(parseTmdbDate('2026-02-29'), null);
  assert.equal(parseTmdbDate('n/a'), null);
  assert.equal(parseTmdbDate('2024-02-29')?.toISOString().slice(0, 10), '2024-02-29');
});
test('paginazione limitata a valori sicuri', () => {
  assert.equal(readPage('-20'), 1);
  assert.equal(readPage('900'), 500);
  assert.equal(readLimit('100000'), 48);
});
