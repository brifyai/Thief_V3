import { Metadata } from 'next';
import SystemHealthDashboard from '@/components/admin/SystemHealth';

export const metadata: Metadata = {
  title: 'System Health | Admin Dashboard',
  description: 'Real-time monitoring of system components and services',
};

export default function HealthPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <SystemHealthDashboard />
    </div>
  );
}