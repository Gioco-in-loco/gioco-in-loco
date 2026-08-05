# Backup del database

Lo script [`scripts/backup-database.ts`](../scripts/backup-database.ts) esporta tutte le tabelle del database in file `.csv` (uno per tabella) e genera un file `restore.sql` con tutte le `INSERT` necessarie a ripopolare il database da zero.

Serve perché il progetto è su Supabase piano free, che **non include backup automatici**: se il database viene svuotato o corrotto, senza un backup manuale i dati sono persi in modo definitivo.

## Come lanciarlo

Dalla cartella del progetto:

```bash
npm run db:backup
```

Lo script si collega al database usando le variabili d'ambiente già presenti in `.env`/`.env.local` (`DATABASE_URL`), non serve configurare altro.

Ogni esecuzione crea una nuova cartella con timestamp:

```
backup/
└── 2026-08-05T13-44-03-660Z/
    ├── users.csv
    ├── associations.csv
    ├── events.csv
    ├── one_shots.csv
    ├── event_slots.csv
    ├── ... (una .csv per ogni tabella)
    └── restore.sql
```

Le esecuzioni precedenti non vengono sovrascritte: ogni backup resta nella sua cartella con data e ora.

> La cartella `backup/` è nel `.gitignore` — i backup restano solo in locale, non vengono mai committati o pushati.

## Cosa contengono i file

- **`*.csv`**: un file per ogni tabella del database, con tutte le colonne e tutte le righe presenti al momento del backup. Utile per ispezionare rapidamente i dati (es. aprirli in Excel) o per un'importazione parziale.
- **`restore.sql`**: contiene una `INSERT` per ogni tabella, nell'ordine corretto rispetto alle foreign key (es. `associations` prima di `one_shots`, `events` prima di `event_slots`), avvolta in una transazione (`BEGIN` / `COMMIT`).

## Come ripristinare da un backup

1. Assicurarsi che lo schema del database sia allineato alle migration del progetto:
   ```bash
   npx prisma migrate deploy
   ```
2. Eseguire il file `restore.sql` del backup scelto:
   ```bash
   npx prisma db execute --file ./backup/<timestamp>/restore.sql --schema ./prisma/schema.prisma
   ```

`restore.sql` è **idempotente**: ogni `INSERT` usa `ON CONFLICT DO NOTHING`, quindi si può rieseguire più volte senza errori né righe duplicate (non aggiorna però le righe già esistenti — se una riga è già presente con quell'id/vincolo unico, i suoi valori restano quelli attuali, non vengono sovrascritti dal backup).

## Quando farlo

Non essendoci backup automatici, conviene lanciare `npm run db:backup` manualmente prima di qualsiasi operazione rischiosa sul database, ad esempio:

- prima di una migration Prisma non banale (specialmente se cambia/rimuove colonne o tabelle)
- prima di modifiche massive fatte a mano (es. script di importazione dati)
- periodicamente durante un evento live, per avere un punto di ripristino recente
