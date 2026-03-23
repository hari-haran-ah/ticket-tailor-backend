import api from '../lib/api';

export const eventApi = {
    getAll: (clientId) => api.get(`/api/tt/${clientId}/events`),
    getById: (clientId, eventId) => api.get(`/api/tt/${clientId}/events/${eventId}`),
    create: (clientId, data) => api.post(`/api/tt/${clientId}/events`, data),
    update: (clientId, eventId, data) => api.patch(`/api/tt/${clientId}/events/${eventId}`, data),
    delete: (clientId, eventId) => api.delete(`/api/tt/${clientId}/events/${eventId}`),
    
    createTicket: (clientId, eventId, data) => api.post(`/api/tt/${clientId}/events/${eventId}/ticket_types`, data),
    updateTicket: (clientId, eventId, ticketId, data) => api.post(`/api/tt/${clientId}/events/${eventId}/ticket_types/${ticketId}`, data),
    deleteTicket: (clientId, eventId, ticketId) => api.delete(`/api/tt/${clientId}/events/${eventId}/ticket_types/${ticketId}`),
    
    createGroup: (clientId, eventId, data) => api.post(`/api/tt/${clientId}/events/${eventId}/ticket_groups`, data),
    updateGroup: (clientId, eventId, groupId, data) => api.post(`/api/tt/${clientId}/events/${eventId}/ticket_groups/${groupId}`, data),
    deleteGroup: (clientId, eventId, groupId) => api.delete(`/api/tt/${clientId}/events/${eventId}/ticket_groups/${groupId}`)
};
