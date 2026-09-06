import type { Metadata } from 'next';
import AdminDashboard from './dashboard';
export const metadata: Metadata = {
  title: 'Manage menu | Hilal Oven',
  robots: { index: false, follow: false },
};
export default function AdminPage() {
  return <AdminDashboard />;
}
