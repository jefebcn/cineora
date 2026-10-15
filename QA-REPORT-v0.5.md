# CINEORA v0.5 — Rapporto tecnico di verifica

**Data:** 15 ottobre 2026.  **Ambiente:** sandbox di test con Node.js 22.16.0 e Chromium 144; nessun Docker, PostgreSQL, Redis, token TMDB o DNS esterno funzionante.

## Verifiche realmente eseguite

| Attività | Esito | Evidenza |
|---|---|---|
| Integrità del progetto sorgente v0.4 | OK | archivio aperto, 95 entry |
| Node `test:offline` | **14/14 OK** | `cineora_v0_5_local_test.log` |
| Node `test:mock` | **14/14 OK** | `cineora_v0_5_local_test.log` |
| Controllo sintassi sorgenti TS/TSX | **29 file, 0 errori** | `cineora_v0_5_local_test.log` |
| Browser JS-rendered fixture | **4/4 OK** | Playwright su Chromium reale (`test:browser`) |
| Anteprima statica CINEORA con CSS | Aperta in Chromium; 0 errori JavaScript | `cineora_v0_5_preview.png` |
| Accesso diretto pagina latest del dominio terzo | **BLOCCATO** | DNS non risolto, richiesta `robots.txt` interrotta; `cineora_v0_5_remote_probe.log` |
| Browser contro layout live StreamingCommunity | **NON ESEGUITO** | Il dominio non è raggiungibile dalla sandbox |
| API TMDB live / ID match | **NON ESEGUITO** | Token TMDB assente, DNS non funzionante |
| Installazione npm, build Next/Nest | **NON ESEGUITO** | registry npm non raggiungibile |
| Migrazioni vere PostgreSQL / Redis | **NON ESEGUITO** | Docker e servizi non disponibili |

**Numero di test registrati:** 32/32 riusciti (14 offline + 14 mock + 4 browser). Dei 4 browser, uno verifica la chiusura delle risorse; 3 verificano comportamento di estrazione e validazioni su un fixture locale.

## Correzione concreta introdotta

Nella v0.4 il collector leggeva indiscriminatamente gli URL delle schede presenti nel documento. Nella v0.5 la funzione `readLatestListing`:

1. Richiede una regione `main` univoca e un'intestazione «Aggiunti di recente».
2. Attende almeno un link di scheda fuori da menu/header/footer, anche quando è creato via JavaScript in ritardo.
3. Accetta esclusivamente `/it/titles/...` sul dominio configurato; elimina duplicati; ignora link dei widget di navigazione.
4. Se la sezione manca o non esistono link validi, fallisce senza emettere un feed.
5. Il feed aggiunge una nota esplicita: si osservano link nella pagina; completezza e ordinamento cronologico non sono provati.

Nota: queste regole presumono che il sito terzo usi effettivamente un elemento HTML `<main>`; **se il layout reale è diverso, il collector fallirà finché non verrà adattato sulla base di un audit autorizzato**. Questo è intenzionale per minimizzare falsi positivi.

## Passo successivo per una verifica live senza il computer dell'utente

Il repository include `.github/workflows/reference-probe.yml`, workflow **manuale e non eseguito**. Dopo aver pubblicato il repository su una infrastruttura GitHub Actions con rete esterna e verificato autorizzazione/condizioni di accesso, eseguire manualmente il sondaggio. Il job controllerà robots.txt, avvierà Chromium, raccoglierà al massimo 80 link per categoria e caricherà il JSON delle sole schede pubbliche. Se la verifica di accesso fallisce, il job deve terminare senza inventare titoli.

Per importare gli identificativi TMDB in un database reale servono inoltre token API, PostgreSQL, Redis, installazione dipendenze e collaudo di migrazioni/job. Il workflow CI presente è stato aggiornato con un browser test locale, ma non è stato lanciato remotamente.

Non sono inclusi, scaricati o collegati file video; il progetto non accede a DRM, credenziali, player o endpoint privati.
