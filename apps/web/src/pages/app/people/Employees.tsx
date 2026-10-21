import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { get } from '../../../lib/api';
import { usePageTitle } from '../../../lib/title';
import type { PublicUser } from './shared';

export default function Employees() {
  usePageTitle('Employee Management');
  const { data: users } = useQuery({ queryKey: ['employees'], queryFn: () => get<PublicUser[]>('/employees') });
  if (!users) return <p className="muted">Loading…</p>;
  return (
    <>
      <p><Link className="btn alt" to="/app/employees/new">+ New employee</Link></p>
      <div className="tw"><table>
        <thead><tr><th>No.</th><th>Name</th><th>Username</th><th>Role</th><th>Schedule</th><th>Grace</th><th>Expenses</th><th>Status</th><th /></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={u.active ? '' : 'off'}>
              <td>{u.emp_no}</td><td>{u.name}</td><td>{u.username}</td><td>{u.role}</td><td>{u.sched_start}–{u.sched_end}</td><td>{u.grace_min} min</td>
              <td>{u.can_expenses ? 'Yes' : 'No'}</td>
              <td><span className={`badge ${u.active ? 'b-ok' : 'b-err'}`}>{u.active ? 'Active' : 'Deactivated'}</span></td>
              <td><Link to={`/app/employees/${u.id}`}>Edit</Link></td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}
