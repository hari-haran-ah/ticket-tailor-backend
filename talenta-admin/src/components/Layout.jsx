import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
    LayoutDashboard, Users, CalendarDays, BarChart3,
    LogOut, Menu, X, Zap, DollarSign
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import LogoutModal from './LogoutModal'

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clients', icon: Users, label: 'Clients' },
    { to: '/events', icon: CalendarDays, label: 'Events' },
    { to: '/payments', icon: DollarSign, label: 'Payments' },
    { to: '/analysis', icon: BarChart3, label: 'Analysis' },
]

export default function Layout({ children }) {
    const { admin, logout } = useAuth()
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

    const handleLogout = () => {
        setShowLogoutConfirm(false)
        logout()
    }

    return (
        <div className="flex h-screen overflow-hidden bg-dark-950">
            {/* Sidebar */}
            <aside
                className={`${sidebarOpen ? 'w-64' : 'w-16'} flex-shrink-0 bg-dark-900 border-r border-white/5
                    flex flex-col transition-all duration-300`}
            >
                {/* Logo */}
                <div className="relative flex items-center gap-3 px-4 py-6 border-b border-white/5">
                    <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-600/20">
                        <Zap size={16} className="text-white" fill="currentColor" />
                    </div>
                    {sidebarOpen && (
                        <span className="text-lg font-bold text-white tracking-tight animate-fade-in">Talenta</span>
                    )}

                    {/* Toggle Button - Floating on the edge */}
                    <button
                        className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-dark-800 border border-white/10 rounded-full 
                                   flex items-center justify-center text-white/40 hover:text-white hover:bg-primary-600 
                                   transition-all duration-300 z-50 shadow-xl`}
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <X size={12} /> : <Menu size={12} />}
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-2 py-4 space-y-1">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                 ${isActive
                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            <Icon size={18} className="flex-shrink-0" />
                            {sidebarOpen && label}
                        </NavLink>
                    ))}
                </nav>

                {/* User + Logout */}
                <div className="px-2 py-4 border-t border-white/5">
                    {sidebarOpen && (
                        <div className="px-3 py-2 mb-2">
                            <p className="text-xs font-medium text-white truncate">{admin?.full_name}</p>
                            <p className="text-xs text-white/40 truncate">{admin?.email}</p>
                        </div>
                    )}
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium
                       text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                    >
                        <LogOut size={18} className="flex-shrink-0" />
                        {sidebarOpen && 'Logout'}
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto">
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
