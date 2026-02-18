
import React from 'react';
import { MapPin, User, Clock, AlertCircle } from 'lucide-react';

export default function OSCard({ os, isTechnician, onStatusUpdate, onAssign }) {
    const getStatusColor = (status) => {
        switch (status) {
            case 'Pendente': return 'status-badge status-pending';
            case 'Em Andamento': return 'status-badge status-progress';
            case 'Concluído': return 'status-badge status-done';
            default: return 'status-badge';
        }
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>#{os.id} - {os.customer}</h3>
                <span className={getStatusColor(os.status)}>{os.status}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={16} />
                    <span>{os.address}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} />
                    <span>{os.description}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} />
                    <span>{new Date(os.createdAt).toLocaleDateString()}</span>
                </div>
                {os.technicianId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={16} />
                        <span>Téc: {os.technicianId}</span>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem' }}>
                {isTechnician && os.status !== 'Concluído' && (
                    <button
                        className="btn btn-primary"
                        onClick={() => onStatusUpdate(os.id, 'Concluído')}
                    >
                        Finalizar OS
                    </button>
                )}
                {!isTechnician && os.status === 'Pendente' && (
                    <button
                        className="btn btn-outline"
                        onClick={() => onAssign(os.id)}
                    >
                        Atribuir Técnico
                    </button>
                )}
            </div>
        </div>
    );
}
