// Logical backups: a plain .sql dump (INSERT statements for every table) written to data/backups, newest 30 kept.
import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { rawPool } from './db';
import { BACKUP_DIR } from './files';

const TABLES = ['settings', 'services', 'users', 'customers', 'requests', 'request_log', 'notes', 'bookings', 'payments', 'expenses',
  'documents', 'attendance', 'attendance_corrections', 'leaves', 'audit_logs', 'messages'];

export async function createBackup(label = 'auto') {
  const pool = await rawPool();
  let out = `-- TCAPS backup ${new Date().toISOString()}\nSET FOREIGN_KEY_CHECKS=0;\n`;
  for (const t of TABLES) {
    const [rows] = (await pool.query(`SELECT * FROM \`${t}\``)) as [Record<string, unknown>[], unknown];
    out += `\n-- ${t} (${rows.length} rows)\nDELETE FROM \`${t}\`;\n`;
    for (const r of rows) {
      const cols = Object.keys(r).map((c) => `\`${c}\``).join(',');
      out += `INSERT INTO \`${t}\` (${cols}) VALUES (${Object.values(r).map((v) => pool.escape(v)).join(',')});\n`;
    }
  }
  out += '\nSET FOREIGN_KEY_CHECKS=1;\n';
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const name = `tcaps-${label}-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
  await fs.writeFile(path.join(BACKUP_DIR, name), out, 'utf8');
  const files = (await listBackups()).reverse();
  while (files.length > 30) await fs.unlink(path.join(BACKUP_DIR, files.shift()!));
  return name;
}

/** Newest first. */
export async function listBackups() {
  try { return (await fs.readdir(BACKUP_DIR)).filter((f) => f.endsWith('.sql')).sort().reverse(); } catch { return []; }
}
export const backupPath = (name: string) => path.join(BACKUP_DIR, path.basename(name));
