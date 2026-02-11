import api from './api';

export const authService = {
    register: async (data: { name: string; email: string; password: string; role: 'patient' | 'caregiver' }) => {
        const response = await api.post('/auth/register', data);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data));
        }
        return response.data;
    },

    login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data));
        }
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },
};

export const chatService = {
    sendMessage: async (message: string) => {
        const response = await api.post('/chat/message', { message });
        return response.data;
    },

    getHistory: async (limit = 20) => {
        const response = await api.get(`/chat/history?limit=${limit}`);
        return response.data;
    },

    search: async (query: string) => {
        const response = await api.post('/chat/search', { query });
        return response.data;
    },
};

export const eventService = {
    getAll: async () => {
        const response = await api.get('/events');
        return response.data;
    },

    create: async (data: any) => {
        const response = await api.post('/events', data);
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await api.put(`/events/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/events/${id}`);
        return response.data;
    },
};

export const caregiverService = {
    linkPatient: async (email: string) => {
        const response = await api.post('/caregiver/patient/link', { email });
        return response.data;
    },
    addMemory: async (patientId: string, message: string) => {
        const response = await api.post(`/caregiver/patient/${patientId}/memory`, { message });
        return response.data;
    },

    getPatients: async () => {
        const response = await api.get('/caregiver/patients');
        return response.data;
    },

    getPatientActivity: async (patientId: string, limit = 10) => {
        const response = await api.get(`/caregiver/patient/${patientId}/activity?limit=${limit}`);
        return response.data;
    },
};
