import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import BrandLoader from '../components/BrandLoader';
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
        <BrandLoader label="Carregando acesso..." />
      </FullPageState>
    );
  }

  if (!isSignedIn) {
    return <Navigate replace state={{ from: location.pathname }} to="/" />;
  }

  if (status !== 'ready' || !appUser) {
    return <Navigate replace to="/" />;
  }

  if (allowedRoles && !allowedRoles.includes(appUser.role)) {
    const fallbackPath = appUser.role === 'ADMIN' ? '/admin' : '/tech';
    return <Navigate replace to={fallbackPath} />;
  }

  return children ?? <Outlet />;
}
