import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import {
    Plus, Pencil, Trash2, X, Check, AlertCircle,
    Globe, Key, DollarSign, Phone, Mail, MapPin, Users,
    CalendarDays, Search, ChevronLeft, ChevronRight,
    Eye, ToggleLeft, ToggleRight, Power
} from 'lucide-react'
import Skeleton from '../components/Skeleton'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
import Toast from '../components/Toast'

const PAGE_SIZE = 5

// ─── Build form defaults ──────────────────────────────────────────────────────
function buildInitialForm(client) {
    const defaults = {
        name: '', domain_name: '', tt_api_key: '', stripe_account_id: '',
        contact_email: '', contact_phone: '', address: '', is_active: true,
    }
    const merged = client ? { ...defaults, ...client } : defaults
    merged.platform_fee = client?.platform_fee?.toString() ?? '0'
    return merged
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
function ClientModal({ client, onClose, onSaved }) {
    const isEdit = !!client?.id
    const [form, setForm] = useState(() => buildInitialForm(client))
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true); setError('')

        if (!form.domain_name.trim().startsWith('http://') && !form.domain_name.trim().startsWith('https://')) {
            setError('Domain must start with http:// or https://'); setLoading(false); return
        }
        if (form.tt_api_key && !form.tt_api_key.startsWith('sk_')) {
            setError('TT API Key must start with sk_'); setLoading(false); return
        }
        if (form.stripe_account_id && !form.stripe_account_id.startsWith('acct_')) {
            setError('Stripe Account ID must start with acct_'); setLoading(false); return
        }
        const fee = parseFloat(form.platform_fee)
        if (isNaN(fee) || fee < 0 || fee > 100) {
            setError('Platform fee must be between 0 and 100'); setLoading(false); return
        }
        if (form.contact_phone) {
            const digits = form.contact_phone.replace(/\D/g, '')
            if (digits.length < 10 || digits.length > 12) {
                setError('Contact phone must contain 10 to 12 numbers'); setLoading(false); return
            }
        }

        try {
            const payload = {
                ...form,
                platform_fee: fee,
                contact_phone: form.contact_phone ? form.contact_phone.replace(/\D/g, '') : null
            }
            if (isEdit) {
                await api.put(`/api/clients/${client.id}`, payload)
            } else {
                await api.post('/api/clients', payload)
            }
            onSaved()
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to save client')
        } finally {
            setLoading(false)
        }
    }

    const fields = [
        { key: 'name', label: 'Client Name', icon: Users, type: 'text', required: true },
        { key: 'domain_name', label: 'Domain Name', icon: Globe, type: 'text', required: true, placeholder: 'https://client.yourdomain.com' },
        { key: 'tt_api_key', label: 'TT API Key', icon: Key, type: 'text', required: true, placeholder: 'sk_...' },
        { key: 'stripe_account_id', label: 'Stripe Account ID', icon: DollarSign, type: 'text', placeholder: 'acct_...' },
        { key: 'platform_fee', label: 'Platform Fee %', icon: DollarSign, type: 'number', required: true, step: '0.01', min: '0', max: '100' },
        { key: 'contact_email', label: 'Contact Email', icon: Mail, type: 'email' },
        { key: 'contact_phone', label: 'Contact Phone', icon: Phone, type: 'text' },
        { key: 'address', label: 'Address', icon: MapPin, type: 'text' },
    ]

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <h2 className="text-lg font-semibold text-white">
                        {isEdit ? 'Edit Client' : 'New Client'}
                    </h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}
                    {fields.map(({ key, label, icon: Icon, type, required, ...rest }) => (
                        <div key={key}>
                            <label className="label">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>
                            <div className="relative">
                                <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type={type}
                                    className="input-field pl-9"
                                    value={form[key]}
                                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                    required={required}
                                    {...rest}
                                />
                            </div>
                        </div>
                    ))}

                    <div className="flex items-center gap-3 pt-1">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={form.is_active}
                            onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                            className="w-4 h-4 accent-primary-600"
                        />
                        <label htmlFor="is_active" className="text-sm text-white/70">Active</label>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center flex items-center gap-2">
                            {loading ? 'Saving…' : <><Check size={15} /> {isEdit ? 'Update' : 'Create'}</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Toggle Status Confirmation Popup ────────────────────────────────────────
function ToggleStatusModal({ client, onClose, onConfirm, loading }) {
    if (!client) return null
    const willBeActive = !client.is_active
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-sm p-6 space-y-5">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${willBeActive ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <Power size={20} className={willBeActive ? 'text-green-400' : 'text-red-400'} />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold">
                            {willBeActive ? 'Activate' : 'Deactivate'} Client
                        </h3>
                        <p className="text-white/40 text-xs mt-0.5">{client.name}</p>
                    </div>
                </div>
                <p className="text-white/60 text-sm">
                    Are you sure you want to <strong className={willBeActive ? 'text-green-400' : 'text-red-400'}>
                        {willBeActive ? 'activate' : 'deactivate'}
                    </strong> <span className="text-white">{client.name}</span>?
                    {willBeActive
                        ? ' The client will be able to receive traffic immediately.'
                        : ' The client\'s frontend will receive a 404 error until reactivated.'}
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                            willBeActive
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/20'
                                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20'
                        }`}
                    >
                        {loading ? 'Updating…' : <><Check size={14} /> Confirm</>}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Client Detail Drawer ────────────────────────────────────────────────────
function ClientDetailDrawer({ client, onClose, onEdit }) {
    if (!client) return null
    const rows = [
        { label: 'Domain', value: client.domain_name, mono: true },
        { label: 'TT API Key', value: client.tt_api_key, mono: true, truncate: true },
        { label: 'Stripe Account', value: client.stripe_account_id || '—', mono: true },
        { label: 'Platform Fee', value: `${client.platform_fee}%` },
        { label: 'Contact Email', value: client.contact_email || '—' },
        { label: 'Contact Phone', value: client.contact_phone || '—' },
        { label: 'Address', value: client.address || '—' },
        { label: 'Created', value: client.created_at ? new Date(client.created_at).toLocaleString() : '—' },
    ]
    return (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
            <div
                className="w-full max-w-md h-full bg-[#111827] border-l border-white/10 overflow-y-auto shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                    <div>
                        <h2 className="text-white font-semibold text-lg">{client.name}</h2>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${
                            client.is_active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                        }`}>
                            {client.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white p-1">
                        <X size={20} />
                    </button>
                </div>

                {/* Details */}
                <div className="flex-1 px-6 py-5 space-y-4">
                    {rows.map(({ label, value, mono, truncate }) => (
                        <div key={label} className="flex flex-col gap-1">
                            <span className="text-white/40 text-xs uppercase tracking-wider">{label}</span>
                            <span className={`text-white/80 text-sm break-all ${mono ? 'font-mono' : ''} ${truncate ? 'truncate' : ''}`}>
                                {value}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-white/5 flex gap-3">
                    <button
                        onClick={() => { onEdit(client); onClose() }}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                        <Pencil size={14} /> Edit Client
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
function SkeletonTable() {
    return (
        <div className="card animate-pulse">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            {[80, 160, 140, 50, 60, 140, 60].map((w, i) => (
                                <th key={i} className="px-6 py-4">
                                    <Skeleton className={`h-3 rounded`} style={{ width: w }} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                            <tr key={i} className="border-b border-white/5">
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
    const [modal, setModal] = useState(null)
    const [deleting, setDeleting] = useState(null)
    const [toast, setToast] = useState({ show: false, message: '' })
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [viewClient, setViewClient] = useState(null)
    const [toggleTarget, setToggleTarget] = useState(null)
    const [toggling, setToggling] = useState(false)

    const load = async () => {
        setLoading(true)
        try {
            const { data } = await api.get('/api/clients')
            setClients(data)
        } catch (e) {
            setError(e.response?.data?.detail || 'Failed to load clients')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    // ── Search & Paginate (client-side) ──────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim()
        if (!q) return clients
        return clients.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.domain_name.toLowerCase().includes(q) ||
            (c.contact_email || '').toLowerCase().includes(q)
        )
    }, [clients, search])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    // reset to page 1 on search
    useEffect(() => { setPage(1) }, [search])

    // ── Delete ───────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleting) return
        try {
            await api.delete(`/api/clients/${deleting.id}`)
            setClients(c => c.filter(x => x.id !== deleting.id))
            setToast({ show: true, message: `"${deleting.name}" deleted successfully.` })
        } catch {
            setToast({ show: true, message: 'Failed to delete client' })
        } finally {
            setDeleting(null)
        }
    }

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
                    <h1 className="text-xl md:text-2xl font-bold text-white">Clients</h1>
                    <p className="text-white/40 text-sm mt-1">{clients.length} client(s) registered</p>
                </div>
                <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2">
                    <Plus size={16} />
                    <span className="hidden sm:inline">New Client</span>
                    <span className="sm:hidden">New</span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                    type="text"
                    placeholder="Search by name, domain, email…"
                    className="input-field pl-9 text-sm"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {error && (
                <div className="card p-4 flex items-center gap-3 text-red-400">
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
                                <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
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
                                {paginated.map(c => (
                                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{c.name}</td>
                                        <td className="px-6 py-4 text-white/50 font-mono text-xs max-w-[160px] truncate">{c.domain_name}</td>
                                        <td className="px-6 py-4 font-mono text-[10px] text-white/40">
                                            <div className="flex flex-col gap-1">
                                                <span>TT: {c.tt_api_key.substring(0, 12)}…</span>
                                                {c.stripe_account_id && <span className="text-primary-400">Stripe: {c.stripe_account_id}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-white/70">{c.platform_fee}%</td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setToggleTarget(c)}
                                                className="group flex items-center justify-center gap-1.5 mx-auto"
                                            >
                                                {c.is_active
                                                    ? <ToggleRight size={22} className="text-green-400 group-hover:text-green-300 transition-colors" />
                                                    : <ToggleLeft size={22} className="text-white/30 group-hover:text-white/60 transition-colors" />
                                                }
                                                <span className={`text-xs font-medium ${c.is_active ? 'text-green-400' : 'text-white/30'}`}>
                                                    {c.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-white/40 text-xs">{c.contact_email || '—'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => setViewClient(c)} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors" title="View Details"><Eye size={14} /></button>
                                                <button onClick={() => navigate(`/events/${c.id}`)} className="p-2 rounded-lg text-primary-400/60 hover:text-primary-400 hover:bg-primary-500/10 transition-colors" title="View Events"><CalendarDays size={14} /></button>
                                                <button onClick={() => setModal(c)} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors" title="Edit"><Pencil size={14} /></button>
                                                <button onClick={() => setDeleting(c)} className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {paginated.length === 0 && (
                            <div className="text-center py-16 text-white/30">
                                <Users size={40} className="mx-auto mb-3 opacity-40" />
                                {search ? `No clients match "${search}"` : 'No clients yet.'}
                            </div>
                        )}
                    </div>

                    {/* CARD LIST — shown only on mobile */}
                    <div className="md:hidden divide-y divide-white/5">
                        {paginated.length === 0 ? (
                            <div className="text-center py-16 text-white/30 px-4">
                                <Users size={36} className="mx-auto mb-3 opacity-40" />
                                {search ? `No clients match "${search}"` : 'No clients yet.'}
                            </div>
                        ) : paginated.map(c => (
                            <div key={c.id} className="p-4 space-y-3">
                                {/* Name + status */}
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-white font-semibold text-sm">{c.name}</span>
                                    <button
                                        onClick={() => setToggleTarget(c)}
                                        className="flex items-center gap-1"
                                    >
                                        {c.is_active
                                            ? <ToggleRight size={20} className="text-green-400" />
                                            : <ToggleLeft size={20} className="text-white/30" />
                                        }
                                        <span className={`text-xs font-medium ${c.is_active ? 'text-green-400' : 'text-white/30'}`}>
                                            {c.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </button>
                                </div>
                                {/* Domain + fee */}
                                <div className="flex items-center gap-3 text-[11px]">
                                    <span className="font-mono text-white/40 truncate flex-1">{c.domain_name}</span>
                                    <span className="text-white/50 flex-shrink-0">{c.platform_fee}% fee</span>
                                </div>
                                {/* Email */}
                                {c.contact_email && (
                                    <p className="text-xs text-white/40">{c.contact_email}</p>
                                )}
                                {/* Action buttons */}
                                <div className="flex items-center gap-2 pt-1">
                                    <button onClick={() => setViewClient(c)} className="flex-1 py-1.5 rounded-lg text-xs text-white/50 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5">
                                        <Eye size={12} /> View
                                    </button>
                                    <button onClick={() => navigate(`/events/${c.id}`)} className="flex-1 py-1.5 rounded-lg text-xs text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 transition-colors flex items-center justify-center gap-1.5">
                                        <CalendarDays size={12} /> Events
                                    </button>
                                    <button onClick={() => setModal(c)} className="flex-1 py-1.5 rounded-lg text-xs text-white/50 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5">
                                        <Pencil size={12} /> Edit
                                    </button>
                                    <button onClick={() => setDeleting(c)} className="py-1.5 px-3 rounded-lg text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors flex items-center justify-center">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination — shared */}
                    {filtered.length > PAGE_SIZE && (
                        <div className="flex flex-wrap items-center justify-between gap-2 px-4 md:px-6 py-3 border-t border-white/5">
                            <p className="text-white/40 text-xs">
                                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                                            p === page ? 'bg-primary-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create / Edit Modal */}
            {modal && (
                <ClientModal
                    client={modal === 'create' ? null : modal}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load() }}
                />
            )}

            {/* Toggle Status Confirmation */}
            <ToggleStatusModal
                client={toggleTarget}
                onClose={() => setToggleTarget(null)}
                onConfirm={handleToggleStatus}
                loading={toggling}
            />

            {/* Delete Confirmation */}
            <DeleteConfirmationModal
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={handleDelete}
                title="Delete Client"
                message={`Are you sure you want to delete "${deleting?.name}"? This will remove all associated data and cannot be undone.`}
            />

            {/* Client Detail Drawer */}
            <ClientDetailDrawer
                client={viewClient}
                onClose={() => setViewClient(null)}
                onEdit={c => setModal(c)}
            />

            <Toast
                show={toast.show}
                message={toast.message}
                onClose={() => setToast({ ...toast, show: false })}
            />
        </div>
    )
}
