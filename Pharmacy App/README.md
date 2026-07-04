# Pharmacy App

Offline-first stock-and-revenue accountability PWA for a retail pharmacy, built from the v2.0 build documentation: FEFO batch tracking, atomic sales with frozen prices, void with exact batch restoration, bidirectional signed stock adjustments, owner price editing, cash reconciliation at close-out, and a full activity log.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL on a phone-sized viewport. A demo dataset seeds automatically on first run:

- **Owner** — PIN `1111` (full access)
- **Apprentice** — PIN `2222` (sell + view stock + own sales only)

Demo stock includes an already-expired batch, a batch expiring within 7 days, one within 30 days, and a low-stock item, so every alert and FEFO path can be exercised immediately.

## Sync / backup server (optional)

A minimal Node/Express server provides last-write-wins backup so a lost or broken device never loses the business record:

```bash
cd server
npm install
npm start   # listens on :8787
```

The app pushes a full snapshot to it after every write (best-effort, silently skipped when offline) and restores from it automatically if a device starts with an empty local database. Point the client at a different server with `VITE_SYNC_URL` in a `.env` file.

## Build

```bash
npm run build
```

Outputs an installable PWA to `dist/`.
