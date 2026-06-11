export const SERVICE_ORDER_STATUS_LABELS = {
  CANCELED: 'Cancelada',
  DONE: 'Finalizada',
  IN_PROGRESS: 'Em andamento',
  OPEN: 'Pendente',
};

export const SERVICE_ORDER_STATUS_STEPS = [
  {
    description: 'OS criada e aguardando inicio do atendimento.',
    label: SERVICE_ORDER_STATUS_LABELS.OPEN,
    status: 'OPEN',
  },
  {
    description: 'Atendimento assumido e em execucao.',
    label: SERVICE_ORDER_STATUS_LABELS.IN_PROGRESS,
    status: 'IN_PROGRESS',
  },
  {
    description: 'Servico concluido e OS encerrada.',
    label: SERVICE_ORDER_STATUS_LABELS.DONE,
    status: 'DONE',
  },
  {
    description: 'OS encerrada sem execucao.',
    label: SERVICE_ORDER_STATUS_LABELS.CANCELED,
    status: 'CANCELED',
  },
];

export const getServiceOrderStatusLabel = (status) =>
  SERVICE_ORDER_STATUS_LABELS[status] || status || 'Nao informado';

export const formatServiceOrderDateTime = (dateLike) => {
  if (!dateLike) {
    return 'Sem agendamento';
  }

  const parsedDate = new Date(dateLike);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Data invalida';
  }

  return parsedDate.toLocaleString('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
