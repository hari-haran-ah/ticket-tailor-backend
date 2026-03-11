import { useState, useCallback, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
    LayoutDashboard, Users, CalendarDays, BarChart3,
    LogOut, ChevronRight, Zap, DollarSign, Menu, X
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import LogoutModal from './LogoutModal'

const navItems = [
    // { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clients', icon: Users, label: 'Clients' },
    { to: '/events', icon: CalendarDays, label: 'Events' },
    // { to: '/payments', icon: DollarSign, label: 'Payments' },
    // { to: '/analysis', icon: BarChart3, label: 'Analysis' },
]

const MIN_WIDTH = 64
const MAX_WIDTH = 320
const SNAP_COLLAPSED = 64
const SNAP_EXPANDED = 240

export default function Layout({ children }) {
    const { admin, logout } = useAuth()
    const location = useLocation()
    const [sidebarWidth, setSidebarWidth] = useState(240)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
    const isDragging = useRef(false)
    const startX = useRef(0)
    const startWidth = useRef(0)

    // Close mobile drawer on route change
    useEffect(() => {
        setMobileOpen(false)
    }, [location.pathname])

    const isCollapsed = sidebarWidth <= 80

    const handleLogout = () => {
        setShowLogoutConfirm(false)
        logout()
    }

    // ── Drag-to-resize (desktop only) ────────────────────────────────────────
    const onMouseDown = useCallback((e) => {
        e.preventDefault()
        isDragging.current = true
        startX.current = e.clientX
        startWidth.current = sidebarWidth

        const onMouseMove = (e) => {
            if (!isDragging.current) return
            const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + (e.clientX - startX.current)))
            setSidebarWidth(newWidth)
        }

        const onMouseUp = (e) => {
            isDragging.current = false
            const finalWidth = startWidth.current + (e.clientX - startX.current)
            setSidebarWidth(finalWidth < 130 ? SNAP_COLLAPSED : SNAP_EXPANDED)
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }, [sidebarWidth])

    const toggleSidebar = () => setSidebarWidth(isCollapsed ? SNAP_EXPANDED : SNAP_COLLAPSED)

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
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                        ${isActive
                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                            : 'text-white/50 hover:text-white hover:bg-white/5'
                        }`
                    }
                >
                    <Icon size={18} className="flex-shrink-0" />
                    {!collapsed && <span className="whitespace-nowrap">{label}</span>}
                </NavLink>
            ))}
        </nav>
    )

    const UserFooter = ({ collapsed = false }) => (
        <div className="px-2 py-4 border-t border-white/5 overflow-hidden">
            {!collapsed && (
                <div className="px-3 py-2 mb-2">
                    <p className="text-xs font-medium text-white truncate">{admin?.full_name}</p>
                    <p className="text-xs text-white/40 truncate">{admin?.email}</p>
                </div>
            )}
            <button
                onClick={() => setShowLogoutConfirm(true)}
                title={collapsed ? 'Logout' : undefined}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium
                       text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            >
                <LogOut size={18} className="flex-shrink-0" />
                {!collapsed && 'Logout'}
            </button>
        </div>
    )

    return (
        <div className="flex h-screen overflow-hidden bg-dark-950 select-none">

            {/* ══════════════════════════════════════════
                DESKTOP Sidebar (md+)
            ══════════════════════════════════════════ */}
            <aside
                style={{ width: sidebarWidth }}
                className="hidden md:flex flex-shrink-0 bg-dark-900 border-r border-white/5 flex-col relative transition-none"
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-4 py-6 border-b border-white/5 overflow-hidden">
                    <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-600/20">
                        <Zap size={16} className="text-white" fill="currentColor" />
                    </div>
                    {!isCollapsed && (
                        <span className="text-lg font-bold text-white tracking-tight whitespace-nowrap">
                            Talenta
                        </span>
                    )}
                </div>

                <NavLinks collapsed={isCollapsed} />
                <UserFooter collapsed={isCollapsed} />

                {/* Resize handle */}
                <div
                    onMouseDown={onMouseDown}
                    onClick={toggleSidebar}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize group z-10"
                    title="Drag to resize or click to toggle"
                >
                    <div className="absolute inset-y-0 right-0 w-px bg-white/5 group-hover:bg-primary-500/50 transition-colors" />
                    <div className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 w-5 h-5
                                    bg-dark-800 border border-white/10 rounded-full flex items-center justify-center
                                    opacity-0 group-hover:opacity-100 transition-all shadow-xl">
                        <ChevronRight
                            size={10}
                            className={`text-white/60 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                        />
                    </div>
                </div>
            </aside>

            {/* ══════════════════════════════════════════
                MOBILE Top Bar (< md)
            ══════════════════════════════════════════ */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between
                            px-4 py-3 bg-dark-900/95 backdrop-blur-xl border-b border-white/5 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20">
                        <Zap size={14} className="text-white" fill="currentColor" />
                    </div>
                    <span className="text-base font-bold text-white tracking-tight">Talenta</span>
                </div>
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
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
                    <aside className="relative w-72 flex flex-col bg-dark-900 border-r border-white/10 h-full shadow-2xl animate-in slide-in-from-left duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-5 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20">
                                    <Zap size={16} className="text-white" fill="currentColor" />
                                </div>
                                <span className="text-lg font-bold text-white tracking-tight">Talenta</span>
                            </div>
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <NavLinks collapsed={false} onClick={() => setMobileOpen(false)} />

                        {/* User info */}
                        <div className="px-4 py-3 mx-2 mb-2 bg-white/5 rounded-xl">
                            <p className="text-xs font-semibold text-white truncate">{admin?.full_name}</p>
                            <p className="text-xs text-white/40 truncate mt-0.5">{admin?.email}</p>
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
