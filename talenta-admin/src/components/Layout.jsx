import { useState, useCallback, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
    LayoutDashboard, Users, CalendarDays, BarChart3,
    LogOut, Zap, DollarSign, Menu, X, PanelLeftClose
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import ThemeToggle from './ThemeToggle'
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
    const { resolvedTheme } = useTheme()
    const location = useLocation()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

    // Close mobile drawer on route change
    useEffect(() => {
        setMobileOpen(false)
    }, [location.pathname])

    const handleLogout = () => {
        setShowLogoutConfirm(false)
        logout()
    }

    const toggleSidebar = () => setIsCollapsed(!isCollapsed)

    // ── Theme-aware styling helpers ─────────────────────────────────────────
    const getNavLinkStyles = (isActive) => {
        if (resolvedTheme === 'light') {
            return isActive ? {
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            } : {
                background: 'transparent',
                border: '1px solid transparent'
            }
        }
        // Dark theme styles
        return isActive ? {
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid #2f2f2f',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
        } : {
            background: 'transparent',
            border: '1px solid transparent'
        }
    }

    const getNavLinkHoverStyles = () => {
        return resolvedTheme === 'light'
            ? { background: '#f9fafb' }
            : { background: 'rgba(255,255,255,0.05)' }
    }

    // ── Shared Nav Links ──────────────────────────────────────────────────────
    const NavLinks = ({ collapsed = false, onClick }) => (
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-hidden">
            {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={onClick}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                        `flex items-center text-sm font-medium transition-all duration-300
                        ${collapsed 
                            ? 'w-10 h-10 mx-auto justify-center rounded-xl p-0' 
                            : 'gap-3 px-3 py-2.5 rounded-lg w-full'}
                        ${isActive
                            ? 'text-gray-900 dark:text-white shadow-lg'
                            : 'text-gray-600 dark:text-premium-text-secondary hover:text-gray-900 dark:hover:text-white'
                        }`
                    }
                    style={({ isActive }) => getNavLinkStyles(isActive)}
                    onMouseEnter={(e) => {
                        if (!e.currentTarget.classList.contains('active')) {
                            const hoverStyles = getNavLinkHoverStyles()
                            e.currentTarget.style.background = hoverStyles.background
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!e.currentTarget.classList.contains('active')) {
                            e.currentTarget.style.background = 'transparent'
                        }
                    }}
                >
                    <Icon size={18} className="flex-shrink-0" />
                    {!collapsed && <span className="whitespace-nowrap">{label}</span>}
                </NavLink>
            ))}
        </nav>
    )

    const UserFooter = ({ collapsed = false }) => (
        <div className="px-2 py-4 overflow-hidden border-t border-gray-300 dark:border-[#2f2f2f]">
            {!collapsed && (
                <div className="px-3 py-2 mb-2 flex flex-col items-center sm:items-start text-center sm:text-left">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate w-full">{admin?.full_name}</p>
                    <p className="text-xs text-gray-600 dark:text-premium-text-secondary truncate w-full">{admin?.email}</p>
                </div>
            )}
            <button
                onClick={() => setShowLogoutConfirm(true)}
                title={collapsed ? 'Logout' : undefined}
                className={`flex items-center text-sm font-medium text-gray-600 dark:text-premium-text-secondary border border-transparent transition-all duration-300 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-[#2f2f2f]/50 dark:hover:border-[#2f2f2f] 
                ${collapsed ? 'w-10 h-10 mx-auto justify-center rounded-xl p-0' : 'gap-3 px-3 py-2.5 w-full rounded-lg'}`}
            >
                <LogOut size={18} className="flex-shrink-0" />
                {!collapsed && 'Logout'}
            </button>
        </div>
    )

    return (
        <div className="flex h-screen overflow-hidden select-none bg-[#ffffff] dark:bg-[#212121]">

            {/* ══════════════════════════════════════════
                DESKTOP Sidebar (md+)
            ══════════════════════════════════════════ */}
            <aside
                style={{ width: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED }}
                className="hidden md:flex flex-shrink-0 bg-white dark:bg-[#171717] border-r border-gray-300 dark:border-[#2f2f2f] flex-col relative transition-all duration-300 ease-in-out"
                data-theme="sidebar"
            >
                {/* Header Toggle Area */}
                <div className={`flex items-center px-4 py-6 border-b border-gray-300 dark:border-[#2f2f2f] overflow-hidden min-h-[80px] ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {/* Logo left */}
                    {!isCollapsed && (
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-transparent shadow-sm dark:shadow-black/20 flex items-center justify-center flex-shrink-0">
                                <Zap size={16} className="text-gray-700 dark:text-white" fill="currentColor" />
                            </div>
                            <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight whitespace-nowrap">
                                Talenta
                            </span>
                        </div>
                    )}
                    {/* Toggle Button right */}
                    <button
                        onClick={toggleSidebar}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-[#2f2f2f] transition-colors"
                        title={isCollapsed ? "Expand sidebar" : "Close sidebar"}
                    >
                        <PanelLeftClose size={20} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Theme Toggle */}
                <div className={`px-4 py-3 border-b border-gray-300 dark:border-[#2f2f2f] flex ${isCollapsed ? 'justify-center overflow-hidden' : ''}`}>
                    <ThemeToggle collapsed={isCollapsed} />
                </div>

                <NavLinks collapsed={isCollapsed} />
                <UserFooter collapsed={isCollapsed} />
            </aside>

            {/* ══════════════════════════════════════════
                MOBILE Top Bar (< md)
            ══════════════════════════════════════════ */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 shadow-lg bg-white/95 dark:bg-[#171717]/95 backdrop-blur-[10px] border-b border-gray-300 dark:border-[#2f2f2f]">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-transparent shadow-sm dark:shadow-black/20 flex items-center justify-center">
                        <Zap size={14} className="text-gray-700 dark:text-white" fill="currentColor" />
                    </div>
                    <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Talenta</span>
                </div>
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 rounded-lg text-gray-600 dark:text-premium-text-secondary hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-[#2f2f2f] transition-all duration-300"
                >
                    <Menu size={20} />
                </button>
            </div>

            {/* ══════════════════════════════════════════
                MOBILE Drawer Overlay
            ══════════════════════════════════════════ */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />

                    {/* Drawer panel */}
                    <aside className="relative w-72 bg-white dark:bg-[#171717] border-r border-gray-300 dark:border-[#2f2f2f] flex flex-col h-full shadow-2xl animate-in slide-in-from-left duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-300 dark:border-[#2f2f2f]">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-[#2f2f2f] border border-gray-300 dark:border-transparent shadow-sm dark:shadow-black/20 flex items-center justify-center">
                                    <Zap size={16} className="text-gray-700 dark:text-white" fill="currentColor" />
                                </div>
                                <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Talenta</span>
                            </div>
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="p-1.5 rounded-lg text-gray-600 dark:text-premium-text-secondary hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-[#2f2f2f] transition-all duration-300"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Theme Toggle */}
                        <div className="px-4 py-3 border-b border-gray-300 dark:border-[#2f2f2f]">
                            <ThemeToggle />
                        </div>

                        <NavLinks collapsed={false} onClick={() => setMobileOpen(false)} />

                        {/* User info */}
                        <div className="px-4 py-3 mx-2 mb-2 rounded-lg bg-gray-100 dark:bg-[#212121] border border-gray-300 dark:border-[#2f2f2f]">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{admin?.full_name}</p>
                            <p className="text-xs text-gray-600 dark:text-premium-text-secondary truncate mt-0.5">{admin?.email}</p>
                        </div>

                        <UserFooter collapsed={false} />
                    </aside>
                </div>
            )}

            {/* ══════════════════════════════════════════
                MAIN CONTENT
            ══════════════════════════════════════════ */}
            <main className="flex-1 overflow-y-auto select-text pt-[56px] md:pt-0">
                {children}
            </main>

            <LogoutModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
            />
        </div>
    )
}
