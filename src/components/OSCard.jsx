import React, { useState } from 'react';
import {
  AlertCircle,
  Clock,
  Download,
  FileText,
  MapPin,
  User,
} from 'lucide-react';
import OSDetailsModal from './OSDetailsModal';
import {
  formatServiceOrderDateTime,
  getServiceOrderStatusLabel,
} from '../utils/serviceOrderStatus';
import { downloadServiceOrderPdf } from '../utils/serviceOrderPdf';

const getStatusClassName = (status) => {
  switch (status) {
    case 'OPEN':
      return 'status-badge status-pending';
    case 'IN_PROGRESS':
      return 'status-badge status-progress';
    case 'DONE':
      return 'status-badge status-done';
    case 'CANCELED':
      return 'status-badge status-canceled';
    default:
      return 'status-badge';
  }
};

export default function OSCard({
  isTechnician,
  onAssign,
  onClaim,
  onStatusUpdate,
  os,
}) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const statusLabel = os.statusLabel || getServiceOrderStatusLabel(os.status);
  const technicianLabel =
    os.assignedTo?.name || os.assignedTo?.email || os.technicianId || null;

  const handleAdminProgress = () => {
    if (onStatusUpdate) {
      onStatusUpdate(os.id, 'IN_PROGRESS');
      return;
    }

    onAssign?.(os.id);
  };

  const handlePdfDownload = async () => {
    try {
      await downloadServiceOrderPdf(os);
    } catch (error) {
      console.error('Failed to generate service order PDF', error);
      window.alert('Nao foi possivel gerar o PDF da OS agora.');
    }
  };

  return (
    <>
      <article className="card os-card">
        <div className="os-card-header">
          <div className="os-card-copy">
            <span className="os-card-overline">Ordem de servico</span>
            <h3 className="os-card-title">
              {os.identifier ? `#${os.identifier}` : `#${os.id.slice(0, 8)}`} - {os.customer}
            </h3>
          </div>

          <span className={getStatusClassName(os.status)}>{statusLabel}</span>
        </div>

        <div className="os-card-body">
          <div className="os-card-meta-item">
            <MapPin size={16} />
            <span>{os.address || 'Endereco nao informado'}</span>
          </div>

          <div className="os-card-meta-item">
            <AlertCircle size={16} />
            <span>{os.description}</span>
          </div>

          <div className="os-card-meta-item">
            <Clock size={16} />
            <span>{formatServiceOrderDateTime(os.scheduleAt)}</span>
          </div>

          {technicianLabel ? (
            <div className="os-card-meta-item">
              <User size={16} />
              <span>Responsavel: {technicianLabel}</span>
            </div>
          ) : null}
        </div>

        <div className="os-card-actions">
          <button
            className="btn btn-outline"
            onClick={() => setIsDetailsOpen(true)}
            type="button"
          >
            <FileText size={18} />
            Ver dados
          </button>

          {os.status === 'DONE' ? (
            <button className="btn btn-primary" onClick={handlePdfDownload} type="button">
              <Download size={18} />
              Baixar PDF
            </button>
          ) : null}

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
              type="button"
            >
              Finalizar OS
            </button>
          ) : null}

          {!isTechnician && os.status === 'OPEN' && (onStatusUpdate || onAssign) ? (
            <button className="btn btn-secondary" onClick={handleAdminProgress} type="button">
              Dar andamento
            </button>
          ) : null}

          {!isTechnician && os.status === 'IN_PROGRESS' && onStatusUpdate ? (
            <button
              className="btn btn-primary"
              onClick={() => onStatusUpdate(os.id, 'DONE')}
              type="button"
            >
              Finalizar OS
            </button>
          ) : null}
        </div>
      </article>

      {isDetailsOpen ? (
        <OSDetailsModal onClose={() => setIsDetailsOpen(false)} os={os} />
      ) : null}
    </>
  );
}
