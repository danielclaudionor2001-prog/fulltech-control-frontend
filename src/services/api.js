
const API_URL = '/api';

export const getServiceOrders = async () => {
    const response = await fetch(`${API_URL}/os`);
    return response.json();
};

export const createServiceOrder = async (osData) => {
    const response = await fetch(`${API_URL}/os`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(osData),
    });
    return response.json();
};

export const updateServiceOrder = async (id, data) => {
    const response = await fetch(`${API_URL}/os/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    return response.json();
};

export const updateLocation = async (technicianId, lat, lng) => {
    const response = await fetch(`${API_URL}/location`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ technicianId, lat, lng }),
    });
    return response.json();
};

export const getLocations = async () => {
    const response = await fetch(`${API_URL}/locations`);
    return response.json();
};
