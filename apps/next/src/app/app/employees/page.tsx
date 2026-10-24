import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Page } from '@/components/ui';

export const metadata = { title: 'Employee Management' };

export default async function Employees() {
  await requireUser('owner');
  const users = await db.all('SELECT * FROM users ORDER BY active DESC, name');
  return (
    <Page title="Employee Management">
      <p><Link className="btn alt" href="/app/employees/new">+ New employee</Link></p>
      <div className="tw"><table><thead><tr><th>No.</th><th>Name</th><th>Username</th><th>Role</th><th>Schedule</th><th>Grace</th><th>Expenses</th><th>Status</th><th></th></tr></thead><tbody>
        {users.map((u) => (
          <tr key={u.id} className={u.active ? '' : 'off'}><td>{u.emp_no}</td><td>{u.name}</td><td>{u.username}</td><td>{u.role}</td><td>{u.sched_start}–{u.sched_end}</td><td>{u.grace_min} min</td>
            <td>{u.can_expenses ? 'Yes' : 'No'}</td><td><span className={`badge ${u.active ? 'b-ok' : 'b-err'}`}>{u.active ? 'Active' : 'Deactivated'}</span></td><td><Link href={`/app/employees/${u.id}`}>Edit</Link></td></tr>
        ))}
      </tbody></table></div>
    </Page>
  );
}
