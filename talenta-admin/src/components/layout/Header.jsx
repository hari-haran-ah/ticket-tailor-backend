import { useState, useRef, useEffect } from 'react'
import { Sun, Moon, Monitor, User, LogOut, ChevronDown } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'

export default function Header({ title, subtitle, onLogout }) {
    const { theme, toggleTheme } = useTheme()
    const { admin } = useAuth()
    const [profileOpen, setProfileOpen] = useState(false)
    const dropdownRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setProfileOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const getThemeIcon = () => {
        switch (theme) {
            case 'light': return <Sun size={16} />
            case 'dark': return <Moon size={16} />
            default: return <Monitor size={16} />
        }
    }

    const formatName = (name) => {
        if (!name) return ''
        return name.split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ')
    }

    return (
        <header className="sticky top-0 z-30 bg-gray-50/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800">
            <div className="flex items-center justify-between px-4 md:px-6 py-3">
                <div>
                    {subtitle && (
                        <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
                            {subtitle}
                        </p>
                    )}
                    {title && (
                        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {title}
                        </h1>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="btn-icon"
                        title={`Theme: ${theme}`}
                    >
                        {getThemeIcon()}
                    </button>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                                <User size={14} className="text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <span className="hidden sm:block text-sm font-medium text-zinc-700 dark:text-zinc-300 max-w-[120px] truncate">
                                {formatName(admin?.full_name)}
                            </span>
                            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {profileOpen && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg overflow-hidden">
                                <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                        {formatName(admin?.full_name)}
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-500 truncate mt-0.5">
                                        {admin?.email}
                                    </p>
                                </div>
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            setProfileOpen(false)
                                            onLogout?.()
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        <LogOut size={14} />
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
