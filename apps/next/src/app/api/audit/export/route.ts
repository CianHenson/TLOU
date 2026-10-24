import { api, csv } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { flat } from '@/lib/list';
import { auditFilter } from '@/lib/queries/owner';

export const GET = api(async (req) => {
  await apiUser('owner');
  const { sql, p } = auditFilter(flat(Object.fromEntries(req.nextUrl.searchParams)));
  const rows = await db.all(sql, p);
  return csv('audit-log', ['Time', 'User', 'Action', 'Entity', 'ID', 'Detail', 'IP'], rows.map((r) => [r.at, r.username, r.action, r.entity, r.entity_id, r.detail, r.ip]));
});
