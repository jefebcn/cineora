/**
 * Sola lettura: raccoglie metadati/URL di schede pubbliche dalla pagina 'Aggiunti di recente'.
 * Richiede Playwright e Chromium installati sul server; non tenta aggiramenti di blocchi.
 * Se il sito non mostra schede pubbliche, FALLISCE senza inventare titoli.
 * Prima dell'uso verificare robots.txt, termini e autorizzazioni applicabili.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { LATEST_URLS, robotsAllows } from './source-latest-core.mjs';
import { readLatestListing } from './browser-source-core.mjs';
const out = process.argv[2] || 'data/reference-latest-candidates.json';
async function collect() {
  const { chromium } = await import('playwright').catch(() => { throw new Error('Playwright non installato. Installa sul server: npm install --save-dev playwright && npx playwright install chromium'); });
  // Rispetta robots.txt se presente; in caso di verifica impossibile non procede.
  const robotsResponse = await fetch('https://streamingcommunityz.shiksha/robots.txt',{signal:AbortSignal.timeout(12000)});
  if (robotsResponse.status !== 404 && !robotsResponse.ok) throw new Error(`robots.txt non verificabile (HTTP ${robotsResponse.status})`);
  if (robotsResponse.ok) {
    const robots = await robotsResponse.text();
    if (!robotsAllows(robots,'/it/browse/latest')) throw new Error('La scansione e vietata da robots.txt');
  }
  const browser = await chromium.launch({headless: true});
  try {
    const result=[];
    for (const [type,url] of Object.entries(LATEST_URLS)) {
      const page = await browser.newPage({viewport:{width:1440,height:900}});
      try {
        const response = await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
        if (!response || response.status()>=400) throw new Error(`HTTP ${response?.status() ?? '?'} per ${url}`);
        // Solo schede dentro la regione principale, dopo verifica del titolo della sezione.
        // Se il sito cambia markup, fallire e richiedere una nuova verifica manuale.
        const items = await readLatestListing(page, type);
        if(!items.length) throw new Error(`Nessuna scheda trovata nella pagina ${url}; non considero verificata la lista`);
        result.push(...items);
        console.log(`${type}: ${items.length} schede pubbliche`);
      }finally {await page.close();}
    }
    const feed={source:'streamingcommunityz.shiksha', observedAt:new Date().toISOString(), datasetType:'latest-page-observed', evidence:'DOM-main-with-latest-heading', note:'Card presenti nella pagina latest; ordinamento e completezza non verificati', items:result};
    await mkdir(new URL('../data/',import.meta.url),{recursive:true});
    await writeFile(out,JSON.stringify(feed,null,2)+'\n');
    console.log(`Creato ${out}: ${result.length} titoli da verificare/arricchire`);
  }finally {await browser.close();}
}
collect().catch(e=>{console.error(e.message);process.exitCode=1;});
