# CheckOut PWA

Mobile-first PWA für 501 Darts (Vereins-/Liga-Nutzung) mit Vue 3 + TypeScript. Fokus liegt aktuell auf einem spielbaren 501 Game Screen inkl. Bust/Double-Out und Undo.

## Setup

### Lokal (Frontend)

```bash
npm install
npm run dev
```

### Online-Modus (Supabase)

1. Supabase-Projekt erstellen
2. SQL aus `supabase/schema.sql` im SQL Editor ausführen
3. `.env` anlegen:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

4. App starten und registrieren

## Scripts

- `npm run dev` – lokale Entwicklung
- `npm run build` – Produktionsbuild
- `npm run preview` – Build lokal ansehen
- `npm run test` – Vitest (optional)

## Projektstruktur

- `src/pages/` – Seiten (Home, Game, Turniere, Stats)
- `src/components/` – UI-Komponenten (Scoreboard, Keypad, TurnHistory, CheckoutSuggestions)
- `src/stores/` – Pinia Stores (Game-Logik, später Turniere/Stats)
- `src/domain/` – Domain-Logik (Game Rules, Checkout Table, Stats Calculators)
- `src/services/db/` – Dexie/IndexedDB Setup
- `src/styles/` – Tailwind + Design Tokens (Figma Theme)

## Implementierter Scope (Stand)

- Vite + Vue 3 + TypeScript + Router + Pinia + PWA + Tailwind v4
- Auth UI (Supabase Login/Registrierung) nach Figma, App-Branding auf CheckOut
- Game Screen mit zwei Spielern (501, Double-Out)
- Bust-Regeln inkl. Score-Rollback und Turn-Protokoll (301/501/701)
- Undo der letzten Aufnahme
- Checkout-Suggestions für Scores ≤ 170
- Match-Finish Statistik + „Letzte Spiele“ Dashboard
- Turniere lokal (Round Robin, K.O., Kombi inkl. Gruppen)
- Turniere online (Supabase, Invite-Codes, Match-Status)

## Hinweise

- Double-Out Bestätigung erfolgt aktuell per Dialog, wenn ein Checkout möglich ist.
- Die Checkout-Vorschläge werden algorithmisch generiert (gängige Priorisierung), um alle Werte von 170–2 abzudecken.
- Online-Turniere benötigen Supabase + RLS Policies aus `supabase/schema.sql`.

## Nächste Schritte

- Realtime-Updates (Supabase Realtime Channels)
- Turnier-Detail: Match-Status live aktualisieren
- Langzeit-Statistiken und Leaderboards (über mehrere Turniere)
- Pixel-Feinschliff anhand Figma (Spacing/Typo/Komponenten)
