import api from '../lib/api';

export const analysisApi = {
    getDashboard: () => api.get('/api/dashboard'),
    getClientAnalytics: (clientId) => api.get(`/api/tt/${clientId}/analytics`)
};
