
import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import RequireRole from './auth/RequireRole';
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

function App() {
  return (
    <>
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
