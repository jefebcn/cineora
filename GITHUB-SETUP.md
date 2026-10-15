# CINEORA — Caricamento su GitHub e collaudo remoto

## Repository nuovo

1. Crea un repository **privato** chiamato `cineora`, senza inizializzarlo con README, .gitignore o licenza.
2. Estrai `cineora_git_ready_v0_5.zip`. In GitHub scegli **Add file → Upload files** e trascina **il contenuto estratto** della cartella (non il file ZIP). Controlla che README.md e package.json siano nella radice del repository.
3. Verifica che anche `.github/workflows/ci.yml`, `.github/workflows/reference-probe.yml` e `.gitignore` siano inclusi. Se l'interfaccia web non accetta le cartelle nascoste, usa GitHub Desktop o una modifica dal sito GitHub per inserire il workflow.
4. Esegui il commit sul branch principale. La workflow CI si avvia automaticamente e verifica installazione, build, migrazioni e test integrati simulati. La sua riuscita **non** dimostra l'acquisizione dal sito di riferimento.
5. Condividi il link al repository e il riepilogo o l'URL di GitHub Actions per consentire la diagnosi. Nessuna credenziale deve essere inviata in chat o committata.

## Segreti

Non caricare file `.env`, `.env.local`, credenziali database reali, token API o cookie di browser. Tutte le variabili di esempio nei file `.env.example` sono segnaposto.

Per l'importazione TMDB live, crea un `TMDB_READ_ACCESS_TOKEN` sul sito TMDB, poi aggiungilo in GitHub tramite **Settings → Secrets and variables → Actions → New repository secret**. Il workflow di sola build non utilizza ancora quel secret per la sincronizzazione: servirà un'apposita esecuzione separata una volta verificata la build.

## Ultime aggiunte del sito di riferimento

Il workflow `reference-probe.yml` è manuale e non va eseguito finché non sono state verificate autorizzazioni e condizioni d'accesso. Non accede a contenuti video e non tenta di aggirare protezioni. Il solo HTML potrebbe non contenere i dati: l'esito reale va misurato.

## Cosa non è implementato

Non è implementato il download di file video, l'accesso a sorgenti protette o una piattaforma di riproduzione. CINEORA v0.5 è un MVP catalogo, non un servizio streaming.
