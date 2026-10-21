# TCAPS – new stack (React + Vite + Tailwind / NestJS)

Runs alongside the original Express app in the repo root, which is untouched.

| App | Stack | Port |
|---|---|---|
| `apps/api` | NestJS 10 + TypeScript, JWT auth, Swagger at `/api/docs` | 3000 |
| `apps/web` | React 18 + TypeScript + Vite + Tailwind 3 + React Router + TanStack Query | 5173 (proxies `/api`) |

## Run (two terminals)
```
cd apps/api && npm install && npm run start:dev
cd apps/web && npm install && npm run dev
```
Open http://localhost:5173. Demo logins: `owner / owner123` (full access), `staff / staff123`.
Optional env for the API: `PORT`, `JWT_SECRET`, `WEB_ORIGIN`.

## Hardcoded data → real database
All data is in `apps/api/src/data/seed.ts`, served through the repository classes in
`apps/api/src/data/repositories.ts`. Controllers only call repository methods
(`findAll`, `findById`, `create`, `update`, `remove`), so to connect your database:
1. Make each repository query the database instead of its in-memory array.
2. Delete `seed.ts`.

Nothing in `apps/web` changes. Notes: money is integer centavos; changes made through the API reset on restart.

## Ported so far
Public site, request form, login + roles, requests, bookings (with the payable/balance rules from `lib/biz.js`),
payments (append-only, owner-only reverse), customers, owner dashboard.
Not yet ported: attendance, expenses, documents/uploads, audit log, employee management, content editing, reports.
