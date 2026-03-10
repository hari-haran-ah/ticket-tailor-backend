import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    withCredentials: true, // Required to send/receive HttpOnly cookies
})

// Automatically try to refresh access token on 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config
        const url = original?.url || ''

        // Skip auto-refresh for:
        //  - requests that already retried
        //  - the refresh endpoint itself (avoid infinite loop)
        //  - the login endpoint
        const skipRefresh =
            original._retry ||
            url.includes('/auth/refresh') ||
            url.includes('/auth/login')

        if (error.response?.status === 401 && !skipRefresh) {
            original._retry = true
            try {
                await axios.post(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/refresh`,
                    {},
                    { withCredentials: true }
                )
                return api(original)
            } catch {
                // Refresh failed — only redirect if not already on /login
                if (!window.location.pathname.startsWith('/login')) {
                    window.location.href = '/login'
                }
            }
        }
        return Promise.reject(error)
    }
)

export default api
