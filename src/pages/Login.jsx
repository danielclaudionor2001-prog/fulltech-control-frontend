
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCog, Wrench } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();

    const handleLogin = (role) => {
        localStorage.setItem('userRole', role);
        if (role === 'admin') {
            navigate('/admin');
        } else {
            navigate('/tech');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--background)' }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                <h1 style={{ marginBottom: '2rem', color: 'var(--primary)' }}>Fulltech Control</h1>
                <p style={{ marginBottom: '2rem', color: 'var(--text-light)' }}>Selecione seu perfil para entrar</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => handleLogin('admin')}>
                        <UserCog size={20} />
                        Administrador
                    </button>

                    <button className="btn btn-outline" style={{ justifyContent: 'center' }} onClick={() => handleLogin('tech')}>
                        <Wrench size={20} />
                        Técnico
                    </button>
                </div>
            </div>
        </div>
    );
}
