export const SERVICE_ORDER_STATUS_LABELS = {
  CANCELED: 'Cancelada',
  DONE: 'Finalizado',
  IN_PROGRESS: 'Em andamento',
  OPEN: 'Pendente',
  WITH_PENDING: 'Com pendência',
};

export const SERVICE_ORDER_STATUS_STEPS = [
  {
    description: 'OS criada e aguardando início do atendimento.',
    label: SERVICE_ORDER_STATUS_LABELS.OPEN,
    status: 'OPEN',
  },
  {
    description: 'Atendimento assumido e em execução.',
    label: SERVICE_ORDER_STATUS_LABELS.IN_PROGRESS,
    status: 'IN_PROGRESS',
  },
  {
    description: 'Serviço concluído e OS encerrada.',
    label: SERVICE_ORDER_STATUS_LABELS.DONE,
    status: 'DONE',
  },
  {
    description: 'OS encerrada com pendência registrada.',
    label: SERVICE_ORDER_STATUS_LABELS.WITH_PENDING,
    status: 'WITH_PENDING',
  },
  {
    description: 'OS encerrada sem execução.',
    label: SERVICE_ORDER_STATUS_LABELS.CANCELED,
    status: 'CANCELED',
  },
];

export const getServiceOrderStatusLabel = (status) =>
  SERVICE_ORDER_STATUS_LABELS[status] || status || 'Não informado';

export const formatServiceOrderDateTime = (dateLike) => {
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
