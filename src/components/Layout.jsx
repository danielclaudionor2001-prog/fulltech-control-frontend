import { UserButton } from '@clerk/clerk-react';
import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  Home,
  MapPin,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAppAuth } from '../auth/useAppAuth';

export default function Layout() {
  const location = useLocation();
  const { appUser, clerkUser } = useAppAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
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
  const avatarUrl = appUser?.imageUrl || clerkUser?.imageUrl || '';
  const adminTabs = [
    { icon: Home, label: 'Inicio', to: '/admin' },
    { icon: Plus, label: 'Nova OS', to: '/admin/create' },
    { icon: MapPin, label: 'Mapa', to: '/admin/map' },
    { icon: Building2, label: 'Clientes', to: '/admin/customers' },
    { icon: ShieldCheck, label: 'Acessos', to: '/admin/access' },
    { icon: BarChart3, label: 'Relatorios', to: '/admin/reports' },
  ];
  const operationalTabs = [
    { icon: Home, label: 'Inicio', to: '/tech' },
    ...(isSupervisor
      ? [{ icon: Plus, label: 'Nova OS', to: operationalCreatePath }]
      : []),
    { icon: MapPin, label: 'Mapa', to: operationalMapPath },
  ];
  const tabs = isAdmin ? adminTabs : operationalTabs;

  const isTabActive = (to) => {
    if (to === '/admin' || to === '/tech') {
      return location.pathname === to;
    }

    return location.pathname.startsWith(to);
  };

  const activeTab = tabs.find((tab) => !tab.disabled && isTabActive(tab.to));
  const currentTitle = activeTab?.label || (isAdmin ? 'Inicio' : 'Painel');
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);
  const notifications = isAdmin
    ? [
        {
          description: 'Acompanhe as ordens que ainda nao receberam inicio.',
          title: 'OS pendentes',
          tone: 'warning',
        },
        {
          description: 'Verifique os atendimentos em campo e suas localizacoes.',
          title: 'Equipe em atendimento',
          tone: 'info',
        },
        {
          description: 'Relatorios podem ser filtrados e exportados em Excel.',
          title: 'Relatorios disponiveis',
          tone: 'success',
        },
      ]
    : [
        {
          description: 'Confira as ordens atribuidas ao seu perfil.',
          title: 'Minhas OS',
          tone: 'info',
        },
      ];

  return (
    <div
      className={`app-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${
        isMobileSidebarOpen ? 'sidebar-open' : ''
      }`.trim()}
    >
      <button
        aria-label="Fechar menu"
        className="sidebar-backdrop"
        onClick={closeMobileSidebar}
        type="button"
      />

      <aside className="app-sidebar" aria-label="Menu principal">
        <div className="sidebar-top">
          <Link
            to={isAdmin ? '/admin' : '/tech'}
            className="sidebar-brand"
            aria-label="Fulltech Elevadores"
            onClick={closeMobileSidebar}
          >
            <img
              alt="Fulltech Elevadores"
              className="sidebar-brand-logo"
              src="/brand/fulltech-wordmark.png"
            />
          </Link>

          <button
            aria-label="Fechar menu"
            className="sidebar-mobile-close"
            onClick={closeMobileSidebar}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = !tab.disabled && isTabActive(tab.to);
            const className = `sidebar-link ${isActive ? 'active' : ''} ${
              tab.disabled ? 'is-disabled' : ''
            }`.trim();

            if (tab.disabled) {
              return (
                <button className={className} key={tab.to} type="button">
                  <Icon size={21} />
                  <span>{tab.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={className}
                onClick={closeMobileSidebar}
              >
                <Icon size={21} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-collapse-button"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            type="button"
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
            <span>{isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}</span>
          </button>
        </div>
      </aside>

      <div className="app-main-shell">
        <header className="app-topbar">
          <div className="topbar-title-group">
            <button
              aria-label="Abrir menu"
              className="topbar-icon-button"
              onClick={() => setIsMobileSidebarOpen(true)}
              type="button"
            >
              <Menu size={22} />
            </button>
            <h2>{currentTitle}</h2>
          </div>

          <div className="topbar-search">
            <Search size={18} />
            <input placeholder="Buscar OS, clientes, equipamentos..." type="search" />
          </div>

          <div className="topbar-user-area">
            <div className="notification-wrapper">
              <button
                aria-expanded={isNotificationsOpen}
                aria-label="Notificacoes"
                className="topbar-icon-button notification-button"
                onClick={() => setIsNotificationsOpen((current) => !current)}
                type="button"
              >
                <Bell size={20} />
                <span>{notifications.length}</span>
              </button>

              {isNotificationsOpen ? (
                <div className="notification-panel" role="dialog">
                  <div className="notification-panel-header">
                    <strong>Notificacoes</strong>
                    <small>Atualizacoes rapidas da operacao</small>
                  </div>

                  <div className="notification-list">
                    {notifications.map((notification) => (
                      <div
                        className={`notification-item notification-${notification.tone}`}
                        key={notification.title}
                      >
                        <span className="notification-dot" />
                        <div>
                          <strong>{notification.title}</strong>
                          <p>{notification.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="topbar-user-card">
              <div className="topbar-avatar" aria-hidden="true">
                {avatarUrl ? (
                  <img alt="" src={avatarUrl} />
                ) : (
                  <span>{initials || 'U'}</span>
                )}
              </div>
              <div className="topbar-user-copy">
                <strong>{displayName}</strong>
                <span>{roleLabel}</span>
              </div>
              <ChevronDown size={16} />
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
