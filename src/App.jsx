
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import TechnicianDashboard from './pages/TechnicianDashboard';
import OSForm from './pages/OSForm';
import MapPage from './pages/MapPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/create" element={<OSForm />} />
        <Route path="/admin/map" element={<MapPage />} />
        <Route path="/tech" element={<TechnicianDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
