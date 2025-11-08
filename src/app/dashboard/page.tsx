import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Redirigir al admin sites por defecto
  redirect('/dashboard/admin/sites');
}