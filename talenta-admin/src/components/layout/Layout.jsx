import { useState, useCallback, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
    LayoutDashboard, Users, CalendarDays, BarChart3,
    LogOut, Zap, DollarSign, Menu, X, PanelLeftClose,
    Sun, Moon, Monitor, User, ChevronDown
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import LogoutModal from '../auth/LogoutModal'

const navItems = [
    //{ to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clients', icon: Users, label: 'Clients' },
    { to: '/events', icon: CalendarDays, label: 'Events' },
    //{ to: '/payments', icon: DollarSign, label: 'Payments' },
    //{ to: '/analysis', icon: BarChart3, label: 'Analysis' },
]

const SIDEBAR_WIDTH_EXPANDED = 240
const SIDEBAR_WIDTH_COLLAPSED = 72
const SIDEBAR_WIDTH_EXPANDED_3XL = 280
const SIDEBAR_WIDTH_EXPANDED_4XL = 320

export default function Layout({ children }) {
    const { admin, logout } = useAuth()
    const { theme, resolvedTheme, toggleTheme } = useTheme()
    const location = useLocation()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
    const profileRef = useRef(null)

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        setMobileOpen(false)
    }, [location.pathname])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setProfileOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = () => {
        setShowLogoutConfirm(false)
        logout()
    }

    const toggleSidebar = () => setIsCollapsed(!isCollapsed)

    const getSidebarWidth = () => {
        if (isCollapsed) return SIDEBAR_WIDTH_COLLAPSED
        if (windowWidth >= 2560) return SIDEBAR_WIDTH_EXPANDED_4XL
        if (windowWidth >= 1920) return SIDEBAR_WIDTH_EXPANDED_3XL
        return SIDEBAR_WIDTH_EXPANDED
    }

    const formatName = (name) => {
        if (!name) return ''
        return name.split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ')
    }

    const getThemeIcon = () => {
        switch (theme) {
            case 'light': return <Sun size={16} />
            case 'dark': return <Moon size={16} />
            default: return <Monitor size={16} />
        }
    }

    // ── Shared Nav Links ──────────────────────────────────────────────────────
    const NavLinks = ({ collapsed = false, onClick }) => (
        <nav className="flex-1 px-2 3xl:px-3 py-3 3xl:py-4 space-y-0.5 3xl:space-y-1 overflow-hidden">
            {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={onClick}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                        `flex items-center transition-all duration-200 font-medium whitespace-nowrap
                        ${collapsed
                            ? 'w-9 h-9 3xl:w-10 3xl:h-10 mx-auto justify-center p-0'
                            : 'gap-3 px-3 3xl:px-4 py-2 3xl:py-2.5 w-full'}
                        ${isActive
                            ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-900 dark:border-zinc-700 rounded-lg shadow-sm'
                            : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent rounded-lg'
                        }`
                    }
                >
                    <Icon size={windowWidth >= 1920 ? 18 : 16} className="flex-shrink-0" />
                    {!collapsed && <span className="whitespace-nowrap text-sm 3xl:text-base">{label}</span>}
                </NavLink>
            ))}
        </nav>
    )

    const UserFooter = ({ collapsed = false }) => (
        <div className="px-2 3xl:px-3 py-3 3xl:py-4 overflow-hidden border-t border-zinc-200 dark:border-zinc-800">
            {!collapsed && (
                <div className="px-3 3xl:px-4 py-2 3xl:py-2.5 mb-1 flex flex-col">
                    <p className="text-xs 3xl:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{formatName(admin?.full_name)}</p>
                    <p className="text-xs 3xl:text-sm text-zinc-500 dark:text-zinc-400 truncate">{admin?.email}</p>
                </div>
            )}
            <button
                onClick={() => setShowLogoutConfirm(true)}
                title={collapsed ? 'Logout' : undefined}
                className={`flex items-center text-sm 3xl:text-base font-medium text-zinc-500 dark:text-zinc-400 transition-all hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg
                ${collapsed ? 'w-9 h-9 3xl:w-10 3xl:h-10 mx-auto justify-center p-0' : 'gap-3 px-3 3xl:px-4 py-2 3xl:py-2.5 w-full'}`}
            >
                <LogOut size={windowWidth >= 1920 ? 18 : 16} className="flex-shrink-0" />
                {!collapsed && 'Sign out'}
            </button>
        </div>
    )

    return (
        <div className="flex h-screen overflow-hidden select-none bg-zinc-100 dark:bg-zinc-950">

            {/* ══ DESKTOP Sidebar ══════════════════════════════════════════════ */}
            <aside
                style={{ width: getSidebarWidth() }}
                className="hidden md:flex flex-shrink-0 bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex-col relative transition-all duration-200 ease-out z-10"
            >
                {/* Header + Toggle */}
                <div className={`flex items-center px-4 3xl:px-5 h-[60px] 3xl:h-[72px] shrink-0 border-b border-zinc-200 dark:border-zinc-800 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-2.5 3xl:gap-3">
                            <div className="w-8 h-8 3xl:w-10 3xl:h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-300 dark:border-zinc-700">
                                <Zap size={windowWidth >= 1920 ? 16 : 14} className="text-zinc-900 dark:text-zinc-300" fill="currentColor" />
                            </div>
                            <span className="text-base 3xl:text-lg font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                Talenta
                            </span>
                        </div>
                    )}
                    <button
                        onClick={toggleSidebar}
                        className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                        title={isCollapsed ? "Expand sidebar" : "Close sidebar"}
                    >
                        <PanelLeftClose size={18} className={`transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                <NavLinks collapsed={isCollapsed} />
                <UserFooter collapsed={isCollapsed} />
            </aside>

            {/* ══ MOBILE Top Bar ═══════════════════════════════════════════════ */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center border border-zinc-300 dark:border-zinc-700">
                        <Zap size={14} className="text-zinc-900 dark:text-zinc-300" fill="currentColor" />
                    </div>
                    <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Talenta</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-md text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 transition-colors"
                    >
                        {getThemeIcon()}
                    </button>
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="p-2 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <Menu size={18} />
                    </button>
                </div>
            </div>

            {/* ══ MOBILE Drawer ════════════════════════════════════════════════ */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                    <aside className="relative w-64 bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full shadow-xl animate-in slide-in-from-left duration-200">
                        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center border border-zinc-300 dark:border-zinc-700">
                                    <Zap size={14} className="text-zinc-900 dark:text-zinc-300" fill="currentColor" />
                                </div>
                                <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Talenta</span>
                            </div>
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <NavLinks collapsed={false} onClick={() => setMobileOpen(false)} />

                        <div className="px-3 py-2 mx-2 mb-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{formatName(admin?.full_name)}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{admin?.email}</p>
                        </div>

                        <UserFooter collapsed={false} />
                    </aside>
                </div>
            )}

            {/* ══ MAIN CONTENT ════════════════════════════════════════════════ */}
            <main className="flex-1 flex flex-col overflow-hidden pt-[56px] md:pt-0">
                {/* Content Header */}
                <header className="hidden md:flex items-center justify-end gap-2 3xl:gap-3 px-6 3xl:px-8 h-[60px] 3xl:h-[72px] shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 3xl:p-2.5 rounded-md text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 transition-colors"
                        title={`Theme: ${theme}`}
                    >
                        {getThemeIcon()}
                    </button>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            className="flex items-center gap-2 px-2 3xl:px-3 py-1.5 3xl:py-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <div className="w-7 h-7 3xl:w-8 3xl:h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                                <User size={windowWidth >= 1920 ? 16 : 14} className="text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <span className="text-sm 3xl:text-base font-medium text-zinc-700 dark:text-zinc-300 max-w-[140px] 3xl:max-w-[180px] truncate">
                                {formatName(admin?.full_name)}
                            </span>
                            <ChevronDown size={windowWidth >= 1920 ? 16 : 14} className={`text-zinc-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {profileOpen && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg overflow-hidden z-50">
                                <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                        {formatName(admin?.full_name)}
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                        {admin?.email}
                                    </p>
                                </div>
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            setProfileOpen(false)
                                            setShowLogoutConfirm(true)
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                    >
                                        <LogOut size={14} />
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </main>

            <LogoutModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
            />
        </div>
    )
}
