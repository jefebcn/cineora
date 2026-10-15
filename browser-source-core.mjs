/**
 * Lettura rigorosa della regione principale delle pagine pubbliche "Aggiunti di recente".
 * NON dimostra che tutte le card siano state pubblicate in ordine cronologico;
 * mostra unicamente che il loro link era presente nell'elenco osservato.
 */
import { extractTitleAnchors } from './source-latest-core.mjs';

export async function readLatestListing(page, type, { maxScrolls = 3, maxTitles = 80, waitMs = 12000 } = {}) {
  if (!['movie', 'tv'].includes(type)) throw new Error('Tipo pagina non valido');
  // Se main non esiste, non si tenta un'estrazione indiscriminata da body/nav/footer.
  const main = page.locator('main');
  if (await main.count() !== 1) throw new Error('Regione main non univoca: pagina non verificabile');
  const headings = (await main.locator('h1,h2,h3').allTextContents()).join(' ').replace(/\s+/g, ' ');
  if (!/aggiunti\s+di\s+recente/i.test(headings)) {
    throw new Error('Titolo sezione "Aggiunti di recente" assente: pagina non verificabile');
  }
  const cards = main.locator('a[href*="/it/titles/"]');
  // Un link nel menu non deve sbloccare l'attesa del caricamento delle card.
  try {
    await page.waitForFunction(() => {
      const roots = document.querySelectorAll('main');
      return roots.length === 1 && Array.from(roots[0].querySelectorAll('a[href*="/it/titles/"]'))
        .some(anchor => !anchor.closest('header, footer, nav'));
    }, null, { timeout: waitMs });
  } catch {
    throw new Error('Nessuna card caricata nella regione main entro il timeout');
  }
  for (let index = 0; index < maxScrolls; index++) {
    await page.evaluate(() => window.scrollBy(0, 900));
    await page.waitForTimeout(450);
  }
  // Escludere sempre menu, footer e widget di navigazione anche se dentro main.
  const html = await cards.evaluateAll(anchors => anchors
    .filter(anchor => !anchor.closest('header, footer, nav'))
    .map(anchor => anchor.outerHTML)
    .join('\n'));
  const items = extractTitleAnchors(html, type, { limit: maxTitles });
  if (!items.length) throw new Error('Nessuna scheda canonica verificabile: possibile layout cambiato');
  return items;
}
