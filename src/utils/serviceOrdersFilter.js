export const ORDER_STATUS_FILTER_OPTIONS = [
  { label: 'Todos os status', value: '' },
  { label: 'Pendente', value: 'OPEN' },
  { label: 'Em andamento', value: 'IN_PROGRESS' },
  { label: 'Finalizada', value: 'DONE' },
  { label: 'Com pendência', value: 'WITH_PENDING' },
  { label: 'Cancelada', value: 'CANCELED' },
];

const normalizeText = (value) => String(value || '').trim().toLowerCase();

export function sortServiceOrdersByLatest(orders) {
  return [...orders].sort((left, right) => {
    const leftDate = new Date(left.createdAt || 0).getTime();
    const rightDate = new Date(right.createdAt || 0).getTime();
    return rightDate - leftDate;
  });
}

export function filterServiceOrders(orders, filters = {}) {
  const search = normalizeText(filters.search);
  const status = normalizeText(filters.status);

  return orders.filter((order) => {
    if (status && normalizeText(order.status) !== status) {
      return false;
    }

    if (!search) {
      return true;
    }

    const searchableFields = [
      order.identifier,
      order.id,
      order.customer,
      order.description,
      order.address,
      order.assignedTo?.name,
      order.assignedTo?.email,
      order.createdBy?.name,
      order.createdBy?.email,
    ]
      .map(normalizeText)
      .filter(Boolean);

    return searchableFields.some((value) => value.includes(search));
  });
}
