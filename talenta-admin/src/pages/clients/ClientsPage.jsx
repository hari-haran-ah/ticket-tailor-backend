import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { clientApi } from '../../api/client'
import {
    Plus, Pencil, X, Check, AlertCircle, Users,
    CalendarDays, Search, ChevronDown,
    Eye, Power,
    ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react'
import Skeleton from '../../components/ui/Skeleton'
import Toast from '../../components/ui/Toast'

// Helper function to format name with proper capitalization
const formatName = (name) => {
    if (!name) return ''
    return name.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
}

// ─── Toggle Status Confirmation Modal ────────────────────────────────────────
function ToggleStatusModal({ client, onClose, onConfirm, loading }) {
    if (!client) return null
    const willBeActive = !client.is_active
    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg w-full max-w-sm p-5 lg:p-6 space-y-4 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <Power size={18} className="text-zinc-600 dark:text-zinc-300" />
                    </div>
                    <div>
                        <h3 className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm lg:text-base">
                            {willBeActive ? 'Activate' : 'Deactivate'} Client
                        </h3>
                        <p className="text-zinc-500 text-xs lg:text-sm">{formatName(client.name)}</p>
                    </div>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                    {willBeActive
                        ? 'Client will be able to receive traffic immediately.'
                        : 'Client\'s frontend will receive a 404 error until reactivated.'}
                </p>
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Updating...' : <><Check size={16} /> Confirm</>}
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
    const [pageSize, setPageSize] = useState(10)
    const [pageSizeOpen, setPageSizeOpen] = useState(false)
    const [totalPages, setTotalPages] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [toggleTarget, setToggleTarget] = useState(null)
    const [toggling, setToggling] = useState(false)
    const [sortOrder, setSortOrder] = useState('desc')
    const [sortBy, setSortBy] = useState('created_at')
    const currentFetchRef = useRef(0)

    // ─── Sortable Table Header ─────────────────────────────────────────────────
    const SortableHeader = ({ label, field, className }) => {
        const isActive = sortBy === field
        return (
            <th className={`px-4 lg:px-5 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 ${className || ''}`}>
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
                    className={`group flex items-center gap-1.5 transition-colors ${isActive
                        ? 'text-zinc-900 dark:text-white'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                        }`}
                >
                    {label}
                    {isActive ? (
                        sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                        <ArrowUpDown size={12} className="opacity-40 group-hover:opacity-70 transition-opacity" />
                    )}
                </button>
            </th>
        )
    }

    // ─── Data Loading ──────────────────────────────────────────────────────────
    const load = async () => {
        const fetchId = Date.now()
        currentFetchRef.current = fetchId
        setLoading(true)
        setError('')
        try {
            const { data } = await clientApi.getPaginated({
                page,
                size: pageSize,
                search: debouncedSearch,
                sort_by: sortBy,
                sort_order: sortOrder
            })
            if (currentFetchRef.current === fetchId) {
                setClients(data.items)
                setTotalPages(data.pages)
                setTotalItems(data.total)
            }
        } catch (e) {
            if (currentFetchRef.current === fetchId) {
                setError(e.response?.data?.detail || 'Failed to load clients')
            }
        } finally {
            if (currentFetchRef.current === fetchId) {
                setLoading(false)
            }
        }
    }

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(prev => {
                if (prev !== search) {
                    setPage(1)
                    return search
                }
                return prev
            })
        }, 300)
        return () => clearTimeout(handler)
    }, [search])

    useEffect(() => { load() }, [page, pageSize, debouncedSearch, sortOrder, sortBy])

    // ─── Toggle Status Handler ─────────────────────────────────────────────────
    const handleToggleStatus = async () => {
        if (!toggleTarget) return
        setToggling(true)
        try {
            const { data } = await clientApi.toggleStatus(toggleTarget.id)
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
        <div className="p-3 sm:p-4 lg:p-5 xl:p-6 2xl:p-8 space-y-4 bg-white dark:bg-zinc-950 min-h-full h-full overflow-y-auto w-full">
            {/* ═══ Page Header ═══ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl lg:text-2xl xl:text-[26px] font-bold tracking-tight text-zinc-900 dark:text-white">
                        Clients
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs lg:text-sm mt-0.5">
                        Manage your client accounts and configurations
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Search Input */}
                    <div className="relative flex-1 sm:flex-none">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            className="w-full sm:w-48 lg:w-56 xl:w-64 h-9 pl-9 pr-8 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100 transition-all"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    {/* New Client Button */}
                    <button
                        onClick={() => navigate('/clients/new')}
                        className="h-9 px-3 lg:px-4 text-sm font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white hover:bg-zinc-700 dark:hover:bg-zinc-100 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                        <Plus size={15} />
                        New Client
                    </button>
                </div>
            </div>

            {/* ═══ Error Alert ═══ */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* ═══ Desktop/Tablet Table (md+) ═══ */}
            <div className="hidden md:block">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/80">
                                    <SortableHeader label="Name" field="name" className="min-w-[120px] lg:min-w-[140px]" />
                                    <SortableHeader label="Domain" field="domain_name" className="min-w-[140px] lg:min-w-[180px]" />
                                    <SortableHeader label="Platform Fee" field="platform_fee" className="min-w-[100px]" />
                                    <SortableHeader label="Status" field="is_active" className="min-w-[100px]" />
                                    <th className="px-4 lg:px-5 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 min-w-[100px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {loading ? (
                                    Array.from({ length: pageSize }).map((_, i) => (
                                        <tr key={i} className={i % 2 === 1 ? 'bg-zinc-50/50 dark:bg-zinc-900/30' : 'bg-white dark:bg-zinc-900'}>
                                            <td className="px-4 lg:px-5 py-3"><Skeleton className="w-24 h-4 rounded" /></td>
                                            <td className="px-4 lg:px-5 py-3"><Skeleton className="w-32 h-4 rounded" /></td>
                                            <td className="px-4 lg:px-5 py-3"><Skeleton className="w-10 h-4 rounded" /></td>
                                            <td className="px-4 lg:px-5 py-3"><Skeleton className="w-10 h-5 rounded-full" /></td>
                                            <td className="px-4 lg:px-5 py-3">
                                                <div className="flex gap-1">
                                                    <Skeleton className="w-8 h-8 rounded-md" />
                                                    <Skeleton className="w-8 h-8 rounded-md" />
                                                    <Skeleton className="w-8 h-8 rounded-md" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : clients.map((c, i) => (
                                    <tr key={c.id} className={`transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/60 ${i % 2 === 1 ? 'bg-zinc-50/60 dark:bg-zinc-900/30' : 'bg-white dark:bg-zinc-900'}`}>
                                        <td className="px-4 lg:px-5 py-3.5">
                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                {formatName(c.name)}
                                            </span>
                                        </td>
                                        <td className="px-4 lg:px-5 py-3.5">
                                            <a
                                                href={c.domain_name.startsWith('http') ? c.domain_name : `https://${c.domain_name}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline underline-offset-2 transition-colors"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                {c.domain_name}
                                            </a>
                                        </td>
                                        <td className="px-4 lg:px-5 py-3.5">
                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                {c.platform_fee}%
                                            </span>
                                        </td>
                                        <td className="px-4 lg:px-5 py-3.5">
                                            <button
                                                onClick={() => setToggleTarget(c)}
                                                className="flex items-center gap-2 group"
                                                title={c.is_active ? 'Click to deactivate' : 'Click to activate'}
                                            >
                                                {/* Toggle Switch */}
                                                <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${c.is_active
                                                    ? 'bg-emerald-500'
                                                    : 'bg-zinc-300 dark:bg-zinc-600'
                                                    }`}>
                                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${c.is_active
                                                        ? 'translate-x-4'
                                                        : 'translate-x-0.5'
                                                        }`} />
                                                </div>
                                                {/* Status Text */}
                                                <span className={`text-xs font-semibold transition-colors ${c.is_active
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-zinc-400 dark:text-zinc-500'
                                                    }`}>
                                                    {c.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </button>
                                        </td>
                                        <td className="px-4 lg:px-5 py-3.5">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => navigate(`/clients/${c.id}/view`, { state: { client: c } })}
                                                    className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                                                    title="View"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/events/${c.id}`, { state: { isolated: true } })}
                                                    className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                                                    title="Events"
                                                >
                                                    <CalendarDays size={14} />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/clients/${c.id}/edit`)}
                                                    className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty State */}
                    {!loading && clients.length === 0 && (
                        <div className="text-center py-12 lg:py-16">
                            <Users size={32} className="mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                            <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                                {search ? `No clients match "${search}"` : 'No clients yet'}
                            </p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                {search ? 'Try a different search term' : 'Get started by adding your first client'}
                            </p>
                        </div>
                    )}
                </div>

                {/* ═══ Pagination ═══ */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Showing <span className="font-semibold text-zinc-700 dark:text-zinc-200">{totalItems === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
                        <span className="font-semibold text-zinc-700 dark:text-zinc-200">{Math.min(page * pageSize, totalItems)}</span> of{' '}
                        <span className="font-semibold text-zinc-700 dark:text-zinc-200">{totalItems}</span> results
                    </p>
                    <div className="flex items-center gap-4">
                        {/* Rows per page */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">Rows:</span>
                            <div className="relative" tabIndex={-1} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setPageSizeOpen(false) }}>
                                <button
                                    type="button"
                                    onClick={() => setPageSizeOpen(!pageSizeOpen)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors min-w-[52px]"
                                >
                                    <span className="font-semibold text-zinc-700 dark:text-zinc-200">{pageSize}</span>
                                    <ChevronDown size={12} className="text-zinc-400" />
                                </button>
                                {pageSizeOpen && (
                                    <div className="absolute bottom-full mb-1 left-0 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-50 overflow-hidden">
                                        {[5, 10, 20].map(size => (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() => { setPageSize(size); setPage(1); setPageSizeOpen(false) }}
                                                className={`w-full text-left px-2.5 py-1.5 text-xs transition-colors ${pageSize === size
                                                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                                                    }`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Page buttons */}
                        <div className="flex items-center gap-0.5">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                Prev
                            </button>
                            <span className="min-w-[32px] h-7 px-2 flex items-center justify-center rounded-md text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
                                {page}
                            </span>
                            <button
                                disabled={page >= totalPages || totalPages === 0}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ Mobile Card List ═══ */}
            <div className="md:hidden">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="p-4 space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <Skeleton className="w-28 h-4 rounded" />
                                    <Skeleton className="w-9 h-5 rounded-full" />
                                </div>
                                <Skeleton className="w-36 h-3.5 rounded" />
                                <div className="flex gap-2 pt-1">
                                    <Skeleton className="h-9 flex-1 rounded-md" />
                                    <Skeleton className="h-9 flex-1 rounded-md" />
                                    <Skeleton className="h-9 flex-1 rounded-md" />
                                </div>
                            </div>
                        ))
                    ) : clients.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <Users size={28} className="mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                            <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                                {search ? `No clients match "${search}"` : 'No clients yet'}
                            </p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                {search ? 'Try a different search term' : 'Get started by adding your first client'}
                            </p>
                        </div>
                    ) : clients.map(c => (
                        <div key={c.id} className="p-4 space-y-2.5">
                            {/* Name + Toggle */}
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                                    {formatName(c.name)}
                                </span>
                                <button
                                    onClick={() => setToggleTarget(c)}
                                    className="shrink-0 flex items-center gap-1.5"
                                    title={c.is_active ? 'Click to deactivate' : 'Click to activate'}
                                >
                                    <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${c.is_active
                                        ? 'bg-emerald-500'
                                        : 'bg-zinc-300 dark:bg-zinc-600'
                                        }`}>
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${c.is_active
                                            ? 'translate-x-4'
                                            : 'translate-x-0.5'
                                            }`} />
                                    </div>
                                </button>
                            </div>
                            {/* Domain + Fee */}
                            <div className="flex items-center justify-between text-xs">
                                <a
                                    href={c.domain_name.startsWith('http') ? c.domain_name : `https://${c.domain_name}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 truncate"
                                    onClick={e => e.stopPropagation()}
                                >
                                    {c.domain_name}
                                </a>
                                <span className="ml-2 font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
                                    {c.platform_fee}%
                                </span>
                            </div>
                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 pt-0.5">
                                <button
                                    onClick={() => navigate(`/clients/${c.id}/view`)}
                                    className="flex-1 px-2 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Eye size={13} /> View
                                </button>
                                <button
                                    onClick={() => navigate(`/events/${c.id}`, { state: { isolated: true } })}
                                    className="flex-1 px-2 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <CalendarDays size={13} /> Events
                                </button>
                                <button
                                    onClick={() => navigate(`/clients/${c.id}/edit`)}
                                    className="flex-1 px-2 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Pencil size={13} /> Edit
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Mobile Pagination */}
                {!loading && clients.length > 0 && (
                    <div className="flex items-center justify-between pt-4">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                Prev
                            </button>
                            <span className="px-3 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {page}
                            </span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ Modals ═══ */}
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
