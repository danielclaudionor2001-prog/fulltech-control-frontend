import React from 'react';
import { Download, X } from 'lucide-react';
import {
  formatServiceOrderDateTime,
  getServiceOrderStatusLabel,
} from '../utils/serviceOrderStatus';
import { downloadServiceOrderPdf } from '../utils/serviceOrderPdf';

const SERVICE_TYPE_LABELS = {
  instalacao: 'Instalacao',
  manutencao: 'Manutencao',
  suporte: 'Suporte',
  vistoria: 'Vistoria',
};

const DEADLINE_LABELS = {
  D1_dia: 'D1 - 1 dia',
  D3_dias: 'D3 - 3 dias',
  D7_dias: 'D7 - 7 dias',
  D15_dias: 'D15 - 15 dias',
  D30_dias: 'D30 - 30 dias',
  sem_prazo: 'Sem prazo',
};

const formatDateTime = (dateLike) => {
  if (!dateLike) {
    return 'Nao informado';
  }

  const parsedDate = new Date(dateLike);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Nao informado';
  }

  return parsedDate.toLocaleString('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const normalizeValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'Nao informado';
  }

  return String(value);
};

const getPersonLabel = (person) =>
  person?.name || person?.email || person?.clerkUserId || 'Nao informado';

const buildDetails = (os) => [
  ['Identificador', os.identifier ? `#${os.identifier}` : `#${os.id?.slice(0, 8)}`],
  ['ID interno', normalizeValue(os.id)],
  ['Status', getServiceOrderStatusLabel(os.status)],
  ['Cliente', normalizeValue(os.customer)],
  ['Endereco', normalizeValue(os.address)],
  ['Descricao', normalizeValue(os.description)],
  ['Tipo de OS', SERVICE_TYPE_LABELS[os.osType] || normalizeValue(os.osType)],
  ['Prazo', DEADLINE_LABELS[os.deadline] || normalizeValue(os.deadline)],
  ['Duracao prevista', os.durationMinutes ? `${os.durationMinutes} minutos` : 'Nao informado'],
  ['Agendamento', formatServiceOrderDateTime(os.scheduleAt)],
  ['Horario informado', normalizeValue(os.scheduleTimeText)],
  ['Responsavel', getPersonLabel(os.assignedTo)],
  ['Criada por', getPersonLabel(os.createdBy)],
  ['Colaborador legado', normalizeValue(os.collaborator)],
  ['Criada em', formatDateTime(os.createdAt)],
  ['Atualizada em', formatDateTime(os.updatedAt)],
];

export default function OSDetailsModal({ onClose, os }) {
  const canDownloadPdf = os.status === 'DONE';

  const handleDownload = async () => {
    try {
      await downloadServiceOrderPdf(os);
    } catch (error) {
      console.error('Failed to generate service order PDF', error);
      window.alert('Nao foi possivel gerar o PDF da OS agora.');
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <article
        aria-label="Detalhes da ordem de servico"
        aria-modal="true"
        className="modal-card os-details-modal"
        role="dialog"
      >
        <div className="modal-header">
          <div className="modal-copy">
            <span className="page-eyebrow">Ordem de servico</span>
            <h2 className="modal-title">
              {os.identifier ? `#${os.identifier}` : `#${os.id?.slice(0, 8)}`}
            </h2>
            <p className="modal-subtitle">
              Dados completos da OS e exportacao em PDF quando finalizada.
            </p>
          </div>

          <button
            aria-label="Fechar detalhes da OS"
            className="modal-close"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="os-details-grid">
            {buildDetails(os).map(([label, value]) => (
              <div className="os-detail-item" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          {canDownloadPdf ? (
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleDownload} type="button">
                <Download size={18} />
                Baixar PDF
              </button>
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}
