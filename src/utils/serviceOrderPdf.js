import { jsPDF } from 'jspdf';
import { getServiceOrderStatusLabel } from './serviceOrderStatus';

const BRAND_SYMBOL_PATH = '/brand/fulltech-symbol.png';
const WATERMARK_PATH = '/brand/fulltech-os-watermark.jpeg';

const COLORS = {
  blue: [20, 91, 174],
  blueDark: [12, 27, 57],
  blueSoft: [233, 242, 255],
  border: [213, 221, 232],
  muted: [91, 111, 146],
  slate: [34, 47, 68],
  success: [19, 133, 92],
  surface: [255, 255, 255],
};

const SERVICE_TYPE_LABELS = {
  instalacao: 'Instalação',
  manutencao: 'Manutenção',
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

const normalizeValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'Não informado';
  }

  return String(value);
};

const getPersonLabel = (person) =>
  person?.name || person?.email || person?.clerkUserId || 'Não informado';

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
    throw new Error(`Não foi possível carregar a imagem ${path}`);
  }

  return blobToDataUrl(await response.blob());
};

const loadImageWithOpacity = async (path, opacity) => {
  const dataUrl = await loadImageDataUrl(path);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.globalAlpha = opacity;
      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = reject;
    image.src = dataUrl;
  });
};

const safeFilePart = (value) =>
  String(value || 'os')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const setTextColor = (doc, color) => doc.setTextColor(...color);
const setFillColor = (doc, color) => doc.setFillColor(...color);
const setDrawColor = (doc, color) => doc.setDrawColor(...color);

const drawRoundedCard = (doc, x, y, width, height) => {
  setFillColor(doc, COLORS.surface);
  setDrawColor(doc, COLORS.border);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, width, height, 2.2, 2.2, 'FD');
};

const drawSectionTitle = (doc, title, x, y, rightText) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setTextColor(doc, COLORS.blueDark);
  doc.text(title, x, y);

  if (rightText) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setTextColor(doc, COLORS.slate);
    doc.text(rightText, 194, y, { align: 'right' });
  }
};

const drawCardTitle = (doc, title, x, y) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setTextColor(doc, COLORS.muted);
  doc.text(title.toUpperCase(), x, y);
};

const drawCardValue = (doc, value, x, y, maxWidth, options = {}) => {
  const lines = doc.splitTextToSize(normalizeValue(value), maxWidth);
  doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
  doc.setFontSize(options.size || 9.5);
  setTextColor(doc, options.color || COLORS.slate);
  doc.text(lines, x, y);
  return lines.length * ((options.size || 9.5) * 0.42);
};

const drawInfoCard = (doc, { height, items, title, width, x, y }) => {
  drawRoundedCard(doc, x, y, width, height);
  drawCardTitle(doc, title, x + 5, y + 8);

  let cursorY = y + 17;
  items.forEach((item, index) => {
    if (index > 0) {
      cursorY += 3;
    }

    if (item.label) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      setTextColor(doc, COLORS.muted);
      doc.text(item.label.toUpperCase(), x + 5, cursorY);
      cursorY += 4.5;
    }

    cursorY += drawCardValue(doc, item.value, x + 5, cursorY, width - 10, {
      bold: item.bold,
      size: item.size,
    });
  });
};

const drawMetricCard = (doc, { label, value, width, x, y }) => {
  drawRoundedCard(doc, x, y, width, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setTextColor(doc, COLORS.muted);
  doc.text(label, x + width / 2, y + 9, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setTextColor(doc, COLORS.blueDark);
  doc.text(normalizeValue(value), x + width / 2, y + 18, { align: 'center' });
};

const drawStatusPill = (doc, status, x, y) => {
  const label = getServiceOrderStatusLabel(status);
  const width = Math.max(35, doc.getTextWidth(label) + 14);
  const isDone = status === 'DONE';
  setFillColor(doc, isDone ? [223, 248, 236] : COLORS.blueSoft);
  setDrawColor(doc, isDone ? [170, 226, 202] : [192, 214, 246]);
  doc.roundedRect(x - width, y - 6.3, width, 9, 4.5, 4.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setTextColor(doc, isDone ? COLORS.success : COLORS.blue);
  doc.text(label, x - width / 2, y, { align: 'center' });
};

const buildDetailRows = (os) => [
  ['ID interno', normalizeValue(os.id)],
  ['Status', getServiceOrderStatusLabel(os.status)],
  ['Tipo de OS', SERVICE_TYPE_LABELS[os.osType] || normalizeValue(os.osType)],
  ['Prazo', DEADLINE_LABELS[os.deadline] || normalizeValue(os.deadline)],
  [
    'Duração prevista',
    os.durationMinutes ? `${os.durationMinutes} minutos` : 'Não informado',
  ],
  ['Agendamento', formatDateTime(os.scheduleAt)],
  ['Horário informado', normalizeValue(os.scheduleTimeText)],
  ['Responsável', getPersonLabel(os.assignedTo)],
  ['Criada por', getPersonLabel(os.createdBy)],
  ['Colaborador legado', normalizeValue(os.collaborator)],
  ['Criada em', formatDateTime(os.createdAt)],
  ['Atualizada em', formatDateTime(os.updatedAt)],
];

export const downloadServiceOrderPdf = async (os) => {
  const [brandSymbol, watermark] = await Promise.all([
    loadImageDataUrl(BRAND_SYMBOL_PATH),
    loadImageWithOpacity(WATERMARK_PATH, 0.34),
  ]);

  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const serviceOrderId = os.identifier || os.id?.slice(0, 8)?.toUpperCase();
  const serviceType = SERVICE_TYPE_LABELS[os.osType] || normalizeValue(os.osType);
  let y = 18;

  const addBackground = () => {
    doc.addImage(watermark, 'PNG', 0, 0, pageWidth, pageHeight);
  };

  const drawHeader = () => {
    doc.addImage(brandSymbol, 'PNG', marginX, y - 3, 15, 15);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setTextColor(doc, COLORS.slate);
    doc.text('FULLTECH ELEVADORES', marginX + 20, y + 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setTextColor(doc, COLORS.muted);
    doc.text('Relatório comercial da ordem de serviço', marginX + 20, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setTextColor(doc, COLORS.muted);
    doc.text('OS', 194, y + 1, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setTextColor(doc, COLORS.blueDark);
    doc.text(serviceOrderId || 'Não informado', 194, y + 7, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setTextColor(doc, COLORS.slate);
    doc.text(serviceType, 194, y + 13, { align: 'right' });

    setDrawColor(doc, COLORS.border);
    doc.line(marginX, y + 21, pageWidth - marginX, y + 21);
  };

  const addPageIfNeeded = (neededHeight) => {
    if (y + neededHeight <= 270) {
      return;
    }

    doc.addPage();
    addBackground();
    y = 18;
    drawHeader();
    y = 48;
  };

  addBackground();
  drawHeader();
  y = 50;

  drawSectionTitle(
    doc,
    'Dados do cliente',
    marginX,
    y,
    `Ordem de serviço criada em ${formatDateTime(os.createdAt)}`,
  );
  y += 11;

  const cardGap = 4;
  const cardWidth = (contentWidth - cardGap) / 2;
  drawInfoCard(doc, {
    height: 42,
    items: [
      { bold: true, size: 10.5, value: normalizeValue(os.customer) },
      { label: 'Identificador', value: serviceOrderId || 'Não informado' },
    ],
    title: 'Cliente',
    width: cardWidth,
    x: marginX,
    y,
  });

  drawInfoCard(doc, {
    height: 42,
    items: [
      { bold: true, size: 10, value: normalizeValue(os.customer) },
      { label: 'Endereço', value: normalizeValue(os.address) },
    ],
    title: 'Localização',
    width: cardWidth,
    x: marginX + cardWidth + cardGap,
    y,
  });
  y += 54;

  drawSectionTitle(doc, 'Informações de atendimento', marginX, y);
  drawStatusPill(doc, os.status, 194, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setTextColor(doc, COLORS.blueDark);
  doc.text(serviceType, marginX, y);
  y += 7;

  const metricWidth = 34;
  drawMetricCard(doc, {
    label: 'Data',
    value: formatDate(os.scheduleAt),
    width: metricWidth,
    x: marginX,
    y,
  });
  drawMetricCard(doc, {
    label: 'Inicio',
    value: formatTime(os.scheduleAt, os.scheduleTimeText),
    width: metricWidth,
    x: marginX + metricWidth + 4,
    y,
  });
  drawMetricCard(doc, {
    label: 'Duracao',
    value: os.durationMinutes ? `${os.durationMinutes} min` : 'Não informado',
    width: metricWidth,
    x: marginX + (metricWidth + 4) * 2,
    y,
  });

  drawInfoCard(doc, {
    height: 25,
    items: [
      { bold: true, size: 9.5, value: getPersonLabel(os.assignedTo) },
    ],
    title: 'Responsável',
    width: contentWidth - metricWidth * 3 - 12,
    x: marginX + (metricWidth + 4) * 3,
    y,
  });
  y += 36;

  drawSectionTitle(doc, 'Descrição da OS', marginX, y);
  y += 7;
  const descriptionLines = doc.splitTextToSize(normalizeValue(os.description), contentWidth - 10);
  const descriptionHeight = Math.max(30, 13 + descriptionLines.length * 5);
  drawRoundedCard(doc, marginX, y, contentWidth, descriptionHeight);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setTextColor(doc, COLORS.slate);
  doc.text(descriptionLines, marginX + 5, y + 10);
  y += descriptionHeight + 11;

  drawSectionTitle(doc, 'Dados completos', marginX, y);
  y += 7;

  const rows = buildDetailRows(os);
  const rowHeight = 10;
  const labelWidth = 42;
  rows.forEach(([label, value]) => {
    const valueLines = doc.splitTextToSize(normalizeValue(value), contentWidth - labelWidth - 10);
    const height = Math.max(rowHeight, 6 + valueLines.length * 4.8);
    addPageIfNeeded(height + 2);

    drawRoundedCard(doc, marginX, y, contentWidth, height);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    setTextColor(doc, COLORS.muted);
    doc.text(label.toUpperCase(), marginX + 5, y + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setTextColor(doc, COLORS.slate);
    doc.text(valueLines, marginX + labelWidth, y + 6.5);
    y += height + 2;
  });

  addPageIfNeeded(18);
  setDrawColor(doc, COLORS.border);
  doc.line(marginX, 278, pageWidth - marginX, 278);

  const fileId = safeFilePart(os.identifier || os.id?.slice(0, 8) || 'servico');
  doc.save(`ordem-servico-${fileId}.pdf`);
};
