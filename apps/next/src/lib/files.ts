// Uploads live in apps/next/data/uploads (outside the web root) and are only served through authenticated route handlers.
import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const DATA_DIR = path.join(process.cwd(), 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
export const BACKUP_DIR = path.join(DATA_DIR, 'backups');
export const MAX_UPLOAD = 5 * 1024 * 1024;
const OK_MSG = 'Only PDF, JPG, PNG or Word files up to 5 MB are allowed.';

// extension -> [allowed browser mime types, magic-byte check]
const starts = (b: Buffer, hex: string) => b.subarray(0, hex.length / 2).toString('hex') === hex;
const ALLOWED: Record<string, { mime: string[]; magic: (b: Buffer) => boolean }> = {
  '.pdf': { mime: ['application/pdf'], magic: (b) => starts(b, '25504446') },
  '.jpg': { mime: ['image/jpeg'], magic: (b) => starts(b, 'ffd8ff') },
  '.jpeg': { mime: ['image/jpeg'], magic: (b) => starts(b, 'ffd8ff') },
  '.png': { mime: ['image/png'], magic: (b) => starts(b, '89504e47') },
  '.doc': { mime: ['application/msword'], magic: (b) => starts(b, 'd0cf11e0') },
  '.docx': { mime: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'], magic: (b) => starts(b, '504b0304') },
};

/** Validate and store an uploaded File. Returns { stored, original } or { error }. Returns null when no file was chosen. */
export async function saveUpload(file: FormDataEntryValue | undefined | null): Promise<{ stored: string; original: string } | { error: string } | null> {
  if (!file || typeof file === 'string' || file.size === 0) return null;
  const ext = path.extname(file.name).toLowerCase();
  const rule = ALLOWED[ext];
  if (!rule || !rule.mime.includes(file.type) || file.size > MAX_UPLOAD) return { error: OK_MSG };
  const buf = Buffer.from(await file.arrayBuffer());
  if (!rule.magic(buf)) return { error: OK_MSG };
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const stored = crypto.randomBytes(16).toString('hex') + ext;
  await fs.writeFile(path.join(UPLOAD_DIR, stored), buf);
  return { stored, original: path.basename(file.name).slice(0, 200) };
}

/** Download response for a stored upload (404 if missing). */
export async function sendStored(stored: string, original: string) {
  try {
    const buf = await fs.readFile(path.join(UPLOAD_DIR, path.basename(stored)));
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(original)}`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch { return new Response('File not found', { status: 404 }); }
}
