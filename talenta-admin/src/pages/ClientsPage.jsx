import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import {
    Plus, Pencil, Trash2, X, Check, AlertCircle,
    Globe, Key, DollarSign, Phone, Mail, MapPin, Users,
    CalendarDays, Search, ChevronLeft, ChevronRight,
    Eye, ToggleLeft, ToggleRight, Power, RefreshCw
} from 'lucide-react'
import Skeleton from '../components/Skeleton'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
import Toast from '../components/Toast'

const PAGE_SIZE = 5



// ─── Toggle Status Confirmation Popup ────────────────────────────────────────
function ToggleStatusModal({ client, onClose, onConfirm, loading }) {
    if (!client) return null
    const willBeActive = !client.is_active
    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
            <div className="card w-full max-w-sm p-6 space-y-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gray-100 dark:bg-white/10">
                        <Power size={20} className="text-black dark:text-white" />
                    </div>
                    <div>
                        <h3 className="text-black dark:text-white font-semibold">
                            {willBeActive ? 'Activate' : 'Deactivate'} Client
                        </h3>
                        <p className="text-gray-500 dark:text-white/50 text-xs mt-0.5">{client.name}</p>
                    </div>
                </div>
                <p className="text-gray-600 dark:text-white/60 text-sm">
                    Are you sure you want to <strong className="text-black dark:text-white">
                        {willBeActive ? 'activate' : 'deactivate'}
                    </strong> <span className="text-black dark:text-white">{client.name}</span>?
                    {willBeActive
                        ? ' The client will be able to receive traffic immediately.'
                        : ' The client\'s frontend will receive a 404 error until reactivated.'}
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Updating…' : <><Check size={14} /> Confirm</>}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}



// ─── Skeleton Row ─────────────────────────────────────────────────────────────
function SkeletonTable() {
    return (
        <div className="card animate-pulse">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-300 dark:border-white/5">
                            {[80, 160, 140, 50, 60, 140, 60].map((w, i) => (
                                <th key={i} className="px-6 py-4">
                                    <Skeleton className={`h-3 rounded`} style={{ width: w }} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                            <tr key={i} className="border-b border-gray-300 dark:border-white/5">
                                <td className="px-6 py-5"><Skeleton className="w-32 h-4" /></td>
                                <td className="px-6 py-5"><Skeleton className="w-48 h-4" /></td>
                                <td className="px-6 py-5"><div className="space-y-2"><Skeleton className="w-40 h-3" /><Skeleton className="w-32 h-3" /></div></td>
                                <td className="px-6 py-5"><Skeleton className="w-10 h-4 ml-auto" /></td>
                                <td className="px-6 py-5"><Skeleton className="w-16 h-6 rounded-full mx-auto" /></td>
                                <td className="px-6 py-5"><Skeleton className="w-40 h-3" /></td>
                                <td className="px-6 py-5"><div className="flex justify-end gap-2"><Skeleton className="w-8 h-8 rounded-lg" /><Skeleton className="w-8 h-8 rounded-lg" /><Skeleton className="w-8 h-8 rounded-lg" /></div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClientsPage() {
    const navigate = useNavigate()
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [toast, setToast] = useState({ show: false, message: '' })
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [toggleTarget, setToggleTarget] = useState(null)
    const [toggling, setToggling] = useState(false)

    const load = async () => {
        setLoading(true)
        setError('')
        try {
            const { data } = await api.get('/api/clients/paginated', {
                params: { page, size: PAGE_SIZE, search: debouncedSearch }
            })
            setClients(data.items)
            setTotalPages(data.pages)
            setTotalItems(data.total)
        } catch (e) {
            setError(e.response?.data?.detail || 'Failed to load clients')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1)
        }, 300)
        return () => clearTimeout(handler)
    }, [search])

    useEffect(() => { load() }, [page, debouncedSearch])


    // ── Toggle Status ─────────────────────────────────────────────────────────
    const handleToggleStatus = async () => {
        if (!toggleTarget) return
        setToggling(true)
        try {
            const { data } = await api.patch(`/api/clients/${toggleTarget.id}/toggle-status`)
            setClients(cs => cs.map(c => c.id === data.id ? data : c))
            setToast({ show: true, message: `"${data.name}" is now ${data.is_active ? 'Active' : 'Inactive'}.` })
        } catch {
            setToast({ show: true, message: 'Failed to update status' })
        } finally {
            setToggling(false)
            setToggleTarget(null)
        }
    }

    return (
        <div className="p-4 md:p-8 space-y-5 md:space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-black dark:text-white">Clients</h1>
                    <p className="text-gray-500 dark:text-white/50 text-sm mt-1">{totalItems} client(s) registered</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={load} className="btn-secondary group flex items-center gap-2">
                        <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button onClick={() => navigate('/clients/new')} className="btn-primary flex items-center gap-2">
                        <Plus size={16} />
                        <span className="hidden sm:inline">New Client</span>
                        <span className="sm:hidden">New</span>
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-white/40" />
                <input
                    type="text"
                    placeholder="Search by name, domain, email…"
                    className="input-field pl-9 text-sm"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {error && (
                <div className="card p-4 flex items-center gap-3 text-black dark:text-white">
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            {/* ── Desktop Table (md+) ── */}
            {loading ? <SkeletonTable /> : (
                <div className="card overflow-hidden">

                    {/* TABLE — hidden on mobile */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-300 dark:border-white/10 text-gray-500 dark:text-white/50 text-xs uppercase tracking-wider">
                                    <th className="px-6 py-3 text-left">Client</th>
                                    <th className="px-6 py-3 text-left">Domain</th>
                                    <th className="px-6 py-3 text-left">Keys & Accounts</th>
                                    <th className="px-6 py-3 text-right">Fee %</th>
                                    <th className="px-6 py-3 text-center">Status</th>
                                    <th className="px-6 py-3 text-left">Contact</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.map(c => (
                                    <tr key={c.id} className="border-b border-gray-300 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-medium text-black dark:text-white">{c.name}</td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-white/60 font-mono text-xs max-w-[160px] truncate">{c.domain_name}</td>
                                        <td className="px-6 py-4 font-mono text-[10px] text-gray-500 dark:text-white/50">
                                            <div className="flex flex-col gap-1">
                                                <span>TT: {c.tt_api_key.substring(0, 12)}…</span>
                                                {c.stripe_account_id && <span className="text-black dark:text-white">Stripe: {c.stripe_account_id}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-700 dark:text-white/70">{c.platform_fee}%</td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setToggleTarget(c)}
                                                className="group flex items-center justify-center gap-1.5 mx-auto"
                                            >
                                                {c.is_active
                                                    ? <ToggleRight size={22} className="text-green-600 group-hover:text-green-700 transition-colors" />
                                                    : <ToggleLeft size={22} className="text-red-600 group-hover:text-red-700 transition-colors" />
                                                }
                                                <span className={`text-xs font-medium ${c.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                                    {c.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-white/50 text-xs">{c.contact_email || '—'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => navigate(`/clients/${c.id}/view`)} className="p-2 rounded-lg text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors" title="View Details"><Eye size={14} /></button>
                                                <button onClick={() => navigate(`/events/${c.id}`)} className="p-2 rounded-lg text-gray-600 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors" title="View Events"><CalendarDays size={14} /></button>
                                                <button onClick={() => navigate(`/clients/${c.id}/edit`)} className="p-2 rounded-lg text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors" title="Edit"><Pencil size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {clients.length === 0 && (
                            <div className="text-center py-16 text-gray-500 dark:text-white/40">
                                <Users size={40} className="mx-auto mb-3 opacity-40" />
                                {search ? `No clients match "${search}"` : 'No clients yet.'}
                            </div>
                        )}
                    </div>

                    {/* CARD LIST — shown only on mobile */}
                    <div className="md:hidden divide-y divide-gray-200 dark:divide-white/10">
                        {clients.length === 0 ? (
                            <div className="text-center py-16 text-gray-500 dark:text-white/40 px-4">
                                <Users size={36} className="mx-auto mb-3 opacity-40" />
                                {search ? `No clients match "${search}"` : 'No clients yet.'}
                            </div>
                        ) : clients.map(c => (
                            <div key={c.id} className="p-4 space-y-3">
                                {/* Name + status */}
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-black dark:text-white font-semibold text-sm">{c.name}</span>
                                    <button
                                        onClick={() => setToggleTarget(c)}
                                        className="flex items-center gap-1"
                                    >
                                        {c.is_active
                                            ? <ToggleRight size={20} className="text-green-600" />
                                            : <ToggleLeft size={20} className="text-red-600" />
                                        }
                                        <span className={`text-xs font-medium ${c.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                            {c.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </button>
                                </div>
                                {/* Domain + fee */}
                                <div className="flex items-center gap-3 text-[11px]">
                                    <span className="font-mono text-gray-500 dark:text-white/50 truncate flex-1">{c.domain_name}</span>
                                    <span className="text-gray-600 dark:text-white/60 flex-shrink-0">{c.platform_fee}% fee</span>
                                </div>
                                {/* Email */}
                                {c.contact_email && (
                                    <p className="text-xs text-gray-500 dark:text-white/50">{c.contact_email}</p>
                                )}
                                {/* Action buttons */}
                                <div className="flex items-center gap-2 pt-1">
                                    <button onClick={() => navigate(`/clients/${c.id}/view`)} className="flex-1 py-1.5 rounded-lg text-xs text-gray-600 dark:text-white/60 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5">
                                        <Eye size={12} /> View
                                    </button>
                                    <button onClick={() => navigate(`/events/${c.id}`)} className="flex-1 py-1.5 rounded-lg text-xs text-black dark:text-white bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5">
                                        <CalendarDays size={12} /> Events
                                    </button>
                                    <button onClick={() => navigate(`/clients/${c.id}/edit`)} className="flex-1 py-1.5 rounded-lg text-xs text-gray-600 dark:text-white/60 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5">
                                        <Pencil size={12} /> Edit
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination — shared */}
                    {totalItems > PAGE_SIZE && (
                        <div className="flex flex-wrap items-center justify-between gap-2 px-4 md:px-6 py-3 border-t border-gray-300 dark:border-white/10">
                            <p className="text-gray-500 dark:text-white/50 text-xs">
                                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalItems)} of {totalItems}
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="p-1.5 rounded-lg text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    className="p-1.5 rounded-lg text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}



            {/* Toggle Status Confirmation */}
            <ToggleStatusModal
                client={toggleTarget}
                onClose={() => setToggleTarget(null)}
                onConfirm={handleToggleStatus}
                loading={toggling}
            />




            <Toast
                show={toast.show}
                message={toast.message}
                onClose={() => setToast({ ...toast, show: false })}
            />
        </div>
    )
}
