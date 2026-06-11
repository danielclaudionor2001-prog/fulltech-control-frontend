import React from 'react';
import { AlertCircle, Clock, MapPin, User } from 'lucide-react';

const STATUS_LABELS = {
  CANCELED: 'Cancelado',
  DONE: 'Concluído',
  IN_PROGRESS: 'Em Andamento',
  OPEN: 'Pendente',
};

const formatDateTime = (dateLike) => {
  if (!dateLike) {
    return 'Sem agendamento';
  }

  const parsedDate = new Date(dateLike);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Data inválida';
  }

  return parsedDate.toLocaleString('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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
      case 'Concluído':
        return 'status-badge status-done';
      case 'Cancelado':
        return 'status-badge status-canceled';
      default:
        return 'status-badge';
    }
  };

  return (
    <article className="card os-card">
      <div className="os-card-header">
        <div className="os-card-copy">
          <span className="os-card-overline">Ordem de serviço</span>
          <h3 className="os-card-title">
            {os.identifier ? `#${os.identifier}` : `#${os.id.slice(0, 8)}`} - {os.customer}
          </h3>
        </div>

        <span className={getStatusColor(statusLabel)}>
          {statusLabel}
        </span>
      </div>

      <div className="os-card-body">
        <div className="os-card-meta-item">
          <MapPin size={16} />
          <span>{os.address || 'Endereço não informado'}</span>
        </div>

        <div className="os-card-meta-item">
          <AlertCircle size={16} />
          <span>{os.description}</span>
        </div>

        <div className="os-card-meta-item">
          <Clock size={16} />
          <span>{formatDateTime(os.scheduleAt)}</span>
        </div>

        {technicianLabel ? (
          <div className="os-card-meta-item">
            <User size={16} />
            <span>Técnico: {technicianLabel}</span>
          </div>
        ) : null}
      </div>

      <div className="os-card-actions">
        {isTechnician && os.status === 'OPEN' && onClaim ? (
          <button className="btn btn-primary" onClick={() => onClaim(os.id)}>
            {os.assignedToId ? 'Iniciar OS' : 'Assumir OS'}
          </button>
        ) : null}

        {isTechnician &&
        os.assignedToId &&
        os.status === 'IN_PROGRESS' &&
        onStatusUpdate ? (
          <button
            className="btn btn-primary"
            onClick={() => onStatusUpdate(os.id, 'DONE')}
          >
            Finalizar OS
          </button>
        ) : null}

        {!isTechnician && os.status === 'OPEN' && onAssign ? (
          <button className="btn btn-secondary" onClick={() => onAssign(os.id)}>
            Marcar em andamento
          </button>
        ) : null}
      </div>
    </article>
  );
}
