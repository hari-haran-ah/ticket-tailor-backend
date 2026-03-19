import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

const getInitialTheme = () => {
    if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('talenta_theme_preference')
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
            return savedTheme
        }
    }
    return 'system'
}

const getInitialSystemTheme = () => {
    if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'dark'
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(getInitialTheme)
    const [systemTheme, setSystemTheme] = useState(getInitialSystemTheme)

    const resolvedTheme = theme === 'system' ? systemTheme : theme

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        const handleChange = (e) => {
            setSystemTheme(e.matches ? 'dark' : 'light')
        }

        setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    useEffect(() => {
        const root = document.documentElement

        if (resolvedTheme === 'dark') {
            root.classList.add('dark')
            root.classList.remove('light')
            root.setAttribute('data-theme', 'dark')
        } else {
            root.classList.remove('dark')
            root.classList.add('light')
            root.setAttribute('data-theme', 'light')
        }
    }, [resolvedTheme])

    const setTheme = (newTheme) => {
        if (['light', 'dark', 'system'].includes(newTheme)) {
            setThemeState(newTheme)
            localStorage.setItem('talenta_theme_preference', newTheme)
        }
    }

    const toggleTheme = () => {
        // Three-way toggle: light → dark → system → light
        const themes = ['light', 'dark', 'system']
        const currentIndex = themes.indexOf(theme)
        const nextIndex = (currentIndex + 1) % themes.length
        setTheme(themes[nextIndex])
    }

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)
