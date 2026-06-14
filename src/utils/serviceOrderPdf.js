import { jsPDF } from 'jspdf';
import { getServiceOrderStatusLabel } from './serviceOrderStatus';

const BRAND_SYMBOL_PATH = '/brand/fulltech-symbol.png';

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
  atendimento_chamado: 'Atendimento de chamado',
  manutencao: 'Manutenção',
  manutencao_mensal: 'Manutenção mensal',
  servicos_interacao: 'Serviços/Instalações',
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

const getResponsibleTitle = (person) =>
  person?.role === 'SUPERVISOR'
    ? 'Supervisor responsável'
    : 'Técnico responsável';

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

const getImageFormat = (dataUrl) =>
  String(dataUrl).startsWith('data:image/png') ? 'PNG' : 'JPEG';

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
  doc.setFontSize(9.2);
  setTextColor(doc, COLORS.blueDark);
  doc.text(doc.splitTextToSize(normalizeValue(value), width - 6), x + width / 2, y + 16, {
    align: 'center',
  });
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

export const downloadServiceOrderPdf = async (os) => {
  const brandSymbol = await loadImageDataUrl(BRAND_SYMBOL_PATH);

  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const serviceOrderId = os.identifier || os.id?.slice(0, 8)?.toUpperCase();
  const serviceType = SERVICE_TYPE_LABELS[os.osType] || normalizeValue(os.osType);
  const defectSolution = getDefectSolution(os);
  const equipmentStatus = getEquipmentStatus(os);
  const isElevatorRunning = ['running', 'running_with_pending'].includes(
    equipmentStatus,
  );
  const isElevatorStopped = [
    'stopped',
    'stopped_repair',
    'waiting_authorization',
  ].includes(equipmentStatus);
  let y = 18;

  const addBackground = () => {
    setFillColor(doc, COLORS.surface);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
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
    doc.text('Relatório da ordem de serviço', marginX + 20, y + 8);

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

  const drawCheckboxLine = (x, lineY, label, checked) => {
    setDrawColor(doc, COLORS.blue);
    doc.rect(x, lineY - 3, 3.2, 3.2);

    if (checked) {
      setFillColor(doc, COLORS.blue);
      doc.rect(x + 0.45, lineY - 2.55, 2.3, 2.3, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.3);
    setTextColor(doc, COLORS.slate);
    doc.text(label, x + 5.2, lineY);
  };

  const drawCheckboxGroup = (title, items) => {
    const height = 11 + items.length * 8;
    addPageIfNeeded(height + 8);
    drawRoundedCard(doc, marginX + 7, y, contentWidth - 14, height);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setTextColor(doc, COLORS.blueDark);
    doc.text(title, marginX + 12, y + 8);

    items.forEach((item, index) => {
      drawCheckboxLine(marginX + 12, y + 16 + index * 8, item.label, item.checked);
    });

    y += height + 7;
  };

  const drawTotalsStrip = () => {
    addPageIfNeeded(13);
    drawRoundedCard(doc, marginX, y, contentWidth, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    setTextColor(doc, COLORS.muted);
    doc.text('Valor total dos serviços: R$ 0,00', marginX + 4, y + 6.5);
    setTextColor(doc, COLORS.blue);
    doc.text('+', marginX + 60, y + 6.5);
    setTextColor(doc, COLORS.muted);
    doc.text('Valor total dos produtos: R$ 0,00', marginX + 66, y + 6.5);
    setTextColor(doc, COLORS.blue);
    doc.text('=', marginX + 126, y + 6.5);
    setTextColor(doc, COLORS.muted);
    doc.text('Valor total da atividade: R$ 0,00', marginX + 132, y + 6.5);
    y += 17;
  };

  const drawAttachments = () => {
    addPageIfNeeded(28);
    drawSectionTitle(doc, 'Anexos', marginX, y);
    y += 7;

    if (!os.completionPhotos?.length) {
      drawRoundedCard(doc, marginX, y, contentWidth, 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setTextColor(doc, COLORS.muted);
      doc.text('Nenhum anexo informado.', marginX + 5, y + 7.8);
      y += 20;
      return;
    }

    const cardWidth = 34;
    const cardHeight = 36;
    const gap = 8;
    let x = marginX;
    os.completionPhotos.forEach((photo, index) => {
      if (x + cardWidth > pageWidth - marginX) {
        x = marginX;
        y += cardHeight + 10;
      }

      addPageIfNeeded(cardHeight + 12);
      drawRoundedCard(doc, x, y, cardWidth, cardHeight);

      try {
        doc.addImage(photo, getImageFormat(photo), x + 2, y + 2, cardWidth - 4, 25);
      } catch {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        setTextColor(doc, COLORS.muted);
        doc.text('Imagem', x + cardWidth / 2, y + 15, { align: 'center' });
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      setTextColor(doc, COLORS.slate);
      doc.text(`ANEXO ${index + 1}`, x, y + cardHeight + 5);
      x += cardWidth + gap;
    });

    y += cardHeight + 17;
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
    height: 62,
    items: [
      { bold: true, size: 10.5, value: normalizeValue(os.customer) },
      { label: 'Identificador', value: serviceOrderId || 'Não informado' },
      { label: 'Telefone', value: normalizeValue(os.customerPhones?.join(' / ')) },
      { label: 'E-mail', value: normalizeValue(os.customerEmail) },
    ],
    title: 'Cliente',
    width: cardWidth,
    x: marginX,
    y,
  });

  drawInfoCard(doc, {
    height: 62,
    items: [
      { bold: true, size: 10, value: normalizeValue(os.customer) },
      { label: 'Endereço', value: normalizeValue(os.address) },
    ],
    title: 'Localização',
    width: cardWidth,
    x: marginX + cardWidth + cardGap,
    y,
  });
  y += 74;

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
    label: 'Fim',
    value: formatDateTime(os.updatedAt),
    width: metricWidth,
    x: marginX + (metricWidth + 4) * 2,
    y,
  });
  drawInfoCard(doc, {
    height: 25,
    items: [
      { bold: true, size: 9.5, value: getPersonLabel(os.assignedTo) },
    ],
    title: getResponsibleTitle(os.assignedTo),
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

  addPageIfNeeded(52);
  drawSectionTitle(doc, 'Conclusão do Técnico', marginX, y);
  y += 7;
  const completionLines = doc.splitTextToSize(
    normalizeValue(os.completionDescription),
    contentWidth - 10,
  );
  const completionHeight = Math.max(32, 13 + completionLines.length * 5);
  drawRoundedCard(doc, marginX, y, contentWidth, completionHeight);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setTextColor(doc, COLORS.slate);
  doc.text(completionLines, marginX + 5, y + 10);
  y += completionHeight + 8;

  addPageIfNeeded(58);
  drawSectionTitle(doc, 'Formulários', marginX, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setTextColor(doc, COLORS.blueDark);
  doc.text('Status Final', marginX, y);
  y += 7;

  drawCheckboxGroup('Status da OS:', [
    { checked: os.status === 'DONE', label: 'Finalizado' },
    { checked: os.status === 'WITH_PENDING', label: 'Com pendência' },
  ]);

  drawCheckboxGroup('Solução do defeito:', [
    {
      checked: defectSolution === 'replacement',
      label: 'Substituição de Peça(s) / Componente(s)',
    },
    { checked: defectSolution === 'adjustment', label: 'Ajuste' },
    { checked: defectSolution === 'repair', label: 'Programar Reparo' },
  ]);

  drawCheckboxGroup('Elevador funcionando?', [
    { checked: isElevatorRunning, label: 'Elevador funcionando' },
    { checked: isElevatorStopped, label: 'Elevador parado' },
  ]);

  drawTotalsStrip();
  drawAttachments();

  addPageIfNeeded(54);
  drawSectionTitle(doc, 'Assinatura', marginX, y);
  y += 7;
  drawRoundedCard(doc, marginX, y, contentWidth, 38);
  if (os.customerSignature) {
    doc.addImage(os.customerSignature, 'PNG', marginX + 5, y + 4, 92, 28);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setTextColor(doc, COLORS.muted);
    doc.text('Assinatura não informada.', marginX + 5, y + 20);
  }
  y += 45;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  setTextColor(doc, COLORS.slate);
  doc.text(`Assinatura de ${normalizeValue(os.customer)}`, marginX, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  setTextColor(doc, COLORS.blue);
  doc.text(`Assinado em: ${formatDateTime(os.updatedAt)}`, marginX, y);
  y += 8;

  addPageIfNeeded(18);
  setDrawColor(doc, COLORS.border);
  doc.line(marginX, 278, pageWidth - marginX, 278);

  const fileId = safeFilePart(os.identifier || os.id?.slice(0, 8) || 'servico');
  doc.save(`ordem-servico-${fileId}.pdf`);
};
