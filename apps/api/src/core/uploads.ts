// Uploads are stored outside any public path and served only through authenticated routes (ported from routes/common.js).
import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { Response } from 'express';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(__dirname, '..', '..', 'data', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED: Record<string, string[]> = {
  '.pdf': ['application/pdf'], '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'], '.png': ['image/png'],
  '.doc': ['application/msword'], '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

/** multer options: random stored name, 5 MB, PDF/JPG/PNG/Word only. */
export const uploadOptions = {
  storage: diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (e: Error | null, ok: boolean) => void) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const ok = !!(ALLOWED[ext] && ALLOWED[ext].includes(file.mimetype));
    cb(ok ? null : new BadRequestException('Only PDF, JPG, PNG or Word files up to 5 MB are allowed.'), ok);
  },
};

export const discard = (file?: Express.Multer.File) => {
  if (file) fs.unlink(file.path, () => undefined);
};

export function sendStored(res: Response, stored: string, original: string) {
  const p = path.join(UPLOAD_DIR, path.basename(stored));
  if (!fs.existsSync(p)) return res.status(404).json({ statusCode: 404, message: 'File not found' });
  return res.download(p, original);
}
