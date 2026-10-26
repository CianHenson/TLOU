# Travel Assistance & Business Management System

Single Next.js app in `apps/next` (MySQL via XAMPP). See [apps/next/README.md](apps/next/README.md) for details.

## Run
1. Start MySQL in XAMPP.
2. `npm run install:app` (after pulls that change `apps/next/package.json`)
3. Copy `apps/next/.env.example` to `apps/next/.env.local` (first time only)
4. `npm run dev` -> http://localhost:3030

If the site looks stale after a pull, make sure no other process is using port 3030, then restart the dev server.
