import React, { useState } from 'react';
import {
  AlertCircle,
  Clock,
  Download,
  FileText,
  MapPin,
  User,
} from 'lucide-react';
import { useToast } from './ToastProvider';
import ButtonSpinner from './ButtonSpinner';
import OSDetailsModal from './OSDetailsModal';
import TechnicianConclusionModal from './TechnicianConclusionModal';
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
    case 'WITH_PENDING':
      return 'status-badge status-pending';
    case 'CANCELED':
      return 'status-badge status-canceled';
    default:
      return 'status-badge';
  }
};

export default function OSCard({
  busyAction = '',
  isTechnician,
  onAssign,
  onClaim,
  onStatusUpdate,
  os,
}) {
  const { showError } = useToast();
  const [isConclusionOpen, setIsConclusionOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const statusLabel = os.statusLabel || getServiceOrderStatusLabel(os.status);
  const technicianLabel =
    os.assignedTo?.name || os.assignedTo?.email || os.technicianId || null;
  const isActionBusy = Boolean(busyAction);

  const handleAdminProgress = () => {
    if (onAssign) {
      void onAssign(os.id);
      return;
    }

    if (onStatusUpdate) {
      void onStatusUpdate(os.id, 'IN_PROGRESS');
    }
  };

  const handlePdfDownload = async () => {
    setIsPdfLoading(true);

    try {
      await downloadServiceOrderPdf(os);
    } catch (error) {
      console.error('Failed to generate service order PDF', error);
      showError('Não foi possível gerar o PDF da OS agora.');
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleConclusionSubmit = (payload) => {
    const result = onStatusUpdate?.(os.id, payload.status, payload);

    if (result && typeof result.then === 'function') {
      void result.then(() => setIsConclusionOpen(false)).catch(() => {});
      return;
    }

    setIsConclusionOpen(false);
  };

  return (
    <>
      <article className="card os-card">
        <div className="os-card-header">
          <div className="os-card-copy">
            <span className="os-card-overline">Ordem de serviço</span>
            <h3 className="os-card-title">
              {os.identifier ? `#${os.identifier}` : `#${os.id.slice(0, 8)}`} -{' '}
              {os.customer}
            </h3>
          </div>

          <span className={getStatusClassName(os.status)}>{statusLabel}</span>
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
            <span>{formatServiceOrderDateTime(os.scheduleAt)}</span>
          </div>

          {technicianLabel ? (
            <div className="os-card-meta-item">
              <User size={16} />
              <span>Responsável: {technicianLabel}</span>
            </div>
          ) : null}
        </div>

        <div className="os-card-actions">
          <button
            className="btn btn-outline"
            disabled={isActionBusy || isPdfLoading}
            onClick={() => setIsDetailsOpen(true)}
            type="button"
          >
            <FileText size={18} />
            Ver dados
          </button>

          {os.status === 'DONE' || os.status === 'WITH_PENDING' ? (
            <button
              className="btn btn-primary"
              disabled={isActionBusy || isPdfLoading}
              onClick={() => void handlePdfDownload()}
              type="button"
            >
              {isPdfLoading ? <ButtonSpinner /> : <Download size={18} />}
              {isPdfLoading ? 'Gerando PDF...' : 'Baixar PDF'}
            </button>
          ) : null}

          {isTechnician && os.status === 'OPEN' && onClaim ? (
            <button
              className="btn btn-primary"
              disabled={isActionBusy || isPdfLoading}
              onClick={() => void onClaim(os.id)}
              type="button"
            >
              {busyAction === 'claim' ? <ButtonSpinner /> : null}
              {busyAction === 'claim'
                ? 'Validando local...'
                : os.assignedToId
                  ? 'Iniciar OS'
                  : 'Assumir OS'}
            </button>
          ) : null}

          {isTechnician &&
          os.assignedToId &&
          os.status === 'IN_PROGRESS' &&
          onStatusUpdate ? (
            <button
              className="btn btn-primary"
              disabled={isActionBusy || isPdfLoading}
              onClick={() => setIsConclusionOpen(true)}
              type="button"
            >
              {busyAction === 'done' ? <ButtonSpinner /> : null}
              {busyAction === 'done' ? 'Finalizando...' : 'Finalizar OS'}
            </button>
          ) : null}

          {!isTechnician && os.status === 'OPEN' && (onStatusUpdate || onAssign) ? (
            <button
              className="btn btn-secondary"
              disabled={isActionBusy || isPdfLoading}
              onClick={handleAdminProgress}
              type="button"
            >
              {busyAction === 'progress' ? <ButtonSpinner /> : null}
              {busyAction === 'progress'
                ? onAssign
                  ? 'Validando local...'
                  : 'Atualizando...'
                : 'Dar andamento'}
            </button>
          ) : null}
        </div>
      </article>

      {isDetailsOpen ? (
        <OSDetailsModal onClose={() => setIsDetailsOpen(false)} os={os} />
      ) : null}

      {isConclusionOpen ? (
        <TechnicianConclusionModal
          isSubmitting={busyAction === 'done'}
          onClose={() => setIsConclusionOpen(false)}
          onSubmit={handleConclusionSubmit}
          os={os}
        />
      ) : null}
    </>
  );
}
