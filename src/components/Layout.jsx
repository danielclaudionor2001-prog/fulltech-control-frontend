import { UserButton } from '@clerk/clerk-react';
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Building2,
  ClipboardList,
  MapPin,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { useAppAuth } from '../auth/useAppAuth';

export default function Layout() {
  const location = useLocation();
  const { appUser, clerkUser } = useAppAuth();
  const isAdmin = appUser?.role === 'ADMIN';
  const displayName =
    appUser?.name ||
    clerkUser?.fullName ||
    clerkUser?.primaryEmailAddress?.emailAddress ||
    'Usuário';
  const tabs = isAdmin
    ? [
        { icon: ClipboardList, label: 'OS', to: '/admin' },
        { icon: Plus, label: 'Nova OS', to: '/admin/create' },
        { icon: MapPin, label: 'Mapa', to: '/admin/map' },
        { icon: Building2, label: 'Clientes', to: '/admin/customers' },
        { icon: ShieldCheck, label: 'Acessos', to: '/admin/access' },
      ]
    : [{ icon: ClipboardList, label: 'Minhas OS', to: '/tech' }];

  const isTabActive = (to) => {
    if (to === '/admin' || to === '/tech') {
      return location.pathname === to;
    }

    return location.pathname.startsWith(to);
  };

  return (
    <div className="layout">
      <header className="topbar">
        <Link to={isAdmin ? '/admin' : '/tech'} className="brand">
          <span className="brand-kicker">Operação</span>
          <strong className="brand-title">Fulltech Control</strong>
        </Link>

        <div className="topbar-side">
          <div className="nav-user">
            <div className="nav-user-copy">
              <span className="nav-user-name">{displayName}</span>
              <span className="nav-user-role">
                {isAdmin ? 'Administrador' : 'Técnico'}
              </span>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <div className="tab-shell">
        <nav className="tab-nav" aria-label="Navegação principal">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`tab-link ${isTabActive(tab.to) ? 'active' : ''}`.trim()}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
