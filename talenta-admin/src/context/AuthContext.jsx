import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [admin, setAdmin] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchMe = useCallback(async () => {
        try {
            const { data } = await authApi.getMe()
            setAdmin(data)
        } catch {
            setAdmin(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchMe() }, [fetchMe])

    const login = async (email, password) => {
        const { data } = await authApi.login({ email, password })
        setAdmin(data.admin)
        return data
    }

    const logout = async () => {
        await authApi.logout()
        localStorage.removeItem('talenta_access_token')
        localStorage.removeItem('talenta_refresh_token')
        setAdmin(null)
        window.location.href = '/login'
    }

    return (
        <AuthContext.Provider value={{ admin, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
