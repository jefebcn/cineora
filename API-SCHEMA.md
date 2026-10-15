# Contratti backend CINEORA MVP v0.2

Base: `http://localhost:4000/api`, risposta JSON, dati in italiano tramite TMDB. Backend basato su NestJS 11 e Prisma/PostgreSQL.

| Metodo | Endpoint | Scopo |
|---|---|---|
| GET | `/health` | Controllo disponibilità PostgreSQL |
| GET | `/home` | Hero e cinque raccolte |
| GET | `/titles?type=movie&genre=28&year=2026&sort=popular&page=1&limit=20` | Archivio filtrato |
| GET | `/search?q=nome` | Ricerca case insensitive (min 2 caratteri) |
| GET | `/genres` | Lista generi |
| GET | `/titles/:id` | Scheda completa |
| GET | `/tv/:id/seasons` | Stagioni ed episodi già importati |
| GET | `/admin/sync` | Storico job, richiede header `x-admin-key` |
| POST | `/admin/sync` | Accoda `{ "kind": "trending" | "discover" | "seasons" | "refresh" }`, richiede header `x-admin-key` |

`sort=popular|rating|recent`, `type=movie|tv`. La Top 10 è ordinata per numero di voti, **non** è la classifica ufficiale del sito di riferimento. "Aggiunti di recente" usa la data di inserimento nel database CINEORA.

Le API non includono link a file video e non implementano login, preferiti, monetizzazione, gestione di diritti o indicizzazione globale di tutti i titoli TMDB.

## Modello relazionale

`titles` 1-N `seasons` 1-N `episodes`, `titles` N-N `genres` attraverso `title_genres`. Identificativo proprio UUID; identificazione TMDB stabile tramite vincolo `UNIQUE(type,tmdb_id)`. Log in `sync_runs`. Indice trigramma GIN su `titles.name` e indici su popolarità, trend e inserimento.

## Worker, limiti e idempotenza

BullMQ `catalog` con un worker a concorrenza 1, job con retry/backoff:
- `trending`: due pagine per tipo, ogni 6h
- `discover`: cinque pagine per tipo predefinite (configurabile da 1 a 10), ogni 12h
- `seasons`: 6 serie più popolari, al massimo 6 stagioni recenti per ciascuna, una volta al giorno
- `refresh`: i 100 titoli meno recentemente aggiornati (configurabile da 1 a 200), una volta al giorno. In caso di fallimenti parziali registra `partial` e conserva gli errori nei log del worker

Lo stesso titolo importato più volte viene aggiornato via UPSERT. Per rispettare i limiti di conservazione TMDB, una sync `discover` riuscita elimina titoli non aggiornati da oltre 170 giorni. Una soluzione pubblica/commerciale richiede revisione delle licenze e del ciclo di vita dei dati prima del deploy.
