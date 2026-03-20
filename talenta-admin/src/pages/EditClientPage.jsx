import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'
import {
    ChevronLeft, AlertCircle, Users, Globe,
    Key, DollarSign, Mail, Phone, MapPin
} from 'lucide-react'
import Skeleton from '../components/Skeleton'

export default function EditClientPage() {
    const { clientId } = useParams()
    const navigate = useNavigate()
    const [loadingInit, setLoadingInit] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [form, setForm] = useState({
        name: '', domain_name: '', tt_api_key: '', stripe_account_id: '',
        platform_fee: '0', contact_email: '', contact_phone: '', address: '', is_active: true
    })

    useEffect(() => {
        const fetchClient = async () => {
            try {
                const { data } = await api.get('/api/clients')
                const client = data.find(c => String(c.id) === String(clientId))
                if (client) {
                    setForm({
                        name: client.name || '',
                        domain_name: client.domain_name || '',
                        tt_api_key: client.tt_api_key || '',
                        stripe_account_id: client.stripe_account_id || '',
                        platform_fee: client.platform_fee?.toString() || '0',
                        contact_email: client.contact_email || '',
                        contact_phone: client.contact_phone || '',
                        address: client.address || '',
                        is_active: client.is_active !== undefined ? client.is_active : true
                    })
                } else {
                    setError('Client not found')
                }
            } catch (err) {
                setError('Failed to fetch client details')
            } finally {
                setLoadingInit(false)
            }
        }
        fetchClient()
    }, [clientId])

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
            if (digits.length > 0 && (digits.length < 10 || digits.length > 12)) {
                setError('Contact phone must contain 10 to 12 numbers'); setLoading(false); return
            }
        }

        try {
            const payload = {
                ...form,
                platform_fee: fee,
                contact_phone: form.contact_phone ? form.contact_phone.replace(/\D/g, '') : null
            }
            await api.put(`/api/clients/${clientId}`, payload)
            navigate('/clients')
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update client')
            setLoading(false)
        }
    }

    const fields = [
        { key: 'name', label: 'Client Name', icon: Users, type: 'text', required: true },
        { key: 'domain_name', label: 'Domain', icon: Globe, type: 'text', required: true, placeholder: 'https://...' },
        { key: 'tt_api_key', label: 'TicketTailor API Key', icon: Key, type: 'text', required: true, placeholder: 'sk_...' },
        { key: 'stripe_account_id', label: 'Stripe Account ID', icon: DollarSign, type: 'text', placeholder: 'acct_...' },
        { key: 'platform_fee', label: 'Platform Fee %', icon: DollarSign, type: 'number', required: true, step: '0.01', min: '0', max: '100' },
        { key: 'contact_email', label: 'Contact Email', icon: Mail, type: 'email' },
        { key: 'contact_phone', label: 'Contact Phone', icon: Phone, type: 'text' },
        { key: 'address', label: 'Address', icon: MapPin, type: 'text' },
    ]

    if (loadingInit) {
        return (
            <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
                <Skeleton className="w-28 h-4 mb-4" />
                <Skeleton className="w-48 h-6" />
                <div className="card p-5 space-y-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="w-20 h-3" />
                                <Skeleton className="w-full h-9" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
            {/* Header */}
            <div className="space-y-2 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <button onClick={() => navigate('/clients')} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 text-xs font-medium transition-colors">
                    <ChevronLeft size={14} /> Back
                </button>
                <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Edit Client</h1>
            </div>

            <div className="card overflow-hidden">
                <form onSubmit={handleSubmit} className="p-4 md:p-5 space-y-5">
                    {/* Error Message */}
                    {error && error !== 'Client not found' && (
                        <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {error === 'Client not found' ? (
                        <div className="text-center py-12 text-zinc-500">
                            Client not found.
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {fields.map(({ key, label, icon: Icon, type, required, placeholder }) => (
                                    <div key={key} className="space-y-1">
                                        <label className="text-xs font-medium text-zinc-500">
                                            {label}{required && <span className="text-zinc-900 dark:text-zinc-100 ml-0.5">*</span>}
                                        </label>
                                        <div className="relative">
                                            <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                            <input
                                                type={type}
                                                className="input-field pl-9"
                                                placeholder={placeholder || `Enter ${label.toLowerCase()}`}
                                                value={form[key]}
                                                onChange={e => setForm({ ...form, [key]: e.target.value })}
                                                required={required}
                                                step={key === 'platform_fee' ? '0.01' : undefined}
                                                min={key === 'platform_fee' ? '0' : undefined}
                                                max={key === 'platform_fee' ? '100' : undefined}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={form.is_active}
                                    onChange={e => setForm({ ...form, is_active: e.target.checked })}
                                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                                />
                                <label htmlFor="is_active" className="text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                                    Active
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                <button type="button" onClick={() => navigate('/clients')} className="btn-secondary">Cancel</button>
                                <button disabled={loading} className="btn-primary">
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    )
}
