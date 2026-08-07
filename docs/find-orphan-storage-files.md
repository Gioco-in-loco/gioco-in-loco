# Pulizia file orfani nello storage Supabase

Lo script [`scripts/find-orphan-storage-files.ts`](../scripts/find-orphan-storage-files.ts) confronta i file caricati nei bucket Supabase Storage con i riferimenti effettivamente salvati nel database, ed elenca quelli **orfani**: file rimasti nello storage ma non più collegati a nessuna riga (es. un logo o un'immagine one-shot sostituiti con un nuovo upload).

Serve perché quando si carica una nuova immagine il vecchio file **non viene mai cancellato automaticamente** (vedi [`src/lib/storage-image-upload.js`](../src/lib/storage-image-upload.js)): nel tempo lo storage accumula file inutilizzati che occupano spazio senza motivo.

I bucket controllati sono tre: `association-logos`, `oneshot-images`, `main-event-images`.

## Come lanciarlo (solo report, non cancella nulla)

Dalla cartella del progetto:

```bash
npm run db:find-orphan-storage
```

Per ogni bucket stampa: quanti file ci sono nello storage, quanti sono referenziati nel database, ed elenca i file orfani con nome, dimensione, data di creazione e URL pubblico. In fondo mostra il totale di file orfani e lo spazio occupato.

Lo script si collega usando le variabili d'ambiente già presenti in `.env`/`.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`), non serve configurare altro. Senza `SUPABASE_SERVICE_ROLE_KEY` lo script si ferma subito con un errore (serve la service role per poter *listare* lo storage, la chiave pubblica non basta).

## Come cancellare davvero i file orfani

Il comando sopra **non cancella mai nulla**: è un report. Per cancellare i file orfani bisogna passare esplicitamente il flag `--delete`:

```bash
npm run db:find-orphan-storage -- --delete
```

Prima di procedere lo script chiede conferma a terminale, mostrando quanti file e quanti MB stanno per essere cancellati:

```
Stai per cancellare DEFINITIVAMENTE 30 file (6.67 MB) dallo storage Supabase.
Scrivi "si" per confermare:
```

Bisogna scrivere `si` (minuscolo) e premere invio per procedere; qualunque altra risposta annulla l'operazione senza cancellare nulla.

Per saltare la conferma (es. per automatizzarlo, tipo un cron periodico) si può aggiungere anche `--yes`:

```bash
npm run db:find-orphan-storage -- --delete --yes
```

> La cancellazione è **irreversibile**: i file rimossi dallo storage Supabase non sono recuperabili. Il nome del comando dopo `--` (sintassi npm) è necessario perché `npm run` passi i flag allo script invece di interpretarli come propri.

## Quando farlo

Non essendoci una pulizia automatica, conviene lanciare il report periodicamente (es. dopo un evento, o quando lo storage Supabase si avvicina ai limiti del piano) per capire quanto spazio si può recuperare, e lanciare `--delete` solo dopo aver controllato l'elenco — in particolare se di recente sono state fatte operazioni "sospette" (cancellazioni di one-shot/associazioni/main-event, o import massivi) che potrebbero aver lasciato molti file orfani in una volta sola.
