import { UserButton } from '@clerk/clerk-react';
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Building2,
  Home,
  MapPin,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { useAppAuth } from '../auth/useAppAuth';

export default function Layout() {
  const location = useLocation();
  const { appUser, clerkUser } = useAppAuth();
  const isAdmin = appUser?.role === 'ADMIN';
  const isSupervisor = appUser?.role === 'SUPERVISOR';
  const operationalMapPath = isSupervisor ? '/supervisor/map' : '/tech/map';
  const operationalCreatePath = isSupervisor ? '/supervisor/create' : '';
  const roleLabel =
    appUser?.role === 'ADMIN'
      ? 'Administrador'
      : appUser?.role === 'SUPERVISOR'
        ? 'Supervisor'
        : 'Técnico';
  const displayName =
    appUser?.name ||
    clerkUser?.fullName ||
    clerkUser?.primaryEmailAddress?.emailAddress ||
    'Usuario';
  const tabs = isAdmin
    ? [
        { icon: Home, label: 'Inicio', to: '/admin' },
        { icon: Plus, label: 'Nova OS', to: '/admin/create' },
        { icon: MapPin, label: 'Mapa', to: '/admin/map' },
        { icon: Building2, label: 'Clientes', to: '/admin/customers' },
        { icon: ShieldCheck, label: 'Acessos', to: '/admin/access' },
      ]
    : [
        { icon: Home, label: 'Inicio', to: '/tech' },
        ...(isSupervisor
          ? [{ icon: Plus, label: 'Nova OS', to: operationalCreatePath }]
          : []),
        { icon: MapPin, label: 'Mapa', to: operationalMapPath },
      ];

  const isTabActive = (to) => {
    if (to === '/admin' || to === '/tech') {
      return location.pathname === to;
    }

    return location.pathname.startsWith(to);
  };

  return (
    <div className="layout">
      <header className="topbar">
        <Link
          to={isAdmin ? '/admin' : '/tech'}
          className="brand"
          aria-label="Fulltech Elevadores"
        >
          <img
            alt="Fulltech Elevadores"
            className="brand-logo"
            src="/brand/fulltech-wordmark.png"
          />
        </Link>

        <div className="topbar-side">
          <div className="nav-user">
            <div className="nav-user-copy">
              <span className="nav-user-name">{displayName}</span>
              <span className="nav-user-role">
                {roleLabel}
              </span>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <div className="tab-shell">
        <nav className="tab-nav" aria-label="Navegacao principal">
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

      <nav className="mobile-bottom-nav" aria-label="Navegacao principal mobile">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`mobile-bottom-link ${isTabActive(tab.to) ? 'active' : ''}`.trim()}
            >
              <Icon size={24} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
