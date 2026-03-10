import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import {
    Plus, Pencil, Trash2, X, Check, AlertCircle,
    Globe, Key, DollarSign, Phone, Mail, MapPin, Users, CalendarDays
} from 'lucide-react'
import Skeleton from '../components/Skeleton'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
import Toast from '../components/Toast'

function buildInitialForm(client) {
    const defaults = {
        name: '', domain_name: '', tt_api_key: '', stripe_account_id: '',
        contact_email: '', contact_phone: '', address: '', is_active: true,
    }
    const merged = client ? { ...defaults, ...client } : defaults
    // Always convert platform_fee to string for the controlled input
    merged.platform_fee = client?.platform_fee?.toString() ?? '0'
    return merged
}

function ClientModal({ client, onClose, onSaved }) {
    const isEdit = !!client?.id
    const [form, setForm] = useState(() => buildInitialForm(client))
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true); setError('')

        // Frontend Validations
        if (!/^[a-zA-Z0-9 \-]+$/.test(form.name)) {
            setError('Client name must be alphanumeric (letters, numbers, spaces, and hyphens)'); setLoading(false); return
        }
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
        { key: 'domain_name', label: 'Domain Name', icon: Globe, type: 'text', required: true, placeholder: 'client.yourdomain.com' },
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
                    <button onClick={onClose} className="text-white/40 hover:text-white">
                        <X size={20} />
                    </button>
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

export default function ClientsPage() {
    const navigate = useNavigate()
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [modal, setModal] = useState(null) // null | 'create' | client object
    const [deleting, setDeleting] = useState(null)
    const [toast, setToast] = useState({ show: false, message: '' })

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

    const handleDelete = async () => {
        if (!deleting) return
        try {
            await api.delete(`/api/clients/${deleting.id}`)
            setClients(c => c.filter(x => x.id !== deleting.id))
            setToast({ show: true, message: `Client "${deleting.name}" deleted successfully.` })
        } catch {
            setToast({ show: true, message: 'Failed to delete client' })
        } finally {
            setDeleting(null)
        }
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Clients</h1>
                    <p className="text-white/40 text-sm mt-1">{clients.length} client(s) registered</p>
                </div>
                <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2">
                    <Plus size={16} /> New Client
                </button>
            </div>

            {error && (
                <div className="card p-4 flex items-center gap-3 text-red-400">
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            {loading ? (
                <div className="card animate-fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 text-left"><Skeleton className="w-20 h-3" /></th>
                                    <th className="px-6 py-4 text-left"><Skeleton className="w-32 h-3" /></th>
                                    <th className="px-6 py-4 text-left"><Skeleton className="w-40 h-3" /></th>
                                    <th className="px-6 py-4 text-right"><Skeleton className="w-12 h-3 ml-auto" /></th>
                                    <th className="px-6 py-4 text-center"><Skeleton className="w-16 h-3 mx-auto" /></th>
                                    <th className="px-6 py-4 text-left"><Skeleton className="w-32 h-3" /></th>
                                    <th className="px-6 py-4 text-right"><Skeleton className="w-20 h-3 ml-auto" /></th>
                                </tr>
                            </thead>
                            <tbody>
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <tr key={i} className="border-b border-white/5">
                                        <td className="px-6 py-5"><Skeleton className="w-32 h-4" /></td>
                                        <td className="px-6 py-5"><Skeleton className="w-48 h-4" /></td>
                                        <td className="px-6 py-5">
                                            <div className="space-y-2">
                                                <Skeleton className="w-40 h-3" />
                                                <Skeleton className="w-32 h-3" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-5"><Skeleton className="w-10 h-4 ml-auto" /></td>
                                        <td className="px-6 py-5 text-center"><Skeleton className="w-16 h-5 rounded-full mx-auto" /></td>
                                        <td className="px-6 py-5"><Skeleton className="w-40 h-3" /></td>
                                        <td className="px-6 py-5 text-right flex justify-end gap-2">
                                            <Skeleton className="w-8 h-8 rounded-lg" />
                                            <Skeleton className="w-8 h-8 rounded-lg" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
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
                                {clients.map(c => (
                                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{c.name}</td>
                                        <td className="px-6 py-4 text-white/50 font-mono text-xs">{c.domain_name}</td>
                                        <td className="px-6 py-4 font-mono text-[10px] text-white/40">
                                            <div className="flex flex-col gap-1">
                                                <span>TT: {c.tt_api_key.substring(0, 12)}…</span>
                                                {c.stripe_account_id && <span className="text-primary-400">Stripe: {c.stripe_account_id}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-white/70">{c.platform_fee}%</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={c.is_active ? 'badge-green' : 'badge-red'}>
                                                {c.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-white/40 text-xs">{c.contact_email || '—'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(`/events/${c.id}`)}
                                                    className="p-2 rounded-lg text-primary-400/60 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                                                    title="View Events"
                                                >
                                                    <CalendarDays size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setModal(c)}
                                                    className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                                                    title="Edit Client"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleting(c)}
                                                    className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                    title="Delete Client"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {clients.length === 0 && (
                            <div className="text-center py-16 text-white/30">
                                <Users size={40} className="mx-auto mb-3 opacity-40" />
                                No clients yet. Create your first client.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {modal && (
                <ClientModal
                    client={modal === 'create' ? null : modal}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load() }}
                />
            )}

            <DeleteConfirmationModal
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={handleDelete}
                title="Delete Client"
                message={`Are you sure you want to delete "${deleting?.name}"? This will remove all associated data and cannot be undone.`}
            />

            <Toast
                show={toast.show}
                message={toast.message}
                onClose={() => setToast({ ...toast, show: false })}
            />
        </div>
    )
}
