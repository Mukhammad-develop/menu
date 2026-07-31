import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import LoginForm from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  // Already authenticated? Go straight to the dashboard.
  if (cookies().get('menu_admin')?.value === '1') {
    redirect('/admin');
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-6">
      <LoginForm />
    </main>
  );
}
