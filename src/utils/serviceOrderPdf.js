import { jsPDF } from 'jspdf';
import {
  formatServiceOrderDateTime,
  getServiceOrderStatusLabel,
} from './serviceOrderStatus';

const WATERMARK_PATH = '/brand/fulltech-os-watermark.jpeg';

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

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const loadImageDataUrl = async (path) => {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Nao foi possivel carregar a imagem ${path}`);
  }

  return blobToDataUrl(await response.blob());
};

const buildServiceOrderFields = (os) => [
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

const safeFilePart = (value) =>
  String(value || 'os')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

export const downloadServiceOrderPdf = async (os) => {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const contentWidth = pageWidth - marginX * 2;
  const watermark = await loadImageDataUrl(WATERMARK_PATH);
  let y = 48;

  const addBackground = () => {
    doc.addImage(watermark, 'JPEG', 0, 0, pageWidth, pageHeight);
  };

  const addPageIfNeeded = (neededHeight) => {
    if (y + neededHeight <= 258) {
      return;
    }

    doc.addPage();
    addBackground();
    y = 38;
  };

  const addField = (label, value) => {
    const text = normalizeValue(value);
    const lines = doc.splitTextToSize(text, contentWidth);
    const neededHeight = 10 + lines.length * 5.2;
    addPageIfNeeded(neededHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(20, 39, 72);
    doc.text(label.toUpperCase(), marginX, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(29, 48, 82);
    doc.text(lines, marginX, y);
    y += lines.length * 5.2 + 5;
  };

  addBackground();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(12, 27, 57);
  doc.text('Relatorio da Ordem de Servico', marginX, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(76, 94, 125);
  doc.text(`Emitido em ${formatDateTime(new Date())}`, marginX, y);
  y += 12;

  buildServiceOrderFields(os).forEach(([label, value]) => addField(label, value));

  const fileId = safeFilePart(os.identifier || os.id?.slice(0, 8) || 'servico');
  doc.save(`ordem-servico-${fileId}.pdf`);
};
