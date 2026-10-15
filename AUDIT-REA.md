# Audit REA — documentazione operativa

## Stato delle evidenze (15 ottobre 2026)

**Verificato mediante fonti HTML pubbliche**: il dominio indicato pubblica collegamenti a Home, Film, Serie TV, Archivio e categorie, più homepage con righe "I titoli del momento", "Aggiunti di recente" e "Top 10 titoli oggi". Il sito richiede JavaScript per la piena navigazione. Nessuna richiesta autenticata, recupero di video, riproduzione, aggiramento tecnico o estrazione massiva è stato eseguito.

**Verificato nel tuo ZIP**: REA `rea-agents` versione 6.5.0, installazione Node `^22.19.0 || ^24.11.0 || >=26.0.0`, documentazione `docs/browser-observation.md`, CLI `list-browser-targets`, `inspect-web-page`, `capture-web-screenshot`, `analyze-web-bundle`.

**Non verificato**: resa completa JS delle pagine, componenti dinamici, layout mobile effettivo, API del sito, flussi autenticati, comportamento del player, call stack o payload reali. Non presentare come confermato il funzionamento ricostruito da fonti incomplete.

## Procedura sul tuo PC (audit passivo e autorizzato)

1. Installare Node.js >=22.19 della serie 22, oppure 24.11+ (non eseguire versioni non supportate).
2. Installare REA da fonte verificata e usando le istruzioni del repository: `npm install -g rea-agents@6.5.0` oppure `npx -y rea-agents@6.5.0 --help`. Non è necessario copiare REA dentro CINEORA.
3. Avviare Chrome in una sessione separata con profilo dedicato e debugging solo su `127.0.0.1:9222`. Su Windows usare il percorso di `chrome.exe` effettivamente installato:

   ```powershell
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1 --user-data-dir="$env:TEMP\rea-audit" "https://streamingcommunityz.shiksha/"
   ```

4. In una seconda finestra di terminale:

   ```powershell
   rea list-browser-targets http://127.0.0.1:9222 --json
   # Sostituire TARGET_ID con l'id restituito dalla precedente istruzione.
   rea inspect-web-page http://127.0.0.1:9222 TARGET_ID --observation-ms 1000 --json > home-evidence.json
   rea capture-web-screenshot http://127.0.0.1:9222 TARGET_ID --json > home-screenshot.json
   rea analyze-web-bundle http://127.0.0.1:9222 TARGET_ID --json > home-bundle.json
   ```

5. Ripetere l'analisi su pagine pubbliche come `/it/browse/latest?type=movie` e `/it/browse/latest?type=tv` navigandole manualmente. Creare schede **di design e comportamento**, non duplicare automaticamente codice e asset del dominio osservato.
6. Documentare viewport desktop e mobile, struttura header, hero, card, filtri, pagine di dettaglio, loading/error/empty states, flusso di ricerca e accessibilità.

**Privacy e confini**: non salvare cookie, token, sessioni o dati identificativi; non intercettare account di terzi, non cercare endpoint privati e non forzare protezioni. Prima di usare scraping verifica autorizzazione, robots/ToS e diritti di riuso.

## Checklist di confronto

- [ ] Header: desktop/mobile, comportamento scorrimento
- [ ] Home: hero, navigazione, categorie e righe
- [ ] Griglia: poster, badge, hover, varianti responsive
- [ ] Archivio: generi, anno, ordinamento e paginazione
- [ ] Search: suggerimenti, input, zero risultati, errori
- [ ] Dettaglio: titolo, trama, generi, immagini e metadati
- [ ] Accessibilità: focus, semantica, input da tastiera
- [ ] Prestazioni: layout shift, caching, ottimizzazione poster
- [ ] Dati/API: sostituzione con endpoint propri senza dipendenza dal dominio

## Provenienza

- Sito: https://streamingcommunityz.shiksha/
- Repository allegato dall'utente: `rea-main.zip`, `package.json` e `docs/browser-observation.md`
- TMDB: https://developer.themoviedb.org/docs/getting-started
