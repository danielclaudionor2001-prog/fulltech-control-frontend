import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppAuth } from './useAppAuth';

function FullPageState({ children }) {
  return (
    <div className="page-state">
      <div className="page-state-card">{children}</div>
    </div>
  );
}

export default function RequireRole({ allowedRoles, children }) {
  const location = useLocation();
  const { appUser, isLoaded, isSignedIn, status } = useAppAuth();

  if (!isLoaded || status === 'loading') {
    return (
      <FullPageState>
        <div className="session-spinner" aria-hidden />
        <h2>Carregando acesso...</h2>
      </FullPageState>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (status !== 'ready' || !appUser) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(appUser.role)) {
    const fallbackPath = appUser.role === 'ADMIN' ? '/admin' : '/tech';
    return <Navigate to={fallbackPath} replace />;
  }

  return children ?? <Outlet />;
}
