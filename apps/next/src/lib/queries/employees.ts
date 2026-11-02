// User Management list query. Server-only.
import 'server-only';
import { orderBy, where } from '../list';
import { ROLE_LABELS } from '../types';
import { str } from '../util';

/** Role filter labels a viewer may pick: admins never see the owner account, so "Owner" is only offered to the owner. */
export const roleLabels = (viewerIsOwner: boolean) => Object.entries(ROLE_LABELS).filter(([k]) => viewerIsOwner || k !== 'owner').map(([, l]) => l);

/** Search text and the comma-separated role labels (Owner / Admin / Staff) from the URL. */
export function employeeFilters(q: Record<string, string>, viewerIsOwner: boolean) {
  const labels = roleLabels(viewerIsOwner);
  return { search: str(q.q, 60), roles: (q.role || '').split(',').filter((r) => labels.includes(r)), viewerIsOwner, sort: q.sort || '', dir: q.dir || '', group: q.group || '' };
}

/** Right-click "Sort by" / "Group by" keys → SQL (the table offers the same keys). */
const ROLE_ORDER = "FIELD(role,'owner','admin','employee')";
const SORTS = { name: 'name', role: ROLE_ORDER, designation: 'designation' };
const GROUPS = { role: `${ROLE_ORDER} ASC`, status: 'active DESC', designation: 'designation ASC' };

export function employeeQuery(f: ReturnType<typeof employeeFilters>): [string, unknown[]] {
  const w = where();
  if (!f.viewerIsOwner) w.add(`role!='owner'`);
  if (f.search) { const l = `%${f.search}%`; w.add('(name LIKE ? OR username LIKE ? OR emp_no LIKE ? OR designation LIKE ? OR email LIKE ?)', l, l, l, l, l); }
  const roles = Object.keys(ROLE_LABELS).filter((k) => f.roles.includes(ROLE_LABELS[k]));
  if (roles.length) w.add(`role IN (${roles.map(() => '?').join(',')})`, ...roles);
  // Explicit columns: these rows are sent to the browser, so never include password_hash.
  return [`SELECT id, emp_no, name, first_name, last_name, email, username, role, designation, active, can_expenses, can_messages, sched_start, sched_end, grace_min, break_min, workdays
    FROM users ${w.sql} ${orderBy({ sort: f.sort, dir: f.dir, group: f.group }, SORTS, GROUPS, `active DESC, ${ROLE_ORDER}, name`, 'name')}`, w.p];
}
