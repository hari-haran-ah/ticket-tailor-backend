import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [admin, setAdmin] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchMe = useCallback(async () => {
        try {
            const { data } = await api.get('/api/auth/me')
            setAdmin(data)
        } catch {
            setAdmin(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchMe() }, [fetchMe])

    const login = async (email, password) => {
        const { data } = await api.post('/api/auth/login', { email, password })
        setAdmin(data.admin)
        return data
    }

    const logout = async () => {
        await api.post('/api/auth/logout')
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
