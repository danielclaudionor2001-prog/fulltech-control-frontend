const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

const STATUS_TO_UI = {
  CANCELED: 'Cancelado',
  DONE: 'Concluído',
  IN_PROGRESS: 'Em Andamento',
  OPEN: 'Pendente',
};

const request = async (path, options = {}) => {
  const { body, getToken, headers, ...fetchOptions } = options;
  const token = getToken ? await getToken() : null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    body,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

const normalizeServiceOrder = (order) => ({
  ...order,
  statusLabel: STATUS_TO_UI[order.status] || order.status,
  technicianId: order.assignedToId ?? null,
});

const toCreatePayload = (formData) => ({
  address: formData.address || undefined,
  collaborator: formData.collaborator || undefined,
  customer: formData.customer,
  deadline: formData.deadline || undefined,
  description: formData.description,
  durationMinutes: Number(formData.durationMinutes),
  identifier: formData.identifier || undefined,
  osType: formData.osType,
  scheduleDate: formData.scheduleDate,
  scheduleTime: formData.scheduleTime || undefined,
});

export const getCurrentUser = (getToken) =>
  request('/users/me', { getToken });

export const getUsers = (getToken) => request('/users', { getToken });

export const updateUserStatus = (id, isActive, getToken) =>
  request(`/users/${id}/status`, {
    body: JSON.stringify({ isActive }),
    getToken,
    method: 'PATCH',
  });

export const updateUserRole = (id, role, getToken) =>
  request(`/users/${id}/role`, {
    body: JSON.stringify({ role }),
    getToken,
    method: 'PATCH',
  });

export const getAccessList = (getToken) => request('/access-list', { getToken });

export const createAllowedEmail = (email, role, getToken) =>
  request('/access-list', {
    body: JSON.stringify({ email, role }),
    getToken,
    method: 'POST',
  });

export const removeAllowedEmail = (id, getToken) =>
  request(`/access-list/${id}`, {
    getToken,
    method: 'DELETE',
  });

export const getCustomers = (getToken) => request('/customers', { getToken });

export const createCustomer = (payload, getToken) =>
  request('/customers', {
    body: JSON.stringify(payload),
    getToken,
    method: 'POST',
  });

export const deleteCustomer = (id, getToken) =>
  request(`/customers/${id}`, {
    getToken,
    method: 'DELETE',
  });

export const getServiceOrders = async (getToken) => {
  const data = await request('/service-orders', { getToken });
  return data.map(normalizeServiceOrder);
};

export const createServiceOrder = async (formData, getToken) => {
  const created = await request('/service-orders', {
    body: JSON.stringify(toCreatePayload(formData)),
    getToken,
    method: 'POST',
  });

  return normalizeServiceOrder(created);
};

export const updateServiceOrder = async (id, data, getToken) => {
  const updated = await request(`/service-orders/${id}`, {
    body: JSON.stringify(data),
    getToken,
    method: 'PATCH',
  });

  return normalizeServiceOrder(updated);
};

export const startServiceOrder = async (id, lat, lng, getToken) => {
  const updated = await request(`/service-orders/${id}/start`, {
    body: JSON.stringify({ lat, lng }),
    getToken,
    method: 'POST',
  });

  return normalizeServiceOrder(updated);
};

export const updateLocation = (lat, lng, getToken) =>
  request('/locations', {
    body: JSON.stringify({ lat, lng }),
    getToken,
    method: 'POST',
  });

export const getLocations = (getToken) =>
  request('/locations', { getToken });
