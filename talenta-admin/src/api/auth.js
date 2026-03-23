import api from '../lib/api';

export const authApi = {
    getMe: () => api.get('/api/auth/me'),
    login: (credentials) => api.post('/api/auth/login', credentials),
    logout: () => api.post('/api/auth/logout')
};
