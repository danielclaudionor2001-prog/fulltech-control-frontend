import React from 'react';
import { AlertCircle, Clock, MapPin, User } from 'lucide-react';

const STATUS_LABELS = {
  CANCELED: 'Cancelado',
  DONE: 'Concluido',
  IN_PROGRESS: 'Em Andamento',
  OPEN: 'Pendente',
};

const formatDateTime = (dateLike) => {
  if (!dateLike) {
    return 'Sem agendamento';
  }

  const parsedDate = new Date(dateLike);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Data invalida';
  }

  return parsedDate.toLocaleString('pt-BR');
};

export default function OSCard({
  os,
  isTechnician,
  onAssign,
  onClaim,
  onStatusUpdate,
}) {
  const statusLabel = os.statusLabel || STATUS_LABELS[os.status] || os.status;
  const technicianLabel =
    os.assignedTo?.name || os.assignedTo?.email || os.technicianId || null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pendente':
        return 'status-badge status-pending';
      case 'Em Andamento':
        return 'status-badge status-progress';
      case 'Concluido':
        return 'status-badge status-done';
      case 'Cancelado':
        return 'status-badge status-canceled';
      default:
        return 'status-badge';
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginRight: '0.75rem', flex: 1, minWidth: 0 }}>
          {os.identifier ? `#${os.identifier}` : `#${os.id.slice(0, 8)}`} - {os.customer}
        </h3>
        <span className={getStatusColor(statusLabel)} style={{ flexShrink: 0 }}>
          {statusLabel}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={16} />
          <span>{os.address || 'Endereco nao informado'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{os.description}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={16} />
          <span>{formatDateTime(os.scheduleAt)}</span>
        </div>
        {technicianLabel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={16} />
            <span>Tecnico: {technicianLabel}</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {isTechnician && !os.assignedToId && os.status === 'OPEN' && onClaim ? (
          <button className="btn btn-primary" onClick={() => onClaim(os.id)}>
            Assumir OS
          </button>
        ) : null}

        {isTechnician &&
        os.assignedToId &&
        os.status !== 'DONE' &&
        os.status !== 'CANCELED' &&
        onStatusUpdate ? (
          <button
            className="btn btn-primary"
            onClick={() => onStatusUpdate(os.id, 'DONE')}
          >
            Finalizar OS
          </button>
        ) : null}

        {!isTechnician && os.status === 'OPEN' && onAssign ? (
          <button className="btn btn-outline" onClick={() => onAssign(os.id)}>
            Marcar em andamento
          </button>
        ) : null}
      </div>
    </div>
  );
}
