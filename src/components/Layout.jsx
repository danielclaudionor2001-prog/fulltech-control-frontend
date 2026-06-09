import { UserButton } from '@clerk/clerk-react';
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Building2, List, MapPin, Plus, ShieldCheck } from 'lucide-react';
import { useAppAuth } from '../auth/useAppAuth';

export default function Layout() {
  const location = useLocation();
  const { appUser, clerkUser } = useAppAuth();
  const isAdmin = appUser?.role === 'ADMIN';
  const displayName =
    appUser?.name ||
    clerkUser?.fullName ||
    clerkUser?.primaryEmailAddress?.emailAddress ||
    'Usuario';

  return (
    <div className="layout">
      <nav className="navbar">
        <Link to={isAdmin ? '/admin' : '/tech'} className="brand">
          Fulltech Control
        </Link>

        <div className="nav-links">
          {isAdmin ? (
            <>
              <Link
                to="/admin"
                className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
              >
                <List size={20} /> <span className="d-none-mobile">OS</span>
              </Link>
              <Link
                to="/admin/create"
                className={`nav-link ${location.pathname === '/admin/create' ? 'active' : ''}`}
              >
                <Plus size={20} /> <span className="d-none-mobile">Nova OS</span>
              </Link>
              <Link
                to="/admin/map"
                className={`nav-link ${location.pathname === '/admin/map' ? 'active' : ''}`}
              >
                <MapPin size={20} /> <span className="d-none-mobile">Mapa</span>
              </Link>
              <Link
                to="/admin/customers"
                className={`nav-link ${location.pathname === '/admin/customers' ? 'active' : ''}`}
              >
                <Building2 size={20} /> <span className="d-none-mobile">Clientes</span>
              </Link>
              <Link
                to="/admin/access"
                className={`nav-link ${location.pathname === '/admin/access' ? 'active' : ''}`}
              >
                <ShieldCheck size={20} /> <span className="d-none-mobile">Acessos</span>
              </Link>
            </>
          ) : (
            <Link
              to="/tech"
              className={`nav-link ${location.pathname === '/tech' ? 'active' : ''}`}
            >
              <List size={20} /> <span className="d-none-mobile">Minhas OS</span>
            </Link>
          )}

          <div className="nav-user">
            <div className="nav-user-copy">
              <span className="nav-user-name">{displayName}</span>
              <span className="nav-user-role">
                {isAdmin ? 'Administrador' : 'Tecnico'}
              </span>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
