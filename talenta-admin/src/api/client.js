import api from '../lib/api';

export const clientApi = {
    getAll: () => api.get('/api/clients'),
    getPaginated: (params) => api.get('/api/clients/paginated', { params }),
    getPaginatedQuery: (queryString) => api.get(`/api/clients/paginated?${queryString}`),
    getPageNum: (id, search) => api.get(`/api/clients/${id}/page?search=${search}`),
    getById: (id) => api.get(`/api/clients/${id}`),
    create: (data) => api.post('/api/clients', data),
    update: (id, data) => api.put(`/api/clients/${id}`, data),
    toggleStatus: (id) => api.patch(`/api/clients/${id}/toggle-status`)
};
