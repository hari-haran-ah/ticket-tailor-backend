import api from '../lib/api';

export const paymentApi = {
    getAll: (queryString) => api.get(`/api/dashboard/payments?${queryString}`)
};
