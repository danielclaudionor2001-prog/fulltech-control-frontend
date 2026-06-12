import { getServiceOrderStatusLabel } from '../utils/serviceOrderStatus';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

const getErrorMessage = (text, status) => {
  if (!text) {
    return `Request failed with status ${status}`;
  }

  try {
    const parsed = JSON.parse(text);

    if (typeof parsed?.message === 'string' && parsed.message.trim()) {
      return parsed.message;
    }

    if (Array.isArray(parsed?.message) && parsed.message.length > 0) {
      return parsed.message.join(', ');
    }
  } catch {
    return text;
  }

  return text;
};

const request = async (path, options = {}) => {
  const { body, getToken, headers, ...fetchOptions } = options;
  const token = getToken ? await getToken({ skipCache: true }) : null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    body,
    cache: fetchOptions.cache ?? 'no-store',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(getErrorMessage(text, response.status));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

const normalizeServiceOrder = (order) => ({
  ...order,
  statusLabel: getServiceOrderStatusLabel(order.status),
  technicianId: order.assignedToId ?? null,
});

const toCreatePayload = (formData) => {
  const customerPhones = Array.isArray(formData.customerPhones)
    ? formData.customerPhones.filter((phone) => phone?.trim())
    : [];

  return {
    address: formData.address || undefined,
    assignedToId: formData.assignedToId || undefined,
    customer: formData.customer,
    customerEmail: formData.customerEmail || undefined,
    ...(customerPhones.length ? { customerPhones } : {}),
    deadline: formData.deadline || undefined,
    description: formData.description,
    identifier: formData.identifier || undefined,
    osType: formData.osType,
    scheduleDate: formData.scheduleDate,
    scheduleTime: formData.scheduleTime || undefined,
  };
};

export const getCurrentUser = (getToken) => request('/users/me', { getToken });

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

export const updateCustomer = (id, payload, getToken) =>
  request(`/customers/${id}`, {
    body: JSON.stringify(payload),
    getToken,
    method: 'PATCH',
  });

export const deleteCustomer = (id, getToken) =>
  request(`/customers/${id}`, {
    getToken,
    method: 'DELETE',
  });

export const getServiceOrders = async (getToken, filters = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  const data = await request(`/service-orders${query ? `?${query}` : ''}`, {
    getToken,
  });
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

export const getLocations = (getToken) => request('/locations', { getToken });
