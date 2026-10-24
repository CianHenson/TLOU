// Runs once when the Next.js server starts: initialise the database and schedule the daily automatic backup.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { db } = await import('./lib/db');
  const { createBackup } = await import('./lib/backup');
  await db.val('SELECT 1'); // opens the pool, creates the database / tables and the first-run owner account
  const run = () => createBackup('auto').catch((e) => console.error('backup failed', e));
  void run();
  setInterval(run, 24 * 3600 * 1000).unref();
}
