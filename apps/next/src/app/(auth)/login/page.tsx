import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { LoginForm } from './login-form';
import './login.css';

export const metadata = { title: 'Staff login' };

const FEATURES = ['Customer requests & bookings', 'Trip & ride scheduling', 'Attendance & leave', 'Financial reports'];

export default async function LoginPage() {
  if (await currentUser()) redirect('/app');
  return (
    <main className="lg">
      <div className="lg-hero">
        <p className="lg-kicker">Welcome back to</p>
        <h1>Staff <em>Workspace</em></h1>
        <hr />
        <p className="lg-lead">Handle customer requests, trips and staff records through one centralized workspace.</p>
        <ul>{FEATURES.map((f) => <li key={f}>{f}</li>)}</ul>
      </div>
      <LoginForm />
    </main>
  );
}
