# CINEORA v0.3 — rapporto di verifica eseguita

Data: 15 ottobre 2026. Esecuzione in ambiente isolato del servizio ChatGPT, **non** sul computer dell'utente.

## Risultati effettivi

| Verifica | Esito | Cosa dimostra / non dimostra |
| --- | --- | --- |
| Archivio v0.2 originale | PASS | ZIP estratto e file consultati |
| Suite originale `npm run test:offline` | PASS: 7/7 | Normalizzazione, date, limiti, URL immagini, client API e contratti statici |
| Suite `npm run test:mock` | PASS: 12/12 | Codice TypeScript reale dei servizi compilato e chiamato con sostituti per Nest, Prisma, TMDB e BullMQ |
| Passaggio HTTP locale client ↔ catalogo | PASS | Client API reale contatta HTTP locale e riceve homepage, filtri, ricerca, dettaglio, stagioni e health; database simulato |
| `npm run check:syntax` | PASS | Parser TypeScript applicato ai file sorgente; **non** è typechecking o Next build |
| Flussi importazione | PASS (mock) | Trending, deduplica, generi, discover, refresh totale/parziale, stagioni ed episodi, idempotenza |
| Controlli auth/queue | PASS (mock) | Autorizzazione amministrativa e registrazione scheduler testate con code simulate |
| Accesso registry npm | BLOCCATO | `registry.npmjs.org` non risolvibile nell'ambiente: impossibile installare le dipendenze |
| Build Next.js / NestJS reale | NON ESEGUITA | Dipendenze assenti. Non si può dichiarare che l'applicazione completi la build |
| Prisma migrate su PostgreSQL reale | NON ESEGUITA | `docker`, `psql`, server PostgreSQL non disponibili in questo ambiente |
| Worker BullMQ / Redis reale | NON ESEGUITO | Redis non presente; testato solo l'utilizzo con mock |
| Sincronizzazione TMDB in rete | NON ESEGUITA | Nessun token TMDB reale, rete esterna bloccata; HTTP TMDB verificato tramite mock |
| Rendering Next.js completo in browser | NON ESEGUITO | Chromium headless disponibile, ma lo screenshot della preview si è bloccato nell'ambiente; frontend Next non installato |
| REA audit del sito originale | NON ESEGUITO | Non necessario alla correttezza delle API; richiede CDP browser e ambiente Node adeguato |

La suite mock **non** è equivalente a un test con il framework NestJS, Next.js, PostgreSQL, Redis e API TMDB reali. Nulla di quanto sopra certifica che il deploy di produzione funzioni.

## Correzioni introdotte dopo la verifica di v0.2

1. Rimossa la cancellazione indiscriminata di titoli non aggiornati da 170 giorni: avrebbe eliminato contenuti storici quando il catalogo fosse cresciuto oltre la capacità del refresh quotidiano.
2. Gli elementi TMDB malformati o senza ID valido non incrementano più il conteggio dei titoli importati.
3. Una classifica trending vuota non cancella più la classifica precedente: il job registra un errore.
4. Distinto ordinamento "aggiunti al catalogo" (`sort=added`, `createdAt desc`) da "uscita più recente" (`sort=recent`, `releaseDate desc`), e corretto il collegamento homepage.
5. La paginazione frontend usa il numero pagina validato restituito dal backend.
6. Aggiunta suite di test mock riproducibile e controllo sintattico dei TS/TSX.

- Preparato workflow GitHub Actions per eseguire **in remoto** build, migrazioni, test e smoke HTTP con PostgreSQL/Redis reali. Workflow non eseguito in questo ambiente.

## Limiti noti e priorità per il prossimo test di integrazione

- Nel caso di numerosi refresh TMDB falliti, l'ordinamento per `updatedAt` rischia di selezionare di nuovo gli stessi titoli ad ogni ciclo: aggiungere in futuro un timestamp separato dell'ultimo tentativo.
- Importazione stagioni limitata intenzionalmente alle prime sei serie e alle ultime sei stagioni.
- Mancano misure di latenza, test di carico, test browser responsive sul frontend Next e scansione vulnerabilità dei pacchetti.
- La chiave TMDB e la licenza commerciale non sono incluse. Serve una chiave lecita per provare l'importazione reale.
- Il sito originario non è un archivio video a disposizione del progetto; la piattaforma resta un catalogo informativo.

## Ripetere le verifiche senza servizi esterni

Dopo aver installato le dipendenze (in un ambiente server/CI con rete), dalla radice del progetto:

```bash
npm run test:qa
```

Per completare la certificazione integrata in un ambiente **remoto** con Docker e token TMDB:

```bash
npm ci # dopo generazione e commit di package-lock.json
npm run db:generate
npm run build
# Avviare PostgreSQL + Redis, poi:
npm run db:deploy
npm run test
# Avviare API, worker e web; poi:
node scripts/healthcheck.mjs
```

Prima della pubblicazione è necessario completare i test con dati reali, una migrazione contro PostgreSQL e il controllo di sicurezza/attribution/licenze TMDB.
