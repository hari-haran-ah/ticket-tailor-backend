import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { clientApi } from '../../api/client'
import {
    ChevronLeft, AlertCircle, Users, Globe,
    Key, DollarSign, Mail, Phone, MapPin
} from 'lucide-react'
import Skeleton from '../../components/ui/Skeleton'

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title }) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                {title}
            </span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
        </div>
    )
}

export default function EditClientPage() {
    const { clientId } = useParams()
    const navigate = useNavigate()
    const [loadingInit, setLoadingInit] = useState(true)
    const [loading, setLoading] = useState(false)
    const [globalError, setGlobalError] = useState('')
    const [errors, setErrors] = useState({})
    const [form, setForm] = useState({
        name: '', domain_name: '', tt_api_key: '', stripe_account_id: '',
        platform_fee: '0', contact_email: '', contact_phone: '', address: '', is_active: true
    })

    useEffect(() => {
        const fetchClient = async () => {
            try {
                const { data } = await clientApi.getAll()
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
                    setGlobalError('Client not found')
                }
            } catch (err) {
                setGlobalError('Failed to fetch client details')
            } finally {
                setLoadingInit(false)
            }
        }
        fetchClient()
    }, [clientId])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true); setGlobalError(''); setErrors({})
        let newErrors = {}

        if (!form.domain_name.trim().startsWith('http://') && !form.domain_name.trim().startsWith('https://')) {
            newErrors.domain_name = 'Domain must start with http:// or https://'
        }
        if (form.tt_api_key && !form.tt_api_key.startsWith('sk_')) {
            newErrors.tt_api_key = 'TT API Key must start with sk_'
        }
        if (!form.stripe_account_id.startsWith('acct_')) {
            newErrors.stripe_account_id = 'Stripe Account ID must start with acct_'
        }
        const fee = parseFloat(form.platform_fee)
        if (isNaN(fee) || fee < 0 || fee > 100) {
            newErrors.platform_fee = 'Platform fee must be between 0 and 100'
        }
        if (form.contact_phone) {
            const digits = form.contact_phone.replace(/\D/g, '')
            if (digits.length > 0 && (digits.length < 10 || digits.length > 12)) {
                newErrors.contact_phone = 'Contact phone must contain 10 to 12 numbers'
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            setLoading(false)
            return
        }

        try {
            const payload = {
                ...form,
                platform_fee: fee,
                contact_phone: form.contact_phone ? form.contact_phone.replace(/\D/g, '') : null
            }
            await clientApi.update(clientId, payload)
            navigate('/clients')
        } catch (err) {
            setGlobalError(err.response?.data?.detail || 'Failed to update client')
            setLoading(false)
        }
    }

    const setField = (key, value) => {
        setForm(f => ({ ...f, [key]: value }))
        if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
    }

    const fieldProps = (key) => ({
        value: form[key],
        onChange: e => setField(key, e.target.value),
        className: `input-field pl-9 ${errors[key] ? 'border-red-400 dark:border-red-500 focus:ring-red-500/20' : ''}`
    })

    if (loadingInit) {
        return (
            <div className="p-4 md:p-6 lg:p-8 min-h-full h-full overflow-y-auto w-full bg-white dark:bg-zinc-950">
                <div className="space-y-6 max-w-3xl mx-auto pb-12">
                    <div className="flex items-center gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                        <Skeleton className="w-16 h-4" />
                        <Skeleton className="w-32 h-6" />
                    </div>
                    <div className="card p-5 md:p-6 space-y-6">
                        <Skeleton className="w-36 h-3" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="w-24 h-3" />
                                    <Skeleton className="w-full h-9 rounded-md" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 min-h-full h-full overflow-y-auto w-full bg-white dark:bg-zinc-950">
            <div className="max-w-3xl mx-auto space-y-6 pb-12">

                {/* ─── Page Header ─── */}
                <div className="flex items-center gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                    <button
                        onClick={() => navigate('/clients')}
                        className="shrink-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors pr-4 border-r border-zinc-200 dark:border-zinc-800"
                    >
                        <ChevronLeft size={14} strokeWidth={2.5} /> Back
                    </button>
                    <div>
                        <h1 className="text-xl lg:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight leading-none">
                            Edit Client
                        </h1>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Update client details and integration settings
                        </p>
                    </div>
                </div>

                {/* ─── Form Card ─── */}
                <div className="card overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-6">

                        {/* Global Error */}
                        {globalError && globalError !== 'Client not found' && (
                            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                                <AlertCircle size={16} /> {globalError}
                            </div>
                        )}

                        {globalError === 'Client not found' ? (
                            <div className="text-center py-12 text-zinc-500 text-sm">
                                Client not found.
                            </div>
                        ) : (
                            <>
                                {/* ── Section: Basic Information ── */}
                                <div className="space-y-4">
                                    <SectionHeader title="Basic Information" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                        {/* Client Name */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">
                                                Client Name <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <Users size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                                <input type="text" placeholder="Enter client name" {...fieldProps('name')} required />
                                            </div>
                                            {errors.name
                                                ? <p className="text-red-500 text-xs">{errors.name}</p>
                                                : <p className="text-xs text-zinc-400 dark:text-zinc-500">The legal or display name of the client organization.</p>
                                            }
                                        </div>

                                        {/* Domain Name */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">
                                                Domain Name <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                                <input type="text" placeholder="https://..." {...fieldProps('domain_name')} required />
                                            </div>
                                            {errors.domain_name
                                                ? <p className="text-red-500 text-xs">{errors.domain_name}</p>
                                                : <p className="text-xs text-zinc-400 dark:text-zinc-500">The primary web domain for this client.</p>
                                            }
                                        </div>

                                    </div>
                                </div>

                                {/* ── Section: Integration Settings ── */}
                                <div className="space-y-4">
                                    <SectionHeader title="Integration Settings" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                        {/* TT API Key */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">
                                                TicketTailor API Key <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <Key size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                                <input type="text" placeholder="sk_..." {...fieldProps('tt_api_key')} required />
                                            </div>
                                            {errors.tt_api_key
                                                ? <p className="text-red-500 text-xs">{errors.tt_api_key}</p>
                                                : <p className="text-xs text-zinc-400 dark:text-zinc-500">Secret API key used to sync events from TicketTailor.</p>
                                            }
                                        </div>

                                        {/* Stripe Account ID */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">
                                                Stripe Account ID <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                                <input type="text" placeholder="acct_..." {...fieldProps('stripe_account_id')} required />
                                            </div>
                                            {errors.stripe_account_id
                                                ? <p className="text-red-500 text-xs">{errors.stripe_account_id}</p>
                                                : <p className="text-xs text-zinc-400 dark:text-zinc-500">Used for Stripe Connect routed payments.</p>
                                            }
                                        </div>

                                        {/* Platform Fee */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">
                                                Platform Fee % <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    {...fieldProps('platform_fee')}
                                                    required
                                                />
                                            </div>
                                            {errors.platform_fee
                                                ? <p className="text-red-500 text-xs">{errors.platform_fee}</p>
                                                : <p className="text-xs text-zinc-400 dark:text-zinc-500">Percentage cut taken by the platform per sale.</p>
                                            }
                                        </div>

                                    </div>
                                </div>

                                {/* ── Section: Contact Details ── */}
                                <div className="space-y-4">
                                    <SectionHeader title="Contact Details" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                        {/* Contact Email */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">
                                                Contact Email
                                            </label>
                                            <div className="relative">
                                                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                                <input type="email" placeholder="admin@client.com" {...fieldProps('contact_email')} />
                                            </div>
                                            {errors.contact_email
                                                ? <p className="text-red-500 text-xs">{errors.contact_email}</p>
                                                : <p className="text-xs text-zinc-400 dark:text-zinc-500">Primary support or administrative contact email.</p>
                                            }
                                        </div>

                                        {/* Contact Phone */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">
                                                Contact Phone
                                            </label>
                                            <div className="relative">
                                                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                                <input type="text" placeholder="+1 555 000 0000" {...fieldProps('contact_phone')} />
                                            </div>
                                            {errors.contact_phone
                                                ? <p className="text-red-500 text-xs">{errors.contact_phone}</p>
                                                : <p className="text-xs text-zinc-400 dark:text-zinc-500">Primary administrative contact phone number.</p>
                                            }
                                        </div>

                                        {/* Address — full width */}
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block">
                                                Address
                                            </label>
                                            <div className="relative">
                                                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                                <input type="text" placeholder="123 Main St, City, Country" {...fieldProps('address')} />
                                            </div>
                                            {errors.address
                                                ? <p className="text-red-500 text-xs">{errors.address}</p>
                                                : <p className="text-xs text-zinc-400 dark:text-zinc-500">Physical or billing address. Can be omitted if unknown.</p>
                                            }
                                        </div>

                                    </div>
                                </div>

                                {/* ── Active Checkbox ── */}
                                <div className="flex items-center gap-3 py-1">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={form.is_active}
                                        onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                        className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                                        Client is <span className="font-semibold text-zinc-900 dark:text-zinc-100">Active</span>
                                    </label>
                                </div>

                                {/* ── Form Actions ── */}
                                <div className="flex justify-end gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/clients')}
                                        className="btn-secondary h-9 px-5 font-semibold flex items-center justify-center"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={loading}
                                        className="btn-primary h-9 px-5 font-semibold flex items-center justify-center"
                                    >
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </>
                        )}
                    </form>
                </div>

            </div>
        </div>
    )
}
