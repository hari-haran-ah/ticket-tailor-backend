import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import {
    ChevronLeft, AlertCircle, Users, Globe,
    Key, DollarSign, Mail, Phone, MapPin
} from 'lucide-react'

export default function NewClientPage() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [form, setForm] = useState({
        name: '',
        domain_name: '',
        tt_api_key: '',
        stripe_account_id: '',
        platform_fee: '0',
        contact_email: '',
        contact_phone: '',
        address: '',
        is_active: true,
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true); setError('')

        if (!form.domain_name.trim().startsWith('http://') && !form.domain_name.trim().startsWith('https://')) {
            setError('Domain must start with http:// or https://'); setLoading(false); return
        }
        if (form.tt_api_key && !form.tt_api_key.startsWith('sk_')) {
            setError('TT API Key must start with sk_'); setLoading(false); return
        }
        if (!form.stripe_account_id.startsWith('acct_')) {
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
            await api.post('/api/clients', payload)
            // Navigate back to the client list page upon success
            navigate('/clients')
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create client')
            setLoading(false)
        }
    }

    const fields = [
        { key: 'name', label: 'Client Name', icon: Users, type: 'text', required: true, desc: 'The legal or display name of the client organization.' },
        { key: 'domain_name', label: 'Domain Name', icon: Globe, type: 'text', required: true, placeholder: 'https://client.yourdomain.com', desc: 'The primary web domain for this client.' },
        { key: 'tt_api_key', label: 'TicketTailor API Key', icon: Key, type: 'text', required: true, placeholder: 'sk_...', desc: 'Secret API key used to sync events from TicketTailor.' },
        { key: 'stripe_account_id', label: 'Stripe Account ID', icon: DollarSign, type: 'text', required: true, placeholder: 'acct_...', desc: 'Used for Stripe Connect routed payments.' },
        { key: 'platform_fee', label: 'Platform Fee %', icon: DollarSign, type: 'number', required: true, step: '0.01', min: '0', max: '100', desc: 'Percentage cut taken by the platform per sale.' },
        { key: 'contact_email', label: 'Contact Email', icon: Mail, type: 'email', desc: 'Primary support or administrative contact email.' },
        { key: 'contact_phone', label: 'Contact Phone', icon: Phone, type: 'text', desc: 'Primary administrative contact phone number.' },
        { key: 'address', label: 'Address', icon: MapPin, type: 'text', desc: 'Physical or billing address. Can be omitted if unknown.' },
    ]

    return (
        <div className="p-4 md:p-6 lg:p-8 min-h-full h-full overflow-y-auto w-full bg-white dark:bg-[#0a0a0a]">
            <div className="space-y-8 max-w-4xl mx-auto pb-12">
                {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-gray-300 dark:border-white/10 pb-6">
                <div className="space-y-3">
                    <button onClick={() => navigate('/clients')} className="text-gray-500 dark:text-white/30 hover:text-gray-900 dark:hover:text-white/70 flex items-center gap-1.5 text-xs font-medium transition-colors">
                        <ChevronLeft size={14} /> Back to Clients
                    </button>
                    <div>
                        <p className="text-gray-600 dark:text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">New Client</p>
                        <h1 className="text-2xl font-bold text-black dark:text-white tracking-tight">Register a Client</h1>
                    </div>
                </div>
            </div>

            <div className="card overflow-hidden">
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {fields.map(({ key, label, icon: Icon, type, required, placeholder, desc }) => (
                            <div key={key} className="space-y-1.5">
                                <label className="label">
                                    {label}{required && <span className="text-red-500 font-bold ml-1">*</span>}
                                </label>
                                <div className="relative">
                                    <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30" />
                                    <input
                                        type={type}
                                        className="input-field pl-10 md:text-[15px]"
                                        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
                                        value={form[key]}
                                        onChange={e => setForm({ ...form, [key]: e.target.value })}
                                        required={required}
                                        step={key === 'platform_fee' ? '0.01' : undefined}
                                        min={key === 'platform_fee' ? '0' : undefined}
                                        max={key === 'platform_fee' ? '100' : undefined}
                                    />
                                </div>
                                {desc && <p className="text-[11px] text-gray-500 dark:text-white/40 pt-0.5">{desc}</p>}
                            </div>
                        ))}
                    </div>

                    <hr className="border-gray-300 dark:border-white/10" />

                    <div className="flex items-center gap-3 pt-2">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={form.is_active}
                            onChange={e => setForm({ ...form, is_active: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 dark:border-white/20 bg-white dark:bg-black accent-black dark:accent-white cursor-pointer"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-white/80 cursor-pointer select-none">
                            Set client as Active immediately
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
                        <button type="button" onClick={() => navigate('/clients')} className="btn-secondary">Cancel</button>
                        <button disabled={loading} className="btn-primary">
                            {loading ? 'Registering...' : 'Register Client'}
                        </button>
                    </div>
                </form>
            </div>
            </div>
        </div>
    )
}
