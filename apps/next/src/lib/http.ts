// Route-handler helpers. Every mutating endpoint is wrapped in `api()`:
//  * same-origin check (CSRF defence on top of the SameSite=Lax session cookie),
//  * HttpError / unexpected errors -> JSON { ok:false, msg },
//  * all mutations are POST with multipart FormData sent by <ApiForm> (or fetch + FormData).
// JSON contract with the client:  { ok:true,  msg?, redirect? }  |  { ok:false, msg?, errors?: {field: message} }
import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { HttpError } from './auth';
import { toCsv, today } from './util';

export const ok = (msg?: string, extra: { redirect?: string; [k: string]: unknown } = {}) => NextResponse.json({ ok: true, msg, ...extra });
export const fail = (msg?: string, status = 400, errors?: Record<string, string>) => NextResponse.json({ ok: false, msg, errors }, { status });
/** Field-level validation failure (422). `msg` is the flash shown above the form. */
export const invalid = (errors: Record<string, string>, msg = 'Please fix the highlighted fields.') => fail(msg, 422, errors);

export const clientIp = (req: Request) =>
  (req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || null);

function sameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  try { return new URL(origin).host === host; } catch { return false; }
}

type Ctx = { params: Promise<Record<string, string>> };
/** Wrap a handler: `export const POST = api(async (req, ctx) => { ... return ok('Saved.') })`. */
export function api(fn: (req: NextRequest, ctx: Ctx) => Promise<Response>, opts: { csrf?: boolean } = {}) {
  return async (req: NextRequest, ctx: Ctx) => {
    try {
      if (opts.csrf !== false && !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !sameOrigin(req)) {
        throw new HttpError(403, 'Your session expired or the form was invalid. Refresh the page and try again.');
      }
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.message, e.status);
      console.error(e);
      return fail('Something went wrong. Please try again.', 500);
    }
  };
}

/** Plain-text form fields of a multipart/urlencoded request (File values are returned as-is). */
export async function form(req: Request) {
  const fd = await req.formData();
  const o: Record<string, FormDataEntryValue> = {};
  for (const [k, v] of fd.entries()) if (!(k in o)) o[k] = v;
  return { fd, b: o as Record<string, FormDataEntryValue | undefined> };
}

/** CSV download response. */
export const csv = (name: string, head: unknown[], rows: unknown[][]) =>
  new Response(toCsv(head, rows), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}-${today()}.csv"` },
  });
