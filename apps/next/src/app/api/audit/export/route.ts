import { api, csv } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { flat } from '@/lib/list';
import { auditFilter } from '@/lib/queries/owner';
import { longDate, time12 } from '@/lib/util';

export const GET = api(async (req) => {
  await apiUser('owner');
  const { sql, p } = auditFilter(flat(Object.fromEntries(req.nextUrl.searchParams)));
  const rows = await db.all(sql, p);
  return csv('audit-log', ['Date', 'Time', 'User', 'Action', 'Entity', 'ID', 'Detail'], rows.map((r) => [longDate(r.at.slice(0, 10)), time12(r.at), r.username, r.action, r.entity, r.entity_id, r.detail]));
});
