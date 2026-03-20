import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import {
    Plus, Pencil, Trash2, X, Check, AlertCircle,
    Globe, Key, DollarSign, Phone, Mail, MapPin, Users,
    CalendarDays, Search, ChevronLeft, ChevronRight, ChevronDown,
    Eye, ToggleLeft, ToggleRight, Power, RefreshCw,
    ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react'
import Skeleton from '../components/Skeleton'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
import Toast from '../components/Toast'

const PAGE_SIZE = 10

// Helper function to format name with proper capitalization
const formatName = (name) => {
    if (!name) return ''
    return name.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
}



// ─── Toggle Status Confirmation Popup ────────────────────────────────────────
function ToggleStatusModal({ client, onClose, onConfirm, loading }) {
    if (!client) return null
    const willBeActive = !client.is_active
    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
            <div className="card w-full max-w-sm p-5 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <Power size={18} className="text-zinc-700 dark:text-zinc-300" />
                    </div>
                    <div>
                        <h3 className="text-zinc-900 dark:text-zinc-100 font-medium text-sm">
                            {willBeActive ? 'Activate' : 'Deactivate'} Client
                        </h3>
                        <p className="text-zinc-500 text-xs">{formatName(client.name)}</p>
                    </div>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                    {willBeActive
                        ? 'Client will be able to receive traffic immediately.'
                        : 'Client\'s frontend will receive a 404 error until reactivated.'}
                </p>
                <div className="flex gap-2 pt-2">
                    <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="btn-primary flex-1 flex items-center justify-center gap-1.5"
                    >
                        {loading ? 'Updating...' : <><Check size={14} /> Confirm</>}
                    </button>
                </div>
            </div>
        </div>,
        document.body
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
    const [pageSize, setPageSize] = useState(5)
    const [pageSizeOpen, setPageSizeOpen] = useState(false)
    const [totalPages, setTotalPages] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [toggleTarget, setToggleTarget] = useState(null)
    const [toggling, setToggling] = useState(false)
    const [sortOrder, setSortOrder] = useState('desc')
    const [sortBy, setSortBy] = useState('created_at')

    const SortableHeader = ({ label, field, className }) => {
        const isActive = sortBy === field;
        return (
            <th className={`px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 ${className || ''}`}>
                <button 
                    onClick={() => {
                        if (isActive) {
                            if (sortOrder === 'asc') {
                                setSortOrder('desc')
                            } else {
                                setSortBy('created_at')
                                setSortOrder('desc')
                            }
                        } else {
                            setSortBy(field)
                            setSortOrder('asc')
                        }
                    }}
                    className={`group flex items-center gap-1.5 transition-colors ${
                        isActive 
                            ? 'text-blue-600 dark:text-blue-400 font-semibold' 
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                >
                    {label}
                    {isActive ? (
                        sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                        <ArrowUpDown size={14} className="opacity-40 transition-opacity group-hover:opacity-100" />
                    )}
                </button>
            </th>
        );
    };

    const load = async () => {
        setLoading(true)
        setError('')
        try {
            const { data } = await api.get('/api/clients/paginated', {
                params: { 
                    page, 
                    size: pageSize, 
                    search: debouncedSearch,
                    search: debouncedSearch,
                    sort_by: sortBy,
                    sort_order: sortOrder
                }
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

    useEffect(() => { load() }, [page, pageSize, debouncedSearch, sortOrder, sortBy])


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
        <div className="p-4 md:p-6 space-y-4">
            {/* Page Title + Actions Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Clients</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">Add and manage clients for this application</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            className="input-field h-9 pl-9 pr-8 w-48 dark:text-zinc-200 dark:bg-[#0a0a0a] dark:border-zinc-800"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                                title="Clear search"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button onClick={() => navigate('/clients/new')} className="btn-primary h-9 flex items-center justify-center gap-1.5 px-4 font-bold">
                        <Plus size={16} />
                        New Client
                    </button>
                </div>
            </div>

            {error && (
                <div className="card p-3 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* ── Desktop Table (md+) ── */}
            <div className="card overflow-hidden dark:bg-[#0a0a0a] border-zinc-200 dark:border-zinc-800">

                {/* TABLE — hidden on mobile */}
                <div className="hidden md:block overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white bg-zinc-50/50 dark:bg-zinc-900/20">
                                <SortableHeader label="Name" field="name" className="min-w-[150px] w-[25%]" />
                                <SortableHeader label="Domain" field="domain_name" className="min-w-[150px] w-[30%]" />
                                <SortableHeader label="Platform Fee" field="platform_fee" className="min-w-[140px] w-[20%]" />
                                <SortableHeader label="Status" field="is_active" className="min-w-[120px] w-[15%]" />
                                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 w-[10%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-[#e5e7eb] dark:border-zinc-800/50">
                                        <td className="px-4 py-3"><Skeleton className="w-28 h-4 rounded" /></td>
                                        <td className="px-4 py-3"><Skeleton className="w-36 h-4 rounded" /></td>
                                        <td className="px-4 py-3"><Skeleton className="w-12 h-4 rounded" /></td>
                                        <td className="px-4 py-3"><Skeleton className="w-16 h-5 rounded-full" /></td>
                                        <td className="px-4 py-3"><div className="flex justify-start gap-1"><Skeleton className="w-7 h-7 rounded" /><Skeleton className="w-7 h-7 rounded" /></div></td>
                                    </tr>
                                ))
                            ) : clients.map(c => (
                                    <tr key={c.id} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-zinc-900 dark:text-white">{formatName(c.name)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-zinc-900 dark:text-zinc-200 font-mono text-xs">{c.domain_name}</td>
                                        <td className="px-4 py-3 text-left text-zinc-900 dark:text-zinc-200">{c.platform_fee}%</td>
                                        <td className="px-4 py-3 text-left">
                                            <button
                                                onClick={() => setToggleTarget(c)}
                                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium transition-colors border ${c.is_active
                                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                                    }`}
                                            >
                                                {c.is_active
                                                    ? <><ToggleRight size={14} /> Active</>
                                                    : <><ToggleLeft size={14} /> Inactive</>
                                                }
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-start gap-1">
                                                <button onClick={() => navigate(`/clients/${c.id}/view`)} className="btn-icon text-zinc-900 dark:text-zinc-200" title="View"><Eye size={14} /></button>
                                                <button onClick={() => navigate(`/events/${c.id}`)} className="btn-icon text-zinc-900 dark:text-zinc-200" title="Events"><CalendarDays size={14} /></button>
                                                <button onClick={() => navigate(`/clients/${c.id}/edit`)} className="btn-icon text-zinc-900 dark:text-zinc-200" title="Edit"><Pencil size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                    {!loading && clients.length === 0 && (
                        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                            <Users size={32} className="mx-auto mb-2 opacity-40" />
                            <p className="text-sm">{search ? `No clients match "${search}"` : 'No clients yet'}</p>
                        </div>
                    )}
                </div>

                {/* CARD LIST — shown only on mobile */}
                <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="p-4 space-y-3">
                                <div className="flex justify-between items-center"><Skeleton className="w-24 h-4 rounded" /><Skeleton className="w-16 h-5 rounded-full" /></div>
                                <div className="grid grid-cols-2 gap-y-2"><Skeleton className="w-32 h-3 rounded" /><Skeleton className="w-24 h-3 rounded" /><Skeleton className="w-16 h-3 rounded col-span-2" /></div>
                                <div className="flex gap-2 pt-2"><Skeleton className="h-8 flex-1 rounded" /><Skeleton className="h-8 flex-1 rounded" /><Skeleton className="h-8 flex-1 rounded" /></div>
                            </div>
                        ))
                    ) : clients.length === 0 ? (
                            <div className="text-center py-12 text-zinc-600 dark:text-zinc-400 px-4">
                                <Users size={32} className="mx-auto mb-2 opacity-40" />
                                <p className="text-sm">{search ? `No clients match "${search}"` : 'No clients yet'}</p>
                            </div>
                        ) : clients.map(c => (
                            <div key={c.id} className="p-4 space-y-2">
                                {/* Name + status */}
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-zinc-900 dark:text-white font-semibold text-sm">{formatName(c.name)}</span>
                                    <button
                                        onClick={() => setToggleTarget(c)}
                                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${c.is_active
                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
                                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                                            }`}
                                    >
                                        {c.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </div>
                                {/* Domain + fee */}
                                <div className="flex items-center justify-between text-xs text-zinc-500">
                                    <span className="font-mono truncate flex-1">{c.domain_name}</span>
                                    <span className="ml-2">{c.platform_fee}% fee</span>
                                </div>
                                {/* Action buttons */}
                                <div className="flex items-center gap-2 pt-2">
                                    <button onClick={() => navigate(`/clients/${c.id}/view`)} className="btn-secondary btn-sm flex-1 flex items-center justify-center gap-1 text-zinc-900 dark:text-zinc-200">
                                        <Eye size={12} /> View
                                    </button>
                                    <button onClick={() => navigate(`/events/${c.id}`)} className="btn-secondary btn-sm flex-1 flex items-center justify-center gap-1 text-zinc-900 dark:text-zinc-200">
                                        <CalendarDays size={12} /> Events
                                    </button>
                                    <button onClick={() => navigate(`/clients/${c.id}/edit`)} className="btn-secondary btn-sm flex-1 flex items-center justify-center gap-1 text-zinc-900 dark:text-zinc-200">
                                        <Pencil size={12} /> Edit
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination Footer */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-zinc-200 dark:border-zinc-800">
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                            Showing {totalItems === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalItems)} of {totalItems} results
                        </p>
                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">Rows:</span>
                                <div 
                                    className="relative"
                                    tabIndex={-1}
                                    onBlur={(e) => {
                                        if (!e.currentTarget.contains(e.relatedTarget)) {
                                            setPageSizeOpen(false);
                                        }
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setPageSizeOpen(!pageSizeOpen)}
                                        className="flex items-center justify-between gap-1.5 cursor-pointer bg-transparent border border-zinc-200 dark:border-zinc-800 rounded text-sm text-zinc-900 dark:text-zinc-200 py-1 pl-3 pr-2 focus:outline-none hover:border-zinc-300 dark:hover:border-zinc-700 transition min-w-[56px]"
                                    >
                                        <span>{pageSize}</span>
                                        <ChevronDown size={14} className="text-zinc-500 dark:text-zinc-400" />
                                    </button>
                                    
                                    {pageSizeOpen && (
                                        <div className="absolute bottom-full mb-1 left-0 w-full min-w-max bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded shadow-lg overflow-hidden z-50 p-1">
                                            {[5, 10].map(size => (
                                                <button
                                                    key={size}
                                                    type="button"
                                                    onClick={() => {
                                                        setPageSize(size);
                                                        setPage(1);
                                                        setPageSizeOpen(false);
                                                    }}
                                                    className={`w-full text-left px-2 py-1.5 text-sm rounded-sm transition-colors ${
                                                        pageSize === size 
                                                            ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium' 
                                                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#18181b] hover:text-zinc-900 dark:hover:text-zinc-200'
                                                    }`}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center font-medium gap-1">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="px-3 py-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>
                                <button className="min-w-[28px] h-7 px-2 flex items-center justify-center rounded-md text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
                                    {page}
                                </button>
                                <button
                                    disabled={page >= totalPages || totalPages === 0}
                                    onClick={() => setPage(p => p + 1)}
                                    className="px-3 py-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>



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
