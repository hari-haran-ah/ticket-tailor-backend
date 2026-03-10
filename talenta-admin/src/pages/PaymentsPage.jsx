import { useState, useEffect } from 'react'
import api from '../lib/api'
import { DollarSign, ExternalLink, CalendarDays, Search, CheckCircle, Clock, XCircle } from 'lucide-react'
import Skeleton from '../components/Skeleton'

export default function PaymentsPage() {
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')

    const fetchPayments = async () => {
        try {
            const { data } = await api.get('/api/dashboard/payments')
            setPayments(data)
        } catch (err) {
            setError('Failed to load payments')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPayments()
    }, [])

    const filtered = payments.filter(p =>
        p.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.event_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const totalVolume = payments
        .filter(p => p.status === 'complete')
        .reduce((sum, p) => sum + p.total_amount_cents, 0) / 100

    const formatCurrency = (cents, currency = 'usd') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase()
        }).format(cents / 100)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <DollarSign className="text-primary-500" />
                        Payments Overview
                    </h1>
                    <p className="text-sm text-white/50 mt-1">Monitor all platform transactions</p>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="card p-6 border border-white/10 bg-white/5 space-y-2">
                            <Skeleton className="w-32 h-3" />
                            <Skeleton className="w-24 h-8" />
                        </div>
                    ))
                ) : (
                    <>
                        <div className="card p-6 border border-white/10 bg-white/5">
                            <div className="text-sm text-white/50 mb-1">Total Processed Volume</div>
                            <div className="text-3xl font-black text-white">${totalVolume.toFixed(2)}</div>
                        </div>
                        <div className="card p-6 border border-white/10 bg-white/5">
                            <div className="text-sm text-white/50 mb-1">Successful Transactions</div>
                            <div className="text-3xl font-black text-white">{payments.filter(p => p.status === 'complete').length}</div>
                        </div>
                        <div className="card p-6 border border-white/10 bg-white/5">
                            <div className="text-sm text-white/50 mb-1">Pending/Failed</div>
                            <div className="text-3xl font-black text-white">{payments.filter(p => p.status !== 'complete').length}</div>
                        </div>
                    </>
                )}
            </div>

            <div className="card flex flex-col min-h-[500px]">
                <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4">
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
                </div>

                <div className="flex-1 overflow-x-auto">
                    {loading ? (
                        <div className="overflow-x-auto min-h-[400px]">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                                        <th className="px-6 py-4 text-left"><Skeleton className="w-16 h-3" /></th>
                                        <th className="px-6 py-4 text-left"><Skeleton className="w-32 h-3" /></th>
                                        <th className="px-6 py-4 text-left"><Skeleton className="w-32 h-3" /></th>
                                        <th className="px-6 py-4 text-left"><Skeleton className="w-40 h-3" /></th>
                                        <th className="px-6 py-4 text-right"><Skeleton className="w-20 h-3 ml-auto" /></th>
                                        <th className="px-6 py-4 text-center"><Skeleton className="w-16 h-3 mx-auto" /></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                        <tr key={i}>
                                            <td className="px-6 py-4"><Skeleton className="w-24 h-4" /></td>
                                            <td className="px-6 py-4"><Skeleton className="w-32 h-4" /></td>
                                            <td className="px-6 py-4"><Skeleton className="w-40 h-4" /></td>
                                            <td className="px-6 py-4"><Skeleton className="w-48 h-4" /></td>
                                            <td className="px-6 py-4 text-right"><Skeleton className="w-16 h-4 ml-auto" /></td>
                                            <td className="px-6 py-4 text-center"><Skeleton className="w-20 h-5 rounded-full mx-auto" /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-64 text-red-400">{error}</div>
                    ) : filtered.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-white/50">No payments found.</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                                    <th className="px-6 py-3 text-left">Date</th>
                                    <th className="px-6 py-3 text-left">Client & Account</th>
                                    <th className="px-6 py-3 text-left">Customer</th>
                                    <th className="px-6 py-3 text-left">Order Details</th>
                                    <th className="px-6 py-3 text-right">Amount</th>
                                    <th className="px-6 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filtered.map(p => (
                                    <tr key={p.id} className="hover:bg-white/2 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-white/70">
                                                <CalendarDays size={14} />
                                                {new Date(p.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="text-[10px] text-white/30 mt-1">
                                                {new Date(p.created_at).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{p.client_name}</div>
                                            <div className="text-[10px] font-mono text-white/40 mt-1" title="Stripe Account ID">
                                                {p.stripe_account_id}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-white">{p.customer_email}</div>
                                            {p.customer_name && <div className="text-xs text-white/50 mt-1">{p.customer_name}</div>}
                                            {p.customer_phone && <div className="text-xs text-white/50 mt-1">{p.customer_phone}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-white max-w-[200px] truncate" title={p.event_name}>{p.event_name}</div>
                                            <div className="text-xs text-white/50 mt-1">{p.quantity} × {p.ticket_type_name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-white">
                                            {formatCurrency(p.total_amount_cents, p.currency)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {p.status === 'complete' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                                    <CheckCircle size={12} /> Paid
                                                </span>
                                            ) : p.status === 'pending' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                                    <Clock size={12} /> Pending
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                                                    <XCircle size={12} /> Failed
                                                </span>
                                            )}
                                            {p.stripe_session_id && (
                                                <div className="text-[9px] text-white/20 mt-2 font-mono" title="Session ID">
                                                    {p.stripe_session_id.substring(0, 15)}...
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}
