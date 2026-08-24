# OpenDoc

A Zocdoc-style doctor search and booking platform: patients search for doctors
by specialty, name, or medical aid/insurance and book real appointments;
doctors create a provider account, publish their availability, and securely
transfer patient files to other doctors on the platform.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS v4, client-side routed with React Router.
- **Backend:** Express API (`server/`) backed by SQLite (Node's built-in `node:sqlite`) — no external database needed.
- File uploads are stored on disk under `server/data/uploads` and served only to the uploading doctor or a doctor the file was transferred to.

## Running locally

```bash
npm install
npm run dev
```

This starts both the Express API (port 5175) and the Vite dev server (port 5173, proxying `/api` to the backend) via `concurrently`. Open http://localhost:5173.

The database is seeded automatically on first run with 36 demo doctors across all specialties (`server/seed.mjs`). The SQLite file and uploaded files live in `server/data/`, which is gitignored.

## Key flows

- **Patients:** search `/search?q=...` (filterable by specialty, medical aid, "accepting new patients"), view a doctor's profile, pick an open time slot, and book — no account required.
- **Doctors:** register at `/provider/signup` to appear in search immediately, then manage things from `/provider/dashboard`:
  - **Appointments** — see everyone who has booked with you.
  - **Schedule** — publish/remove open time slots patients can book.
  - **Patient Files** — upload a file for a patient and transfer it to another doctor on the platform (searchable by name/email); the receiving doctor sees it under "Received from other doctors" and can download it.

## Scripts

- `npm run dev` — run frontend + backend together
- `npm run dev:client` / `npm run dev:server` — run either alone
- `npm run build` — typecheck + production frontend build
- `npm run lint` — Oxlint
