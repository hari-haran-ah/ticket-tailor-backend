import { useState, useEffect, useMemo } from 'react'
import api from '../lib/api'
import { DollarSign, CalendarDays, Search, CheckCircle, Clock, XCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import Skeleton from '../components/Skeleton'
import ClientPillBar from '../components/ClientPillBar'

export default function PaymentsPage() {
    const [payments, setPayments] = useState([])
    const [stats, setStats] = useState({ total_volume_cents: 0, successful: 0, pending_failed: 0 })
    const [totalRecords, setTotalRecords] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Filters & Pagination
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [selectedClientId, setSelectedClientId] = useState('')
    const [page, setPage] = useState(1)
    const [limit] = useState(10)

    const [clients, setClients] = useState([])
    const [loadingClients, setLoadingClients] = useState(true)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearch(searchTerm); setPage(1) }, 400)
        return () => clearTimeout(timer)
    }, [searchTerm])

    // Reset page on client change
    useEffect(() => { setPage(1) }, [selectedClientId])

    const loadClients = () => {
        setLoadingClients(true)
        api.get('/api/clients')
            .then(({ data }) => setClients(data.filter(c => c.is_active)))
            .finally(() => setLoadingClients(false))
    }

    const loadPayments = () => {
        setLoading(true)
        const params = new URLSearchParams()
        params.append('page', page)
        params.append('limit', limit)
        if (debouncedSearch) params.append('search', debouncedSearch)
        if (selectedClientId) params.append('client_id', selectedClientId)

        api.get(`/api/dashboard/payments?${params.toString()}`)
            .then(({ data }) => {
                setPayments(data.data || [])
                setTotalRecords(data.total_records || 0)
                setTotalPages(data.total_pages || 0)
                setStats(data.stats || { total_volume_cents: 0, successful: 0, pending_failed: 0 })
            })
            .catch(() => setError('Failed to load payments data'))
            .finally(() => setLoading(false))
    }

    const loadData = () => {
        loadClients()
        loadPayments()
    }

    useEffect(() => { loadClients() }, [])
    useEffect(() => { loadPayments() }, [page, limit, debouncedSearch, selectedClientId])

    const totalVolume = (stats.total_volume_cents || 0) / 100

    const formatCurrency = (cents, currency = 'usd') =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)

    return (
        <div className="p-4 md:p-8 space-y-5 md:space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-black dark:text-white flex items-center gap-2">
                        <DollarSign className="text-black dark:text-white" />
                        Payments Overview
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-white/60 mt-1">Monitor all platform transactions</p>
                </div>
                <button onClick={loadData} className="btn-secondary group flex items-center gap-2">
                    <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                    <span className="hidden sm:inline">Refresh</span>
                </button>
            </div>

            {/* Client Pill Filter Bar */}
            <div className="space-y-2">
                <p className="text-gray-500 dark:text-white/50 text-xs uppercase tracking-widest font-semibold">Filter by Client</p>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => setSelectedClientId('')}
                        className={`px-4 py-2.5 rounded-2xl border text-sm font-semibold transition-all duration-200
                            ${!selectedClientId
                                ? 'bg-black dark:bg-white text-white dark:text-black border-gray-900 dark:border-white shadow-lg'
                                : 'bg-gray-100 dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
                            }`}
                    >
                        All Clients
                    </button>
                    <ClientPillBar
                        clients={clients}
                        selectedId={selectedClientId}
                        onSelect={(id) => setSelectedClientId(prev => prev === id ? '' : id)}
                        loading={loadingClients}
                    />
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="card p-6 space-y-2">
                            <Skeleton className="w-32 h-3" />
                            <Skeleton className="w-24 h-8" />
                        </div>
                    ))
                ) : (
                    <>
                        <div className="card p-6">
                            <div className="text-sm text-gray-600 dark:text-white/60 mb-1">Processed Volume</div>
                            <div className="text-3xl font-black text-black dark:text-white">${totalVolume.toFixed(2)}</div>
                        </div>
                        <div className="card p-6">
                            <div className="text-sm text-gray-600 dark:text-white/60 mb-1">Successful</div>
                            <div className="text-3xl font-black text-black dark:text-white">{stats.successful}</div>
                        </div>
                        <div className="card p-6">
                            <div className="text-sm text-gray-600 dark:text-white/60 mb-1">Pending / Failed</div>
                            <div className="text-3xl font-black text-black dark:text-white">{stats.pending_failed}</div>
                        </div>
                    </>
                )}
            </div>

            {/* Table */}
            <div className="card flex flex-col min-h-[400px]">
                <div className="p-4 border-b border-gray-300 dark:border-white/10 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-white/40" size={16} />
                        <input
                            type="text"
                            placeholder="Search by client, customer email, or event..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="input-field pl-10 h-9"
                        />
                    </div>
                    {totalRecords > 0 && (
                        <span className="text-xs text-gray-500 dark:text-white/50">
                            {totalRecords} total records
                        </span>
                    )}
                </div>

                <div className="flex-1 overflow-x-auto">
                    {loading ? (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {['Date', 'Client', 'Customer', 'Order', 'Amount', 'Fee', 'Status'].map(h => (
                                        <th key={h} className="px-6 py-4 text-left"><Skeleton className="h-3 w-16" /></th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                    <tr key={i}>
                                        <td className="px-6 py-4"><Skeleton className="w-24 h-4" /></td>
                                        <td className="px-6 py-4"><Skeleton className="w-32 h-4" /></td>
                                        <td className="px-6 py-4"><Skeleton className="w-40 h-4" /></td>
                                        <td className="px-6 py-4"><Skeleton className="w-48 h-4" /></td>
                                        <td className="px-6 py-4"><Skeleton className="w-16 h-4 ml-auto" /></td>
                                        <td className="px-6 py-4"><Skeleton className="w-12 h-4 ml-auto" /></td>
                                        <td className="px-6 py-4"><Skeleton className="w-20 h-5 rounded-full mx-auto" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : error ? (
                        <div className="flex items-center justify-center h-64 text-[#0a0a0a] dark:text-white">{error}</div>
                    ) : payments.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-white/50">No payments found.</div>
                    ) : (
                        <div className="flex flex-col justify-between h-full">
                            <div>
                                {/* TABLE — md+ only */}
                                <table className="hidden md:table w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-300 dark:border-white/10 text-gray-500 dark:text-white/50 text-xs uppercase tracking-wider">
                                            <th className="px-6 py-3 text-left">Date</th>
                                            <th className="px-6 py-3 text-left">Client</th>
                                            <th className="px-6 py-3 text-left">Customer</th>
                                            <th className="px-6 py-3 text-left">Order</th>
                                            <th className="px-6 py-3 text-right">Amount</th>
                                            <th className="px-6 py-3 text-right">Fee</th>
                                            <th className="px-6 py-3 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                                        {payments.map(p => (
                                            <tr key={p.id} className="hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-gray-700 dark:text-white/70">
                                                        <CalendarDays size={14} />
                                                        {new Date(p.created_at).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 dark:text-white/40 mt-1">{new Date(p.created_at).toLocaleTimeString()}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-[#0a0a0a] dark:text-white">{p.client_name}</div>
                                                    <div className="text-[10px] font-mono text-gray-500 dark:text-white/50 mt-1">{p.stripe_account_id}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-[#0a0a0a] dark:text-white">{p.customer_email}</div>
                                                    {p.customer_name && <div className="text-xs text-gray-600 dark:text-white/60 mt-1">{p.customer_name}</div>}
                                                    {p.customer_phone && <div className="text-xs text-gray-600 dark:text-white/60">{p.customer_phone}</div>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-[#0a0a0a] dark:text-white max-w-[200px] truncate" title={p.event_name}>{p.event_name}</div>
                                                    <div className="text-xs text-gray-600 dark:text-white/60 mt-1">{p.quantity} × {p.ticket_type_name}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-[#0a0a0a] dark:text-white">{formatCurrency(p.total_amount_cents, p.currency)}</td>
                                                <td className="px-6 py-4 text-right font-medium text-[#0a0a0a] dark:text-white">+{formatCurrency(p.platform_fee_cents || 0, p.currency)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    {p.status === 'complete' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-black dark:bg-white text-white dark:text-black border border-gray-900 dark:border-white"><CheckCircle size={12} /> Paid</span>
                                                    ) : p.status === 'pending' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white/70 border border-gray-300 dark:border-white/20"><Clock size={12} /> Pending</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-400 dark:bg-white/20 text-white dark:text-white/80 border border-gray-500 dark:border-white/30"><XCircle size={12} /> Failed</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {/* CARD LIST — mobile only */}
                                <div className="md:hidden divide-y divide-gray-200 dark:divide-white/10">
                                    {payments.map(p => (
                                        <div key={p.id} className="p-4 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-[#0a0a0a] dark:text-white text-sm font-medium truncate max-w-[180px]">{p.event_name}</p>
                                                    <p className="text-gray-500 dark:text-white/50 text-xs mt-0.5">{p.quantity} × {p.ticket_type_name}</p>
                                                </div>
                                                <div className="flex-shrink-0 text-right">
                                                    <p className="text-black dark:text-white font-semibold text-sm">{formatCurrency(p.total_amount_cents, p.currency)}</p>
                                                    <p className="text-black dark:text-white text-[11px] font-medium mt-0.5">+{formatCurrency(p.platform_fee_cents || 0, p.currency)}</p>
                                                    {p.status === 'complete' ? (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-black dark:bg-white text-white dark:text-black border border-gray-900 dark:border-white mt-1"><CheckCircle size={9} /> Paid</span>
                                                    ) : p.status === 'pending' ? (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white/70 border border-gray-300 dark:border-white/20 mt-1"><Clock size={9} /> Pending</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-400 dark:bg-white/20 text-white dark:text-white/80 border border-gray-500 dark:border-white/30 mt-1"><XCircle size={9} /> Failed</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-white/50">
                                                <span>{p.customer_email}</span>
                                                <span>{new Date(p.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-[10px] text-gray-500 dark:text-white/50 font-semibold">{p.client_name}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pagination */}
                            {totalRecords > limit && (
                                <div className="flex flex-wrap items-center justify-between gap-2 px-4 md:px-6 py-3 border-t border-gray-300 dark:border-white/10 mt-auto">
                                    <p className="text-gray-500 dark:text-white/50 text-xs">
                                        Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalRecords)} of {totalRecords}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            disabled={page === 1}
                                            onClick={() => setPage(p => p - 1)}
                                            className="p-1.5 rounded-lg text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>

                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p, i, arr) => {
                                            if (p === 1 || p === arr.length || Math.abs(p - page) <= 1) {
                                                return (
                                                    <button
                                                        key={p}
                                                        onClick={() => setPage(p)}
                                                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-black dark:bg-white text-white dark:text-black' : 'text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {p}
                                                    </button>
                                                )
                                            }
                                            if (p === page - 2 || p === page + 2) {
                                                return <span key={p} className="text-gray-500 dark:text-white/40 text-xs px-1">...</span>
                                            }
                                            return null
                                        })}

                                        <button
                                            disabled={page === totalPages || totalPages === 0}
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
                </div>
            </div>
        </div>
    )
}
