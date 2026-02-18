
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { MapPin, List, Plus, User } from 'lucide-react';

export default function Layout() {
    const location = useLocation();
    const isTechnician = location.pathname.includes('tech');

    return (
        <div className="layout">
            <nav className="navbar">
                <Link to="/" className="brand">Fulltech Control</Link>
                <div className="nav-links">
                    {!isTechnician ? (
                        <>
                            <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
                                <List size={20} /> <span className="d-none-mobile">OS</span>
                            </Link>
                            <Link to="/admin/create" className={`nav-link ${location.pathname === '/admin/create' ? 'active' : ''}`}>
                                <Plus size={20} /> <span className="d-none-mobile">Nova OS</span>
                            </Link>
                            <Link to="/admin/map" className={`nav-link ${location.pathname === '/admin/map' ? 'active' : ''}`}>
                                <MapPin size={20} /> <span className="d-none-mobile">Mapa</span>
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link to="/tech" className={`nav-link ${location.pathname === '/tech' ? 'active' : ''}`}>
                                <List size={20} /> <span className="d-none-mobile">Minhas OS</span>
                            </Link>
                        </>
                    )}
                    <Link to="/" className="nav-link">
                        <User size={20} /> <span className="d-none-mobile">Sair</span>
                    </Link>
                </div>
            </nav>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
