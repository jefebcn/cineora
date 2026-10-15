import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLatestListing } from './browser-source-core.mjs';

// Si esegue con Playwright (la dipendenza del progetto) e Chromium reale,
// ma NON accede al dominio terzo e NON richiede segreti.
const { chromium } = await import('playwright');
const options = {headless:true, ...(process.env.CHROMIUM_BIN ? { executablePath:process.env.CHROMIUM_BIN } : {})};
let browser;
try {browser=await chromium.launch(options);}catch(e){throw Error(`Chromium non disponibile per test browser: ${e.message}`);}

function fixture({heading=true, cards=true}={}){
  return `<!doctype html><html lang="it"><body>
    <header><a href="/it/titles/999-estraneo">Non deve essere letto</a></header>
    <main>
      ${heading ? '<h1>Film &gt; Aggiunti di recente</h1>' : '<h1>Archivio</h1>'}
      <div id="results"></div>
      <nav><a href="/it/titles/998-widget">Escludere widget di navigazione</a></nav>
    </main>
    <script>
      setTimeout(() => {
        ${cards ? `document.querySelector('#results').innerHTML =
          '<a href="/it/titles/100-la-citta"><img alt="La Città"></a>'+ 
          '<a href="/it/titles/101-il-film">Il film</a>'+ 
          '<a href="/it/titles/100-la-citta">Duplicato</a>'+ 
          '<a href="https://stranger.example/it/titles/102-spoof">Esterna</a>';` : ''}
      }, 100);
    </script></body></html>`;
}

test('Chromium: intercetta card renderizzate da JavaScript, deduplica, scarta link fuori regione', async () => {
  const page=await browser.newPage();
  try{
    await page.setContent(fixture());
    const items=await readLatestListing(page,'movie',{maxScrolls:0,waitMs:2000});
    assert.deepEqual(items.map(x=>x.title),['La Città','il film']);
    assert.deepEqual(items.map(x=>x.sourceUrl),[
      'https://streamingcommunityz.shiksha/it/titles/100-la-citta',
      'https://streamingcommunityz.shiksha/it/titles/101-il-film'
    ]);
  }finally{await page.close();}
});
test('Chromium: non chiama latest una pagina con intestazione diversa',async()=>{
  const page=await browser.newPage();
  try{await page.setContent(fixture({heading:false}));
    await assert.rejects(readLatestListing(page,'movie',{maxScrolls:0,waitMs:400}),/Titolo sezione/);
  }finally{await page.close();}
});
test('Chromium: non inventa titoli per una lista senza card',async()=>{
  const page=await browser.newPage();
  try{await page.setContent(fixture({cards:false}));
    await assert.rejects(readLatestListing(page,'tv',{maxScrolls:0,waitMs:350}),/Nessuna card/);
  }finally{await page.close();}
});

test('chiusura browser', async()=>{await browser.close();});
