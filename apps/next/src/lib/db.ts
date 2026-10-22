// MySQL / MariaDB access (mysql2/promise). Server-only.
// `db.all / get / val / run` take plain SQL with `?` placeholders. Inside `tx()` the callback receives
// the same four methods bound to one transaction connection.
import 'server-only';
import mysql, { type Pool, type PoolConnection, type ResultSetHeader } from 'mysql2/promise';
import { ensureSchema } from './schema';
import type { Row } from './types';

export interface Db {
  all<T = Row>(sql: string, p?: unknown[]): Promise<T[]>;
  get<T = Row>(sql: string, p?: unknown[]): Promise<T | undefined>;
  /** First column of the first row (or null). */
  val<T = number>(sql: string, p?: unknown[]): Promise<T | null>;
  /** INSERT/UPDATE/DELETE. Returns the new auto-increment id and affected row count. */
  run(sql: string, p?: unknown[]): Promise<{ id: number; affected: number }>;
}

export const DB_NAME = process.env.DB_NAME || 'tcaps';
const cfg = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

const g = globalThis as unknown as { __tcapsPool?: Promise<Pool> };

async function openPool(): Promise<Pool> {
  // Create the database on first use (XAMPP's root user may do this), then open the pool and the schema.
  const boot = await mysql.createConnection(cfg);
  try { await boot.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`); } finally { await boot.end(); }
  const pool = mysql.createPool({
    ...cfg, database: DB_NAME, charset: 'utf8mb4', connectionLimit: 10,
    decimalNumbers: true,   // SUM() etc. come back as numbers, not strings
    dateStrings: true, namedPlaceholders: false,
  });
  await ensureSchema(bind(pool));
  return pool;
}
/** One pool per server process (survives dev hot reloads). */
const getPool = () => (g.__tcapsPool ??= openPool().catch((e) => { g.__tcapsPool = undefined; throw e; }));

const clean = (p: unknown[] = []) => p.map((v) => (v === undefined ? null : v));

function bind(x: Pool | PoolConnection): Db {
  const all = async <T = Row>(sql: string, p?: unknown[]) => (await x.query(sql, clean(p)))[0] as T[];
  return {
    all,
    get: async <T = Row>(sql: string, p?: unknown[]) => (await all<T>(sql, p))[0],
    val: async <T = number>(sql: string, p?: unknown[]) => {
      const r = (await all<Row>(sql, p))[0];
      return r ? (Object.values(r)[0] as T) : null;
    },
    run: async (sql, p) => {
      const h = (await x.query(sql, clean(p)))[0] as ResultSetHeader;
      return { id: h.insertId, affected: h.affectedRows };
    },
  };
}

export const db: Db = {
  all: async (sql, p) => bind(await getPool()).all(sql, p),
  get: async (sql, p) => bind(await getPool()).get(sql, p),
  val: async (sql, p) => bind(await getPool()).val(sql, p),
  run: async (sql, p) => bind(await getPool()).run(sql, p),
};

export async function tx<T>(fn: (d: Db) => Promise<T>): Promise<T> {
  const conn = await (await getPool()).getConnection();
  try {
    await conn.beginTransaction();
    const r = await fn(bind(conn));
    await conn.commit();
    return r;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally { conn.release(); }
}

/** Run a callback with SQL that must wait for the schema (used by backups). */
export const rawPool = () => getPool();
