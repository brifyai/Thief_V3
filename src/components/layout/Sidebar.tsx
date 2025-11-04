'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import {
  LayoutDashboard,
  Search,
  BookMarked,
  Settings,
  Newspaper,
  Bot,
  Database,
  Users,
  BarChart3,
  Target,
  TrendingUp,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ('admin' | 'user')[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'user'],
  },
  {
    title: 'Mis Fuentes',
    href: '/dashboard/my-sources',
    icon: Newspaper,
    roles: ['user'],
  },
  {
    title: 'Búsqueda IA',
    href: '/dashboard/ai-search',
    icon: Bot,
    roles: ['user'],
  },
  {
    title: 'Mis Artículos',
    href: '/dashboard/my-articles',
    icon: BookMarked,
    roles: ['user'],
  },
  {
    title: 'Monitor de Entidades',
    href: '/dashboard/entities',
    icon: Target,
    roles: ['user'],
  },
  {
    title: 'Panel Admin',
    href: '/dashboard/admin/overview',
    icon: BarChart3,
    roles: ['admin'],
  },
  {
    title: 'Sistema',
    href: '/dashboard/admin/system',
    icon: Settings,
    roles: ['admin'],
  },
  {
    title: 'Scraping',
    href: '/dashboard/admin/scraper',
    icon: Database,
    roles: ['admin'],
  },
  {
    title: 'Entidades',
    href: '/dashboard/admin/entities',
    icon: Target,
    roles: ['admin'],
  },
  {
    title: 'Usuarios',
    href: '/dashboard/admin/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    title: 'Caché',
    href: '/dashboard/admin/cache',
    icon: Search,
    roles: ['admin'],
  },
  {
    title: 'Colas',
    href: '/dashboard/admin/queues',
    icon: LayoutDashboard,
    roles: ['admin'],
  },
  {
    title: 'Tokens IA',
    href: '/dashboard/admin/ai-tokens',
    icon: TrendingUp,
    roles: ['admin'],
  },
  {
    title: 'Estadísticas',
    href: '/dashboard/admin/stats',
    icon: BarChart3,
    roles: ['admin'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user?.role || 'user')
  );

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Bot className="h-6 w-6 text-primary" />
          <span>AI Scraper</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
