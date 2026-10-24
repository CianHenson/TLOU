# TCAPS â€“ Next.js rewrite

Travel assistance & business management system (Alchemist Trip & Ride). Single Next.js app: pages, API route handlers and
business rules in one project. A rewrite of the original Express/EJS/SQLite app in the repo root (and of the partial NestJS/React port in `apps/api` + `apps/web`).

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS v4 + the original design system (`src/app/theme.css`) |
| Charts | Recharts |
| Backend | Route Handlers in `src/app/api/**/route.ts` |
| Database | MySQL / MariaDB (XAMPP) via `mysql2/promise` |
| Security | Node `crypto`: scrypt password hashes, HMAC-SHA256 signed session cookie |

## Run
```
cd apps/next
npm install
cp .env.example .env.local     # DB_* settings (XAMPP defaults work); optional OWNER_PASSWORD
npm run dev                    # http://localhost:3030
```
Start MySQL in XAMPP first. The `tcaps` database, tables, default website content and the first owner account
(`owner`, random password printed in the console unless `OWNER_PASSWORD` is set; must be changed at first login) are created automatically.
Uploads and backups are written to `apps/next/data/` (git-ignored). A SQL backup is made at start-up and then daily.

## Layout
```
src/proxy.ts                 gate for /app/** (signed cookie present?)  â€“ real checks happen in requireUser()/apiUser()
src/instrumentation.ts       opens the DB at start-up, schedules the daily backup
src/lib/                     db, schema(+seed), auth/session/password, biz rules (money, finance, attendance), forms, util, list, files, backup, http
src/components/              ApiForm/Field/Submit, flash messages, shells, Page/Badge/Stat/SortTh/Pager, Notes, ClockCard ...
src/app/(public)/            public website, request form, login
src/app/app/**               staff + owner area (server components read MySQL directly)
src/app/api/**               route handlers: every mutation (POST, multipart FormData), CSV exports, file downloads
```

## Conventions (read before adding a feature)
- **Reads**: pages are async Server Components that call `db.all/get/val` (`src/lib/db.ts`) directly. Put reusable queries in `src/lib/queries/<area>.ts`. Every page starts with `await requireUser()` (or `'owner'`/`'expenses'`) from `@/lib/auth`; `searchParams`/`params` are Promises in Next 16.
- **Writes**: client forms use `<ApiForm action="/api/...">` (`@/components/form`) which POSTs `FormData` to a route handler and reacts to the JSON contract
  `{ ok:true, msg?, redirect? } | { ok:false, msg?, errors?:{field:message} }`. Inside, use `<Field name label .../>` (shows `errors[name]`) and `<Submit>` (spinner + optional `confirm`).
  Route handlers are `export const POST = api(async (req, ctx) => { const user = await apiUser('owner'); const { b, fd } = await form(req); ... return ok('Saved.', { redirect: '/app/x' }) })` (`@/lib/http`): same-origin check + error mapping included. Validation failures: `return invalid({ field: 'message' })`.
- **Money** is integer centavos everywhere (`toCents`, `peso`, `plain` in `@/lib/util`); timestamps are Manila `'YYYY-MM-DD HH:mm:ss'` strings from `now()`; days are `'YYYY-MM-DD'`. Never use `new Date()` for stored values.
- **SQL**: MariaDB. Derived tables need aliases, use `GREATEST(0,x)` not `MAX(0,x)`, `<=>` for NULL-safe equality, and `SUBSTR(col,1,10)`.
- **Audit**: `await audit({ user, ip: clientIp(req) }, 'action', 'entity', id, detail)` for every important change (same actions as the original app).
- **Files**: uploads via `saveUpload()`/`sendStored()` in `@/lib/files`; never served statically.
- **Pages** under `/app` wrap their content in `<Page title="...">` (topbar + flash). Re-use the CSS classes from `theme.css` (`card`, `grid g2`, `tw`, `badge b-ok`, `filters`, `kv`, `stats`, ...).

