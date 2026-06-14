import React, { useMemo, useState } from 'react';
import { Download, FileText, UserCircle } from 'lucide-react';
import ButtonSpinner from './ButtonSpinner';
import ModalShell from './ModalShell';
import { useToast } from './ToastContext';
import { getServiceOrderStatusLabel } from '../utils/serviceOrderStatus';
import { downloadServiceOrderPdf } from '../utils/serviceOrderPdf';

const SERVICE_TYPE_LABELS = {
  instalacao: 'Instalação',
  atendimento_chamado: 'Atendimento de chamado',
  manutencao: 'Manutenção',
  manutencao_mensal: 'Manutenção mensal',
  servicos_interacao: 'Serviços/Instalações',
  suporte: 'Suporte',
  vistoria: 'Vistoria',
};

const formatDate = (dateLike) => {
  if (!dateLike) {
    return 'Não informado';
  }

  const parsedDate = new Date(dateLike);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Não informado';
  }

  return parsedDate.toLocaleDateString('pt-BR');
};

const formatTime = (dateLike, fallback) => {
  if (fallback) {
    return fallback;
  }

  const parsedDate = new Date(dateLike);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Não informado';
  }

  return parsedDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateTime = (dateLike) => {
  if (!dateLike) {
    return 'Não informado';
  }

  const parsedDate = new Date(dateLike);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Não informado';
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
    return 'Não informado';
  }

  return String(value);
};

const getPersonLabel = (person) =>
  person?.name || person?.email || person?.clerkUserId || 'Não informado';

const getResponsibleTitle = (person) =>
  person?.role === 'SUPERVISOR'
    ? 'Supervisor responsável'
    : 'Técnico responsável';

const getServiceOrderId = (os) =>
  os.identifier ? os.identifier : os.id?.slice(0, 8)?.toUpperCase();

const getDefectSolution = (os) => {
  if (os.defectSolution) {
    return os.defectSolution;
  }

  if (os.defectAdjusted === true) {
    return 'adjustment';
  }

  if (os.defectAdjusted === false) {
    return 'repair';
  }

  return '';
};

const getEquipmentStatus = (os) => {
  if (os.equipmentStatus) {
    return os.equipmentStatus;
  }

  if (os.status === 'DONE') {
    return 'running';
  }

  if (os.status === 'WITH_PENDING') {
    return 'running_with_pending';
  }

  return '';
};

function InfoCard({ children, title }) {
  return (
    <div className="os-report-card">
      <span className="os-report-card-title">{title}</span>
      <div className="os-report-card-body">{children}</div>
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div className="os-report-info-line">
      <span>{label}</span>
      <strong>{normalizeValue(value)}</strong>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="os-report-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CheckboxLine({ checked, label }) {
  return (
    <div className="os-report-checkline">
      <span className={`os-report-checkbox ${checked ? 'is-checked' : ''}`} />
      <span>{label}</span>
    </div>
  );
}

export default function OSDetailsModal({ onClose, os }) {
  const { showError } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const canDownloadPdf = os.status === 'DONE' || os.status === 'WITH_PENDING';
  const serviceOrderId = getServiceOrderId(os);
  const serviceType = SERVICE_TYPE_LABELS[os.osType] || normalizeValue(os.osType);
  const technicianLabel = getPersonLabel(os.assignedTo);
  const responsibleTitle = getResponsibleTitle(os.assignedTo);
  const defectSolution = useMemo(() => getDefectSolution(os), [os]);
  const equipmentStatus = useMemo(() => getEquipmentStatus(os), [os]);
  const isElevatorRunning = ['running', 'running_with_pending'].includes(
    equipmentStatus,
  );
  const isElevatorStopped = [
    'stopped',
    'stopped_repair',
    'waiting_authorization',
  ].includes(equipmentStatus);

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      await downloadServiceOrderPdf(os);
    } catch (error) {
      console.error('Failed to generate service order PDF', error);
      showError('Não foi possível gerar o PDF da OS agora.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <ModalShell
      className="os-details-modal os-report-modal"
      description="Visualização organizada no padrão final da ordem de serviço."
      icon={FileText}
      onClose={onClose}
      open
      title={serviceOrderId ? `OS ${serviceOrderId}` : 'OS'}
    >
          <div className="os-report-sheet">
            <header className="os-report-header">
              <div className="os-report-brand">
                <img alt="Fulltech" src="/brand/fulltech-symbol.png" />
                <strong>FULLTECH ELEVADORES LTDA</strong>
              </div>
              <strong>{serviceType}</strong>
              <div className="os-report-number">
                <span>OS</span>
                <strong>{serviceOrderId || 'Não informado'}</strong>
              </div>
            </header>

            <section className="os-report-section">
              <div className="os-report-section-heading">
                <h3>Dados do cliente</h3>
                <span>Ordem de serviço criada em {formatDateTime(os.createdAt)}</span>
              </div>

              <div className="os-report-two-cols">
                <InfoCard title="Cliente">
                  <InfoLine label="Nome" value={os.customer} />
                  <InfoLine
                    label="Identificador"
                    value={serviceOrderId || 'Não informado'}
                  />
                  <InfoLine
                    label="Telefone"
                    value={os.customerPhones?.join(' / ')}
                  />
                  <InfoLine label="E-mail" value={os.customerEmail} />
                </InfoCard>

                <InfoCard title="Localização">
                  <InfoLine label="Cliente" value={os.customer} />
                  <InfoLine label="Endereço" value={os.address} />
                </InfoCard>
              </div>
            </section>

            <section className="os-report-section">
              <div className="os-report-section-heading">
                <div>
                  <h3>Informações de atendimento</h3>
                  <strong>Atividade 1</strong>
                </div>
                <span className="os-report-status">
                  {getServiceOrderStatusLabel(os.status)}
                </span>
              </div>

              <div className="os-report-attendance-grid">
                <MetricCard label="Data" value={formatDate(os.scheduleAt)} />
                <MetricCard
                  label="Início"
                  value={formatTime(os.scheduleAt, os.scheduleTimeText)}
                />
                <MetricCard label="Fim" value={formatDateTime(os.updatedAt)} />

                <InfoCard title={responsibleTitle}>
                  <div className="os-report-person">
                    <UserCircle size={34} />
                    <strong>{technicianLabel}</strong>
                  </div>
                </InfoCard>
              </div>

              <InfoCard title="Descrição da conclusão">
                <p>{normalizeValue(os.completionDescription || os.description)}</p>
              </InfoCard>
            </section>

            <section className="os-report-section">
              <h3>Formulários</h3>

              <div className="os-report-form-title">
                <FileText size={18} />
                <strong>Status Final</strong>
              </div>

              <div className="os-report-form-box">
                <strong>Status da OS:</strong>
                <CheckboxLine checked={os.status === 'DONE'} label="Finalizado" />
                <CheckboxLine
                  checked={os.status === 'WITH_PENDING'}
                  label="Com pendência"
                />

                <strong>Solução do defeito:</strong>
                <CheckboxLine
                  checked={defectSolution === 'replacement'}
                  label="Substituição de Peça(s) / Componente(s)"
                />
                <CheckboxLine checked={defectSolution === 'adjustment'} label="Ajuste" />
                <CheckboxLine
                  checked={defectSolution === 'repair'}
                  label="Programar Reparo"
                />
              </div>

              <div className="os-report-form-box">
                <strong>Elevador funcionando?</strong>
                <CheckboxLine
                  checked={isElevatorRunning}
                  label="Elevador funcionando"
                />
                <CheckboxLine checked={isElevatorStopped} label="Elevador parado" />
                {equipmentStatus &&
                ![
                  'running',
                  'running_with_pending',
                  'stopped',
                  'stopped_repair',
                  'waiting_authorization',
                ].includes(equipmentStatus) ? (
                  <small>Status informado: {equipmentStatus}</small>
                ) : null}
              </div>

              <div className="os-report-total-strip">
                <span>Valor total dos serviços: R$ 0,00</span>
                <span>+</span>
                <span>Valor total dos produtos: R$ 0,00</span>
                <span>=</span>
                <strong>Valor total da atividade: R$ 0,00</strong>
              </div>
            </section>

            <section className="os-report-section">
              <h3>Anexos</h3>
              {os.completionPhotos?.length ? (
                <div className="os-report-attachments">
                  {os.completionPhotos.map((photo, index) => (
                    <figure className="os-report-attachment" key={`attachment-${index}`}>
                      <img alt={`Anexo ${index + 1}`} src={photo} />
                      <figcaption>Anexo {index + 1}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <div className="os-report-empty">Nenhum anexo informado.</div>
              )}
            </section>

            <section className="os-report-section">
              <h3>Assinatura</h3>
              <div className="os-report-signature-box">
                {os.customerSignature ? (
                  <img alt="Assinatura do cliente" src={os.customerSignature} />
                ) : (
                  <span>Assinatura não informada</span>
                )}
              </div>
              <strong>Assinatura de {normalizeValue(os.customer)}</strong>
              <span className="os-report-signed-at">
                Assinado em: {formatDateTime(os.updatedAt)}
              </span>
            </section>
          </div>

          {canDownloadPdf ? (
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                disabled={isDownloading}
                onClick={() => void handleDownload()}
                type="button"
              >
                {isDownloading ? <ButtonSpinner /> : <Download size={18} />}
                {isDownloading ? 'Gerando PDF...' : 'Baixar PDF'}
              </button>
            </div>
          ) : null}
    </ModalShell>
  );
}
