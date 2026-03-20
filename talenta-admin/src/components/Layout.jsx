import { useState, useCallback, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
    LayoutDashboard, Users, CalendarDays, BarChart3,
    LogOut, Zap, DollarSign, Menu, X, PanelLeftClose,
    Sun, Moon, Monitor, User, ChevronDown
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import LogoutModal from './LogoutModal'

const navItems = [
    //{ to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clients', icon: Users, label: 'Clients' },
    { to: '/events', icon: CalendarDays, label: 'Events' },
    //{ to: '/payments', icon: DollarSign, label: 'Payments' },
    //{ to: '/analysis', icon: BarChart3, label: 'Analysis' },
]

const SIDEBAR_WIDTH_EXPANDED = 240
const SIDEBAR_WIDTH_COLLAPSED = 72

export default function Layout({ children }) {
    const { admin, logout } = useAuth()
    const { theme, resolvedTheme, toggleTheme } = useTheme()
    const location = useLocation()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const profileRef = useRef(null)

    // Close mobile drawer on route change
    useEffect(() => {
        setMobileOpen(false)
    }, [location.pathname])

    // Close profile dropdown on click outside
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

    // ── Shared Nav Links (theme-aware) ──────────────────────────────────
    const NavLinks = ({ collapsed = false, onClick }) => (
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-hidden">
            {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={onClick}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                        `flex items-center text-sm font-medium transition-all rounded-lg
                        ${collapsed
                            ? 'w-9 h-9 mx-auto justify-center p-0'
                            : 'gap-3 px-3 py-2 w-full'}
                        ${isActive
                            ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent'
                        }`
                    }
                >
                    <Icon size={16} className="flex-shrink-0" />
                    {!collapsed && <span className="whitespace-nowrap">{label}</span>}
                </NavLink>
            ))}
        </nav>
    )

    const UserFooter = ({ collapsed = false }) => (
        <div className="px-2 py-3 overflow-hidden border-t border-zinc-200 dark:border-zinc-700">
            {!collapsed && (
                <div className="px-3 py-2 mb-1 flex flex-col">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{formatName(admin?.full_name)}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{admin?.email}</p>
                </div>
            )}
            <button
                onClick={() => setShowLogoutConfirm(true)}
                title={collapsed ? 'Logout' : undefined}
                className={`flex items-center text-sm font-medium text-zinc-600 dark:text-zinc-400 transition-all hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg
                ${collapsed ? 'w-9 h-9 mx-auto justify-center p-0' : 'gap-3 px-3 py-2 w-full'}`}
            >
                <LogOut size={16} className="flex-shrink-0" />
                {!collapsed && 'Sign out'}
            </button>
        </div>
    )

    return (
        <div className="flex h-screen overflow-hidden select-none bg-[#f0f1f3] dark:bg-[#0a0a0a]">

            {/* ══════════════════════════════════════════
                DESKTOP Sidebar (md+) - Theme Aware
            ══════════════════════════════════════════ */}
            <aside
                style={{ width: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED }}
                className="hidden md:flex flex-shrink-0 bg-[#fafafa] dark:bg-[#18181b] border-r border-zinc-200 dark:border-zinc-700 flex-col relative transition-all duration-200 ease-out"
            >
                {/* Header Toggle Area */}
                <div className={`flex items-center px-4 h-[60px] shrink-0 border-b border-zinc-200 dark:border-zinc-700 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {/* Logo left */}
                    {!isCollapsed && (
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                <Zap size={14} className="text-zinc-700 dark:text-zinc-300" fill="currentColor" />
                            </div>
                            <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                Talenta
                            </span>
                        </div>
                    )}
                    {/* Toggle Button right */}
                    <button
                        onClick={toggleSidebar}
                        className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title={isCollapsed ? "Expand sidebar" : "Close sidebar"}
                    >
                        <PanelLeftClose size={18} className={`transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                <NavLinks collapsed={isCollapsed} />
                <UserFooter collapsed={isCollapsed} />
            </aside>

            {/* ══════════════════════════════════════════
                MOBILE Top Bar (< md) - Theme Aware
            ══════════════════════════════════════════ */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2.5 bg-[#fafafa]/95 dark:bg-[#18181b]/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                        <Zap size={14} className="text-zinc-700 dark:text-zinc-300" fill="currentColor" />
                    </div>
                    <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Talenta</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-md text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-[#d1d5db] dark:border-zinc-700 transition-colors"
                    >
                        {getThemeIcon()}
                    </button>
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="p-2 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <Menu size={18} />
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════
                MOBILE Drawer Overlay - Theme Aware
            ══════════════════════════════════════════ */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />

                    {/* Drawer panel */}
                    <aside className="relative w-64 bg-[#fafafa] dark:bg-[#18181b] border-r border-zinc-200 dark:border-zinc-700 flex flex-col h-full shadow-xl animate-in slide-in-from-left duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                                    <Zap size={14} className="text-zinc-700 dark:text-zinc-300" fill="currentColor" />
                                </div>
                                <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Talenta</span>
                            </div>
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <NavLinks collapsed={false} onClick={() => setMobileOpen(false)} />

                        {/* User info */}
                        <div className="px-3 py-2 mx-2 mb-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{formatName(admin?.full_name)}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{admin?.email}</p>
                        </div>

                        <UserFooter collapsed={false} />
                    </aside>
                </div>
            )}

            {/* ══════════════════════════════════════════
                MAIN CONTENT
            ══════════════════════════════════════════ */}
            <main className="flex-1 flex flex-col overflow-hidden pt-[56px] md:pt-0">
                {/* Content Header - Theme Aware */}
                <header className="hidden md:flex items-center justify-end gap-2 px-6 h-[60px] shrink-0 border-b border-zinc-200 dark:border-zinc-700 bg-[#fafafa] dark:bg-[#18181b]">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-md text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-[#d1d5db] dark:border-zinc-700 transition-colors"
                        title={`Theme: ${theme}`}
                    >
                        {getThemeIcon()}
                    </button>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                                <User size={14} className="text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 max-w-[140px] truncate">
                                {formatName(admin?.full_name)}
                            </span>
                            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {profileOpen && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-[#1f1f23] border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden z-50">
                                <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
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
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
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
