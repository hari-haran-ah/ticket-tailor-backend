import { useState, useEffect, useMemo } from 'react'
import api from '../lib/api'
import { DollarSign, CalendarDays, Search, CheckCircle, Clock, XCircle } from 'lucide-react'
import Skeleton from '../components/Skeleton'
import ClientPillBar from '../components/ClientPillBar'

export default function PaymentsPage() {
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [clients, setClients] = useState([])
    const [loadingClients, setLoadingClients] = useState(true)
    const [selectedClientId, setSelectedClientId] = useState('')

    useEffect(() => {
        Promise.all([
            api.get('/api/dashboard/payments'),
            api.get('/api/clients'),
        ]).then(([paymentsRes, clientsRes]) => {
            setPayments(paymentsRes.data)
            setClients(clientsRes.data.filter(c => c.is_active))
        }).catch(() => setError('Failed to load data'))
          .finally(() => { setLoading(false); setLoadingClients(false) })
    }, [])

    const filtered = useMemo(() => {
        return payments.filter(p => {
            const matchesSearch =
                p.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.event_name?.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesClient = selectedClientId
                ? p.client_id?.toString() === selectedClientId
                : true
            return matchesSearch && matchesClient
        })
    }, [payments, searchTerm, selectedClientId])

    const totalVolume = filtered
        .filter(p => p.status === 'complete')
        .reduce((sum, p) => sum + p.total_amount_cents, 0) / 100

    const formatCurrency = (cents, currency = 'usd') =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)

    return (
        <div className="p-4 md:p-8 space-y-5 md:space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <DollarSign className="text-primary-500" />
                        Payments Overview
                    </h1>
                    <p className="text-sm text-white/50 mt-1">Monitor all platform transactions</p>
                </div>
            </div>

            {/* Client Pill Filter Bar */}
            <div className="space-y-2">
                <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">Filter by Client</p>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => setSelectedClientId('')}
                        className={`px-4 py-2.5 rounded-2xl border text-sm font-semibold transition-all duration-200
                            ${!selectedClientId
                                ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-600/25'
                                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
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
                            <div className="text-sm text-white/50 mb-1">Processed Volume</div>
                            <div className="text-3xl font-black text-white">${totalVolume.toFixed(2)}</div>
                        </div>
                        <div className="card p-6">
                            <div className="text-sm text-white/50 mb-1">Successful</div>
                            <div className="text-3xl font-black text-white">{filtered.filter(p => p.status === 'complete').length}</div>
                        </div>
                        <div className="card p-6">
                            <div className="text-sm text-white/50 mb-1">Pending / Failed</div>
                            <div className="text-3xl font-black text-white">{filtered.filter(p => p.status !== 'complete').length}</div>
                        </div>
                    </>
                )}
            </div>

            {/* Table */}
            <div className="card flex flex-col min-h-[400px]">
                <div className="p-4 border-b border-white/10 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                        <input
                            type="text"
                            placeholder="Search by client, customer email, or event..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary-500 transition-colors"
                        />
                    </div>
                    {(filtered.length !== payments.length) && (
                        <span className="text-xs text-white/40">
                            Showing {filtered.length} of {payments.length}
                        </span>
                    )}
                </div>

                <div className="flex-1 overflow-x-auto">
                    {loading ? (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {['Date', 'Client', 'Customer', 'Order', 'Amount', 'Status'].map(h => (
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
                                        <td className="px-6 py-4"><Skeleton className="w-20 h-5 rounded-full mx-auto" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : error ? (
                        <div className="flex items-center justify-center h-64 text-red-400">{error}</div>
                    ) : filtered.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-white/40">No payments found.</div>
                    ) : (
                        <>
                            {/* TABLE — md+ only */}
                            <table className="hidden md:table w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                                        <th className="px-6 py-3 text-left">Date</th>
                                        <th className="px-6 py-3 text-left">Client</th>
                                        <th className="px-6 py-3 text-left">Customer</th>
                                        <th className="px-6 py-3 text-left">Order</th>
                                        <th className="px-6 py-3 text-right">Amount</th>
                                        <th className="px-6 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filtered.map(p => (
                                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-white/70">
                                                    <CalendarDays size={14} />
                                                    {new Date(p.created_at).toLocaleDateString()}
                                                </div>
                                                <div className="text-[10px] text-white/30 mt-1">{new Date(p.created_at).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-white">{p.client_name}</div>
                                                <div className="text-[10px] font-mono text-white/40 mt-1">{p.stripe_account_id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-white">{p.customer_email}</div>
                                                {p.customer_name && <div className="text-xs text-white/50 mt-1">{p.customer_name}</div>}
                                                {p.customer_phone && <div className="text-xs text-white/50">{p.customer_phone}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-white max-w-[200px] truncate" title={p.event_name}>{p.event_name}</div>
                                                <div className="text-xs text-white/50 mt-1">{p.quantity} × {p.ticket_type_name}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-white">{formatCurrency(p.total_amount_cents, p.currency)}</td>
                                            <td className="px-6 py-4 text-center">
                                                {p.status === 'complete' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20"><CheckCircle size={12} /> Paid</span>
                                                ) : p.status === 'pending' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"><Clock size={12} /> Pending</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20"><XCircle size={12} /> Failed</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* CARD LIST — mobile only */}
                            <div className="md:hidden divide-y divide-white/5">
                                {filtered.map(p => (
                                    <div key={p.id} className="p-4 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-white text-sm font-medium truncate max-w-[180px]">{p.event_name}</p>
                                                <p className="text-white/40 text-xs mt-0.5">{p.quantity} × {p.ticket_type_name}</p>
                                            </div>
                                            <div className="flex-shrink-0 text-right">
                                                <p className="text-white font-semibold text-sm">{formatCurrency(p.total_amount_cents, p.currency)}</p>
                                                {p.status === 'complete' ? (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20 mt-1"><CheckCircle size={9} /> Paid</span>
                                                ) : p.status === 'pending' ? (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 mt-1"><Clock size={9} /> Pending</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-500 border border-red-500/20 mt-1"><XCircle size={9} /> Failed</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-white/40">
                                            <span>{p.customer_email}</span>
                                            <span>{new Date(p.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="text-[10px] text-white/30 font-semibold">{p.client_name}</div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
