import {test} from 'node:test';import assert from 'node:assert/strict';
import {extractTitleAnchors,canonicalTitleUrl,decodeText,titleFromSlug,robotsAllows} from './source-latest-core.mjs';
import {scoreMatch,selectMatch,normalizedTitle} from './match-tmdb-core.mjs';
test('parsing titoli pubblici e deduplica',()=>{
 const html=`<div><a href="/it/titles/55-lui"><img alt="Lui &amp; Lei"/></a><a href='/it/titles/55-lui'>duplicato</a><a href="/it/titles/56-altro">Altro</a><a href="https://bad.example/it/titles/50-bad">Bad</a></div>`;
 assert.deepEqual(extractTitleAnchors(html,'movie').map(x=>x.title),['Lui & Lei','altro']);
});
test('no false latest su html senza schede',()=>assert.equal(extractTitleAnchors('<h1>Aggiunti di recente</h1>','tv').length,0));
test('no URL esterni o video',()=>{assert.equal(canonicalTitleUrl('https://another.example/it/titles/22-aaa'),null);assert.equal(canonicalTitleUrl('/watch/999'),null);});
test('decodifica slug e HTML',()=>{assert.equal(titleFromSlug('12345-il-caso-uno'),'il caso uno');assert.equal(decodeText('Ciao &quot;mondo&quot;'),'Ciao "mondo"');});
test('match solo titoli esatti normalizzati',()=>{assert.equal(normalizedTitle('L’Ultima Città!'),'l ultima citta');assert.equal(scoreMatch({title:'La Città',year:2026},{name:'La città',first_air_date:'2026-10-01'}),100);assert.equal(scoreMatch({title:'La Città',year:2026},{name:'Altro',first_air_date:'2026-10-01'}),0);});
test('match ambiguo ignorato',()=>{const entry={id:2,name:'Elle'};assert.equal(selectMatch({title:'Elle'},[entry,{id:4,name:'Elle'}]),null);assert.equal(selectMatch({title:'Elle'},[entry])?.id,2);});

test('robots: blocco rispettato',()=>{assert.equal(robotsAllows('User-agent: *\nDisallow: /it/browse/','/it/browse/latest'),false);assert.equal(robotsAllows('User-agent: *\nDisallow: /admin','/it/browse/latest'),true);});
