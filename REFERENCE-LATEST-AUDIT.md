# Audit fonte di riferimento – CINEORA v0.4

Data: 15 ottobre 2026 (Europa/San Marino)

## Osservato effettivamente

Il sito `https://streamingcommunityz.shiksha` mostra le sezioni `/it/browse/latest?type=movie` e `/it/browse/latest?type=tv`; le intestazioni sono leggibili con il sistema di navigazione testuale, ma **le card della lista non lo sono senza JavaScript**. L'archivio presenta un conteggio di circa 18.946 titoli. Non è possibile ricavare con questi strumenti l'ordine esatto delle ultime aggiunte o garantire un elenco completo.

Ho verificato via ricerca + apertura delle singole pagine pubbliche 10 esempi di serie elencati in `data/observed-on-reference-2026-10-15.json`/`.csv`. La conferma è **presenza osservata nella scheda**, non **data di aggiunta**. Altri due film compaiono come hero di pagine pubbliche e sono separati in `data/featured-movies-to-review.json` in attesa di identificazione della scheda.

## Metodo concreto realizzato

**Canale 1 (funzionante a livello di codice e simulazioni):** job TMDB `new-releases`, che ogni 12 ore interroga gli endpoint discover per film/serie con finestra degli ultimi 120 giorni, fino a 3 pagine per tipo configurabili, salva con upsert PostgreSQL. Il risultato contiene nuove uscite **TMDB**, non necessariamente nuove aggiunte al sito originale.

**Canale 2 (preparato ma non collaudato live):** `scripts/collect-reference-latest.mjs` usa Playwright su pagine pubbliche, controlla prima robots.txt, legge esclusivamente link /it/titles e titoli, non estrae URL video o player e si interrompe con errore quando la lista è vuota/non accessibile. `scripts/match-reference-tmdb.mjs` abbina a TMDB solo match testuali esatti e non ambigui; salva gli altri per controllo. Il job `source-latest` inserisce i record verificati nel database e nella tabella separata `source_observations`. La homepage distingue gli osservati sul sito dalle aggiunte al nostro catalogo.

Se il sito non permette il crawling, questo canale va disattivato e si prosegue con TMDB e fonti autorizzate alternative. La presenza di una URL pubblica non implica automaticamente il diritto di estrarne o ripubblicarne i dati sistematicamente: verificare condizioni d'uso, copyright e robots.

## Cosa ho testato davvero

- Suite offline, matcher e parser HTML: completata con dati mock/fixture.
- Suite servizi NestJS/worker con dipendenze simulate, compreso `new-releases`: completata.
- Parsing sintattico TypeScript/TSX: completato.
- Accesso diretto dal runtime: **negativo**; non è possibile risolvere DNS esterno per sito di riferimento, TMDB e npm registry.
- Rendering Playwright reale del sito e crawling live: **non eseguiti**.
- Token TMDB reale, PostgreSQL/Redis veri e build completa: **non disponibili/non eseguiti**.
- Una data di aggiunta al sito originale per i 10 titoli: **non verificabile da quanto osservato**.

## Tracciamento e criteri di qualità

Ogni riga candidata salva `sourceUrl`, `type`, `observedAt`; gli ID definitivi sono assegnati solo dopo match TMDB. Se il parser restituisce zero titoli, viene generato un errore, mai un elenco fittizio. Un titolo verificato in una scheda individuale ma non nella lista latest viene etichettato `verified-present-not-verified-latest`.

## Come eseguire su server remoto, non sul PC dell'utente

Requisiti: connessione esterna, consenso all'uso delle fonti, Node supportato, Playwright+Chromium, un token TMDB lato server, PostgreSQL e Redis.

```bash
node scripts/collect-reference-latest.mjs data/reference-latest-candidates.json
TMDB_READ_ACCESS_TOKEN=... node scripts/match-reference-tmdb.mjs data/reference-latest-candidates.json data/source-latest-enriched.json
npm run sync:enqueue -- source-latest
npm run sync:enqueue -- new-releases
```

In assenza della possibilità di effettuare il collector, si può usare il file di schede osservate, ma **non va chiamato latest**:

```bash
TMDB_READ_ACCESS_TOKEN=... node scripts/match-reference-tmdb.mjs data/observed-on-reference-2026-10-15.json data/source-latest-enriched.json
npm run sync:enqueue -- source-latest
```

Per pubblicare su un servizio EasyPanel, questi comandi devono essere avviati lato server, conservando il token come segreto. Non inviare il token tramite frontend. Il collector non è schedulato automaticamente di default: può essere periodico solo dopo aver verificato l'autorizzazione e il comportamento reale sul sito.
