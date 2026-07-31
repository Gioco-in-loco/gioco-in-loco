# Gioco In Loco

Sito vetrina per un collettivo di associazioni ludiche che promuovono gioco da tavolo e di ruolo durante eventi fieristici.

## Stack Tecnologico

- **Framework:** Next.js 14
- **UI:** React 18
- **Styling:** Tailwind CSS 3.4
- **Architettura:** App Router con rendering statico per le pagine pubbliche

## Design

Tema dark con vibe fantasy/tabletop gaming - sfondo scuro, accenti ambra/oro, icone dadini.

## Comandi

```bash
npm install          # Installa dipendenze
npm run dev          # Dev server su localhost:3000
npm run build        # Build produzione Next.js
npm run start        # Avvia la build in produzione
```

## Deploy

Il sito è deployato su Vercel. Il deploy automatico avviene ad ogni push sulla branch `main`.

### Configurazione Vercel

- **Build command:** `npm run build`
- **Framework preset:** `Next.js`

## Struttura

```
/
├── public/                  # Immagini statiche
├── src/
│   ├── components/          # Componenti React
│   │   ├── layout/         # Sidebar, Footer
│   │   ├── sections/       # Hero, Associazioni, CatalogoGiochi, ProgrammaEventi
│   │   └── ui/             # Card, Badge
│   ├── data/               # Dati hardcoded (JSON)
│   ├── assets/             # CSS custom
│   └── ...
├── app/                    # Route tree Next.js
├── next.config.mjs
├── tailwind.config.js
└── package.json
```

## API Locale

Per testare il sito in locale, avviare il dev server:

```bash
npm run dev
```

Il sito sarà disponibile su `http://localhost:3000`.

## Email Prenotazioni

Per inviare le email automatiche dopo la conferma del carrello DICE FEST, configurare queste variabili ambiente lato server:

```bash
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME="Gioco In Loco"
BOOKING_NOTIFICATION_ADMIN_EMAIL=
```

`BOOKING_NOTIFICATION_ADMIN_EMAIL` è l'indirizzo amministrativo che riceve la notifica interna di nuova prenotazione confermata.
