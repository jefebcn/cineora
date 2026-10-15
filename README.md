# CINEORA — MVP v0.5 — catalogo film e serie TV

**Fase attuale**: base di sviluppo revisionata, non prodotto già distribuito. Frontend Next.js 15, API NestJS 11, PostgreSQL + Prisma, Redis/BullMQ, worker importazione TMDB. Identità originale; nessun video/player incluso; raccolta opzionale di metadati pubblici tramite browser, da autorizzare e verificare live.

## Requisiti

- Node.js >=22.19 della serie 22 oppure >=24.11 della serie 24, con npm
- Docker Desktop + `docker compose` per PostgreSQL 16 e Redis 7
- Chiave **TMDB API Read Access Token** da https://www.themoviedb.org/settings/api

## Avvio su Windows / macOS / Linux

Apri il terminale dentro la cartella `cineora`:

```bash
node --version
npm install
# Esegui i prossimi passaggi in Docker Desktop già avviato
docker compose up -d
```

1. Su Windows puoi avviare `powershell -ExecutionPolicy Bypass -File scripts/setup-local.ps1`: crea i file `.env` senza sovrascriverli e genera una chiave admin casuale. In alternativa, copia `.env.example` in `apps/api/.env` e sostituisci `TMDB_READ_ACCESS_TOKEN` e `ADMIN_SYNC_KEY`.
2. Copia **soltanto** `apps/web/.env.example` in `apps/web/.env.local` e modifica `API_URL` se necessario. Non mettere token e password nel frontend: anche le variabili server-side di Next.js devono restare minime.
3. Nel progetto, esegui:

```bash
npm run db:generate
npm run db:deploy
npm run test
npm run test:offline    # 7+ test senza dipendenze aggiuntive su Node 22
```

4. Apri **tre terminali**, tutti nella radice del progetto:

```bash
# Terminale A: API / scheduler
npm run dev:api
# Terminale B: worker di importazione
npm run dev:worker
# Terminale C: frontend
npm run dev:web
```

5. Apri http://localhost:3000, verifica http://localhost:4000/api/health ed esegui `node scripts/healthcheck.mjs`. Il catalogo richiederà alcuni job per popolarsi. Inizialmente sarà vuoto; lo stato vuoto è previsto.

**Importazione manuale**: da radice progetto `npm run sync:enqueue -- trending`, oppure usa `POST /api/admin/sync` con header `x-admin-key` e JSON `{ "kind": "trending" }`. Il worker dev'essere acceso. Tipi accettati: `trending`, `discover`, `seasons`, `refresh`, `new-releases`, `source-latest`. Riavvia il worker dopo modifiche al codice TypeScript.

## Struttura

```
apps/web/          Next.js App Router, homepage/catalogo/ricerca/scheda
apps/api/          NestJS REST, Prisma, worker BullMQ, scheduler
apps/api/prisma/   Schema, SQL migrazione iniziale e indici
preview/           Anteprima visuale statica, senza dipendenze
 docs/             Audit REA, contratti API, aspetti legali
```

## Cosa funziona nel codice

- `/`, `/film`, `/serie-tv`, `/archivio`, `/cerca?q=`, `/titolo/:id`
- Ricerca in italiano, filtri per genere/anno, ordinamento per aggiunta/uscita e paginazione
- Importazione di film e serie dall'API TMDB; deduplicazione e aggiornamenti (5 pagine per tipo per `discover`, configurabile da 1 a 10)
- Stagioni ed episodi *parziali*: sei serie, fino a sei stagioni ciascuna
- Scheduler 6h/12h/giornaliero, `refresh` giornaliero di un lotto fino a 200 titoli, log run e stato `partial` in caso di successi misti
- Limitazione input, codice indipendente dal sito di riferimento

## Limiti conosciuti

- **Non sono stati installati/eseguiti Next, Nest, Prisma e Docker in questo ambiente** (registry npm non raggiungibile): prima dell'uso sono necessari installazione dipendenze, build, migrazione e test integrati sul tuo PC.
- Nessuna chiave TMDB fornita: l'importazione reale non è stata collaudata.
- L'audit REA browser e il confronto visivo col sito originale sono **da completare localmente**; vedi `docs/AUDIT-REA.md`.
- Non implementa account, preferiti, provider di visione, player, dashboard admin o log di utilizzo. L'importazione di poche pagine non equivale al catalogo completo TMDB.
- Modulo opzionale di lettura pagine pubbliche con Playwright aggiunto in v0.4: va eseguito solo con accesso/riutilizzo consentiti; non verificato live, non incluso nella schedulazione predefinita.
- Prima di un uso pubblico o commerciale occorrono un logo TMDB approvato, verifica licenze, sicurezza e gestione delle immagini.

## API e architettura

Consulta `docs/API-SCHEMA.md` e `docs/LEGAL-OPERATIONS.md`.

## Deploy EasyPanel

Configurare **5 servizi separati**: Web (porta 3000), API (4000), Worker (senza porta HTTP), PostgreSQL e Redis. I primi tre usano lo stesso repository ma comandi di avvio differenti (`npm run start -w @cineora/web`, `npm run start -w @cineora/api`, `npm run worker -w @cineora/api`). Prima compilare con `npm install && npm run db:generate && npm run build`; migrazioni `npm run db:deploy` come job separato. Sostituire `127.0.0.1` con gli hostname interni EasyPanel nelle variabili ambiente. Non considerare questa nota un deploy già verificato.

## QA v0.3

- `npm run test:offline`: 7 test senza librerie esterne aggiuntive.
- `npm run test:mock`: 12 test su servizi veri con moduli esterni simulati (richiede `typescript`, già in devDependencies).
- `npm run check:syntax`: parsing TS/TSX, non typecheck.
- `npm run test:qa`: esegue tutte e tre le suite.
- Non confondere gli HTTP test con l’integrazione Nest/Prisma/Redis reale.
- `node scripts/healthcheck.mjs`: verifica collegamento API/PostgreSQL/homepage dopo che i servizi sono stati avviati.
- Vedi `docs/QA-REPORT.md` per verifiche reali, risultati e limitazioni.

**Importante**: v0.3 non è una build certificata né un prodotto pronto al traffico pubblico.

## Correzioni v0.3 (test in ambiente isolato)

- Rimossa la cancellazione automatica dei titoli storici in fase di discovery.
- Trending vuoto protegge le classifiche già presenti; conteggi degli import validati.
- Aggiunto ordinamento `sort=added` coerente con la homepage; paginazione normalizzata lato API.
- 7 test offline + 12 test dei servizi con mock + parsing TS/TSX.
- **Non è stata eseguita** una build o una migrazione reale: le dipendenze npm, Docker, la rete TMDB e il browser integrato non sono disponibili in questo ambiente.

Il tuo computer non è necessario per continuare lo sviluppo. Il collaudo completo richiederà però un ambiente server o CI remoto che possa installare pacchetti ed eseguire PostgreSQL, Redis e, per i dati reali, una chiave TMDB.

## CI remota, senza usare il PC

Incluso `.github/workflows/ci.yml`: su un repository GitHub con Actions abilitato, lancia build Nest/Next, migrazioni PostgreSQL 16, Redis 7, test offline/mock e semplici smoke test HTTP con catalogo vuoto. **Questo workflow è stato scritto, non ancora eseguito su GitHub Actions.** Non usa una chiave TMDB reale e non certifica una sincronizzazione live. Prima del rilascio generare `package-lock.json` e passare a `npm ci` per build riproducibili.

## Integrazione ultime uscite v0.4 (15 ottobre 2026)

Nuovi file e procedure in **`docs/REFERENCE-LATEST-AUDIT.md`**. Sono inclusi 10 esempi di serie TV verificate nelle singole schede pubbliche (`data/observed-on-reference-2026-10-15.json` + `.csv`) e 2 esempi di film in evidenza in una lista di verifica separata. Non confondere questi titoli con un feed provato di *ultime aggiunte*.

`new-releases` viene schedulato ogni 12 ore dal worker esistente, se abilitato, e importa uscite TMDB degli ultimi 120 giorni. `collect-reference-latest.mjs` prova a raccogliere i link dalle vere pagine latest tramite browser Playwright; `match-reference-tmdb.mjs` arricchisce solo match univoci; `source-latest` salva il risultato e l'evidenza nella nuova tabella `source_observations`.

Il runtime di questa sessione non può accedere al sito via DNS e non ha browser Chromium installato: la **sincronizzazione specifica delle ultime aggiunte di StreamingCommunity rimane da verificare live**; non è stato inventato alcun dato e nessun video è stato acquisito.

Nuovo test suite: `npm run test:qa` e nuova migrazione Prisma `202610150002_source_observations`. Con `npm install` al prossimo ambiente remoto Playwright viene installato ma Chromium richiede `npx playwright install chromium`.


## Novità v0.5 — verifiche con Chromium reale e sondaggio remoto

- `scripts/browser-source-core.mjs`: accetta soltanto link delle schede nella regione `<main>` dopo aver verificato il titolo «Aggiunti di recente»; esclude navigazione, footer e URL esterni. **È una regola prudente, non una verifica live del layout del sito terzo.**
- `npm run test:browser`: usa Playwright/Chromium per una **pagina locale di test** che inserisce titoli con JavaScript dopo il caricamento; prova deduplica, esclusione dei link di navigazione e comportamenti fail-closed.
- `.github/workflows/reference-probe.yml`: sondaggio manuale (non ricorrente), in sola lettura, con conferma esplicita di aver verificato le condizioni d'accesso. Controlla robots.txt; produce un artefatto JSON di candidate card o fallisce senza inventare titoli. **Non è stato avviato.**
- Piccola correzione: negli URL di provenienza supportati i caratteri Unicode, senza accettare domini terzi.

In questo ambiente Chromium è disponibile e le prove sul fixture locale sono eseguibili; **la connessione diretta al sito di riferimento e a npm/TMDB non risolve il DNS**, e non sono disponibili Docker né credenziali TMDB. Dunque non considerare validata l'estrazione reale da StreamingCommunity né la build integrata in produzione. Vedi `docs/QA-REPORT-v0.5.md`.
