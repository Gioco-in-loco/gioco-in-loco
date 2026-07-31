# CLAUDE.md - Sito Vetrina Gioco In Loco

## Contesto del Progetto

Applicazione web Next.js per un collettivo di associazioni ludiche che promuovono gioco da tavolo e di ruolo durante eventi fieristici.

**Atmosfera:** Comic-book style con colori vivaci - cyan, magenta, yellow su sfondo carta crema. Stile fumettoso con bordi spessi, ombre offset e effetti pop.

---

## Stack Tecnologico

- **Framework:** Next.js 14
- **UI:** React 18
- **Styling:** Tailwind CSS 3.4
- **Architettura:** App Router con pagine pubbliche renderizzate staticamente
- **PWA:** Service Worker per caching offline

---

## Struttura Cartelle

```
/
├── public/
│   ├── images/           # Immagini giochi e loghi associazioni
│   ├── fonts/            # Font locali (Bangers, Comic Neue, Nunito)
│   ├── manifest.json     # PWA manifest
│   ├── sw.js             # Service worker per offline
│   └── icon-*.svg        # Icone PWA
├── app/                    # Route tree Next.js
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx      # Sidebar navigazione
│   │   │   └── Footer.jsx       # Footer con contatti
│   │   ├── sections/
│   │   │   ├── Hero.jsx          # Hero section + banner PWA
│   │   │   ├── Associazioni.jsx  # Griglia card partner
│   │   │   ├── Ludoteca.jsx      # Catalogo giochi con galleria orizzontale
│   │   │   ├── AreaGDR.jsx       # Sessioni GDR con slot e galleria
│   │   │   └── AreaHardCore.jsx  # Giochi complessi con filtro complessità
│   │   └── ui/
│   │       ├── Card.jsx         # Componente card generico
│   │       └── Badge.jsx        # Badge per categorie/tag
│   ├── data/                    # Dati hardcoded
│   │   ├── associazioni.json    # Partner associazioni (8)
│   │   ├── giochi.json          # Catalogo board games (100+)
│   │   └── one-shot.json        # Programma sessioni GDR (112)
│   ├── assets/
│   │   └── main.css             # Tailwind + custom styles + font-face
│   └── ...
├── next.config.mjs
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## Dati e Tipo

### Association (`src/data/associazioni.json`)
```ts
type Association = {
  id: string
  name: string
  logo: string          // path immagine
  bio: string
  location?: {
    address: string
    city: string
    openingHours: string
  }
  social: {
    instagram?: string
    facebook?: string
    website?: string
    whatsapp?: string
  }
}
```

### BoardGame (`src/data/giochi.json`)
```ts
type BoardGame = {
  id: string
  title: string
  description: string  // descrizione dettagliata
  image: string         // path immagine
  players: string       // es. "2-6"
  time: string          // es. "90 min"
  category: string      // es. "strategia", "cooperativo", "party"
  owner: string         // ref a id associazione
}
```

### One-shot (`src/data/oneshot.json`)
```ts
type OneShot = {
  id: string
  title: string         // nome della one-shot
  game: string          // nome del rulebook (D&D 5e, Pathfinder, etc.)
  description: string   // descrizione dell'avventura
  master: string        // nome del narratore
  association: string   // id associazione
  schedule: Array<{
    day: string      // giorno (Venerdì, Sabato, Domenica)
    slot: string     // orario slot (es. "11-13")
    table: string    // numero tavolo (es. "Tavolo 1")
  }>
}
```

**Nota:** Una one-shot può avere più slot in giorni diversi. Non duplicare l'entry, basta aggiungere più oggetti nell'array `schedule`.

---

## Design System

### Palette Colori Comic-Book
- **Background paper:** `#F8F6F0` - sfondo carta crema
- **Background cream:** `#F0EBE0` - elementi secondari
- **Accent cyan:** `#00D4FF` - accenti cyan
- **Accent magenta:** `#FF1493` - accenti magenta
- **Accent yellow:** `#FFD93D` - accenti gialli
- **Accent red:** `#FF4757` - errori/avvisi importanti
- **Accent orange:** `#FF7F50` - accenti arancio
- **Text navy:** `#1A1A2E` - testo principale

### Tipografia (Font Locali)
- **Titoli:** Font `Bangers` - stile comic/pop
- **Body:** Font `Comic Neue` (400, 700)
- **UI:** Font `Nunito` (400, 600, 700, 800)

### Componenti Ricorrenti Comic
- Border: `border-4 border-comic-navy`
- Shadow offset: `shadow-[4px_4px_0px_0px_#1A1A2E]`
- Border-radius: `rounded-xl` o `rounded-2xl`
- Hover: `hover:scale-105 transition-transform`

---

## PWA

### Caratteristiche
- **Installabile:** Banner di installazione nel Hero con raccomandazione per l'evento
- **Offline:** Service worker con caching di tutti gli asset
- **Banner dismiss:** Salvato in localStorage (`pwa-banner-dismissed`)

### File PWA
- `public/manifest.json` - manifest con nome, icone, theme color
- `public/sw.js` - service worker per caching offline
- `public/icon-192.svg`, `public/icon-512.svg` - icone installazione

### Banner Install
- Barra fissa in alto (`z-[999]`)
- Messaggio che consiglia l'installazione per l'evento
- Pulsante INSTALLA + pulsante "No grazie"
- Comparsa automatica se non ancora dismissato

---

## Sezioni Principali

### Hero
- Banner PWA install in alto
- Titolo GIOCO IN LOCO con effetti comic
- Date e location evento
- CTA buttons per Ludoteca, Area GDR, Area Hardcore

### Ludoteca (`/comicon-2026#ludoteca`)
- Ricerca giochi per nome
- Galleria orizzontale swipeable (2 righe x 4 colonne responsive)
- Card cliccabili con immagine, categoria, titolo, info
- Click apre modal con dettagli completi + "MAGGIORI INFO"

### Area GDR (`/comicon-2026#area-gdr`)
- Organizzata per giorno (Giovedi, Venerdi, Sabato, Domenica)
- Slot temporali con galleria orizzontale
- Card con titolo one-shot + rulebook
- Modal con descrizione, master, tavolo, slot

### Area HardCore (`/comicon-2026#area-hardcore`)
- Filtro per complessità: Tutti / Media / Alta / Molto Alta
- Galleria orizzontale swipeable
- Card con indicatore complessità (stelle)
- Modal con dettagli completi

### Chi Siamo (`/chi-siamo`)
- Lista delle 8 associazioni con card
- Click apre pagina dettaglio associazione

### Associazione Detail (`/associazione/:id`)
- Logo, bio, location, orari
- Link social (Instagram, Facebook, Website)

---

## GDPR Compliance

- **Font locali:** Nessuna richiesta a Google Fonts - tutti i font sono serviti da `/public/fonts/`
- **Nessun cookie:** Il sito non usa cookie di tracciamento
- **Nessun analytics:** Dati non raccolti
- **Link esterni:** I link social delle associazioni aprono in nuova tab

---

## Comandi

```bash
npm install          # Installa dipendenze
npm run dev          # Dev server su localhost:5173
npm run build        # Build produzione in /dist
npm run preview      # Preview build statico
```

---

## Convenzioni

- **Scroll:** navigazione smooth tra sezioni via `scrollIntoView({ behavior: 'smooth' })`
- **Sidebar:** toggle su mobile con stato `isOpen`, visibile sempre su desktop (`lg:translate-x-0`)
- **Galleria:** scroll orizzontale con frecce laterali, snap-x per allineamento
- **Card click:** apre modal con dettagli, chiusura con click su overlay o pulsante
- **Filtri:** complessità in AreaHardCore, ricerca in Ludoteca
