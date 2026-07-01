import { useAuth } from '@clerk/clerk-react';
import React, { useEffect, useMemo, useRef } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import RequireRole from './auth/RequireRole';
import { useAppAuth } from './auth/useAppAuth';
import Layout from './components/Layout';
import SessionLocationPrompt from './components/SessionLocationPrompt';
import AccessListPage from './pages/AccessListPage';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import CustomersPage from './pages/CustomersPage';
import ReportsPage from './pages/ReportsPage';
import SignUpPage from './pages/SignUpPage';
import TechnicianDashboard from './pages/TechnicianDashboard';
import OSForm from './pages/OSForm';
import MapPage from './pages/MapPage';
import { sendUserActivityLog } from './utils/activityLogSupport';

const APP_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID || 'development';

const PAGE_LABELS = {
  '/': 'login',
  '/admin': 'inicio do administrador',
  '/admin/access': 'acessos',
  '/admin/create': 'nova OS',
  '/admin/customers': 'clientes',
  '/admin/map': 'mapa',
  '/admin/reports': 'relatorios',
  '/sign-up': 'cadastro',
  '/supervisor/create': 'nova OS do supervisor',
  '/supervisor/map': 'mapa do supervisor',
  '/tech': 'inicio do tecnico',
  '/tech/map': 'mapa do tecnico',
};

const RECENT_LOG_TTL_MS = 2000;

function shouldSkipRecentLog(key) {
  try {
    const storageKey = `fulltech.activity.recent.${key}`;
    const now = Date.now();
    const previous = Number(sessionStorage.getItem(storageKey));

    if (Number.isFinite(previous) && now - previous < RECENT_LOG_TTL_MS) {
      return true;
    }

    sessionStorage.setItem(storageKey, String(now));
  } catch {
    return false;
  }

  return false;
}

function ActivityRouteLogger() {
  const { getToken, isSignedIn, sessionId, userId } = useAuth();
  const { appUser, status } = useAppAuth();
  const location = useLocation();
  const lastPageLogKeyRef = useRef('');
  const currentPath = `${location.pathname}${location.search || ''}`;
  const pageLabel = useMemo(
    () => PAGE_LABELS[location.pathname] || location.pathname || 'pagina',
    [location.pathname],
  );

  useEffect(() => {
    if (!isSignedIn || status !== 'ready' || !sessionId || !appUser?.id) {
      return;
    }

    const storageKey = `fulltech.activity.login.${sessionId}`;

    try {
      if (sessionStorage.getItem(storageKey)) {
        return;
      }

      sessionStorage.setItem(storageKey, '1');
    } catch {
      if (lastPageLogKeyRef.current === `login:${sessionId}`) {
        return;
      }

      lastPageLogKeyRef.current = `login:${sessionId}`;
    }

    sendUserActivityLog(
      {
        event: 'auth.login',
        message: 'Login validado no sistema.',
        metadata: {
          appBuildId: APP_BUILD_ID,
          clerkUserId: appUser.clerkUserId ?? userId,
          email: appUser.email,
          path: currentPath,
          role: appUser.role,
          userAgent: navigator.userAgent,
          viewport: {
            height: window.innerHeight,
            width: window.innerWidth,
          },
        },
        source: 'auth',
      },
      getToken,
    ).catch((error) => {
      console.warn('Failed to record login activity', error);
    });
  }, [
    appUser?.clerkUserId,
    appUser?.email,
    appUser?.id,
    appUser?.role,
    currentPath,
    getToken,
    isSignedIn,
    sessionId,
    status,
    userId,
  ]);

  useEffect(() => {
    if (!isSignedIn || status !== 'ready' || !sessionId || !appUser?.id) {
      return;
    }

    const logKey = `${sessionId}:${currentPath}`;

    if (
      lastPageLogKeyRef.current === logKey ||
      shouldSkipRecentLog(`page.${logKey}`)
    ) {
      return;
    }

    lastPageLogKeyRef.current = logKey;

    sendUserActivityLog(
      {
        event: 'navigation.page_view',
        message: `Entrou na pagina ${pageLabel}.`,
        metadata: {
          appBuildId: APP_BUILD_ID,
          email: appUser.email,
          pageLabel,
          path: currentPath,
          referrer: document.referrer || null,
          role: appUser.role,
          search: location.search || null,
          visibilityState: document.visibilityState,
        },
        source: 'navigation',
      },
      getToken,
    ).catch((error) => {
      console.warn('Failed to record page activity', error);
    });
  }, [
    appUser?.email,
    appUser?.id,
    appUser?.role,
    currentPath,
    getToken,
    isSignedIn,
    location.search,
    pageLabel,
    sessionId,
    status,
  ]);

  return null;
}

function App() {
  return (
    <>
      <ActivityRouteLogger />
      <SessionLocationPrompt />

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route element={<RequireRole><Layout /></RequireRole>}>
          <Route
            path="/admin"
            element={(
              <RequireRole allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </RequireRole>
            )}
          />
          <Route
            path="/admin/create"
            element={(
              <RequireRole allowedRoles={['ADMIN']}>
                <OSForm />
              </RequireRole>
            )}
          />
          <Route
            path="/supervisor/create"
            element={(
              <RequireRole allowedRoles={['SUPERVISOR']}>
                <OSForm />
              </RequireRole>
            )}
          />
          <Route
            path="/admin/map"
            element={(
              <RequireRole allowedRoles={['ADMIN']}>
                <MapPage />
              </RequireRole>
            )}
          />
          <Route
            path="/supervisor/map"
            element={(
              <RequireRole allowedRoles={['SUPERVISOR']}>
                <MapPage />
              </RequireRole>
            )}
          />
          <Route
            path="/tech/map"
            element={(
              <RequireRole allowedRoles={['SUPERVISOR', 'TECH']}>
                <MapPage />
              </RequireRole>
            )}
          />
          <Route
            path="/admin/customers"
            element={(
              <RequireRole allowedRoles={['ADMIN']}>
                <CustomersPage />
              </RequireRole>
            )}
          />
          <Route
            path="/admin/access"
            element={(
              <RequireRole allowedRoles={['ADMIN']}>
                <AccessListPage />
              </RequireRole>
            )}
          />
          <Route
            path="/admin/reports"
            element={(
              <RequireRole allowedRoles={['ADMIN']}>
                <ReportsPage />
              </RequireRole>
            )}
          />
          <Route
            path="/tech"
            element={(
              <RequireRole allowedRoles={['SUPERVISOR', 'TECH']}>
                <TechnicianDashboard />
              </RequireRole>
            )}
          />
          <Route
            path="/tech/create"
            element={(
              <RequireRole allowedRoles={['ADMIN']}>
                <Navigate replace to="/admin/create" />
              </RequireRole>
            )}
          />
        </Route>
      </Routes>
    </>
  );
}

export default App;
