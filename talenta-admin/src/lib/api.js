import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    withCredentials: true,
})

// Add a request interceptor to include the Bearer token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('talenta_access_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Automatically try to refresh access token on 401
api.interceptors.response.use(
    (response) => {
        // If this is a login response, store the tokens
        if (response.config.url.includes('/auth/login') && response.data.access_token) {
            localStorage.setItem('talenta_access_token', response.data.access_token)
            localStorage.setItem('talenta_refresh_token', response.data.refresh_token)
        }
        return response
    },
    async (error) => {
        const original = error.config
        const url = original?.url || ''

        const skipRefresh =
            original._retry ||
            url.includes('/auth/refresh') ||
            url.includes('/auth/login')

        if (error.response?.status === 401 && !skipRefresh) {
            original._retry = true
            const refreshToken = localStorage.getItem('talenta_refresh_token')

            try {
                const res = await axios.post(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/refresh`,
                    { refresh_token: refreshToken }, // Send in body as backup
                    { withCredentials: true }
                )

                // Store new tokens
                if (res.data.access_token) {
                    localStorage.setItem('talenta_access_token', res.data.access_token)
                    localStorage.setItem('talenta_refresh_token', res.data.refresh_token)

                    // Update header and retry
                    original.headers.Authorization = `Bearer ${res.data.access_token}`
                    return api(original)
                }
            } catch {
                if (!window.location.pathname.startsWith('/login')) {
                    localStorage.removeItem('talenta_access_token')
                    localStorage.removeItem('talenta_refresh_token')
                    window.location.href = '/login'
                }
            }
        }
        return Promise.reject(error)
    }
)

export default api

