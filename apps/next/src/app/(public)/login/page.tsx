import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { LoginForm } from '../_components/login-form';

export const metadata = { title: 'Staff login' };

export default async function LoginPage() {
  if (await currentUser()) redirect('/app');
  return <div className="wrap"><LoginForm /></div>;
}
