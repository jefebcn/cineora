# Uso di dati e rilascio pubblico

- Il progetto include un collector opzionale per leggere schede pubbliche di siti di riferimento, **non ancora verificato live**. Usarlo soltanto quando accesso e riutilizzo dei dati sono consentiti; il catalogo di base proviene da TMDB e ne segue i termini e i diritti applicabili.
- L'accesso TMDB per scopi non commerciali richiede attribuzione. Un uso commerciale (incluso un sito che genera ricavi pubblicitari) richiede un apposito accordo/licenza con TMDB.
- Prima del lancio inserire nel footer/credits un logo TMDB approvato, mantenere l'attribuzione richiesta e verificare i diritti di ciascuna immagine e dei dati.
- Non archiviare permanentemente record TMDB non aggiornati; la politica di pulizia proposta è un primo controllo che va affiancato a un processo di cancellazione quando una licenza è revocata o il servizio viene fermato.
- Non copiare logo, identità visiva confondibile, sorgenti proprietarie o file audiovisivi della piattaforma di riferimento.
- Non sono implementati link a streaming, player protetti, accessi premium, scraping autenticato o bypass anti-bot.
- Le chiavi vanno mantenute solo lato server; impostare una ADMIN_SYNC_KEY segreta non banale e non esporre Redis/PostgreSQL su Internet.
- Implementare HTTPS, rate limiting admin, backup, retention log, osservabilità e gestione errori prima di un rilascio pubblico.

Fonti ufficiali: https://www.themoviedb.org/api-terms-of-use , https://developer.themoviedb.org/docs/faq , https://www.themoviedb.org/about/logos-attribution
