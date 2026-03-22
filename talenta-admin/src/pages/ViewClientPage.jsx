import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'
import {
    ChevronLeft, Users, Globe, Key, DollarSign,
    Mail, Phone, MapPin, CalendarDays, Pencil, Copy, Check, ChevronRight, X
} from 'lucide-react'
import Skeleton from '../components/Skeleton'

// Helper function to format name with proper capitalization
const formatName = (name) => {
    if (!name) return ''
    return name.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
}

export default function ViewClientPage() {
    const { clientId } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [client, setClient] = useState(null)
    const [events, setEvents] = useState([])
    const [copiedKey, setCopiedKey] = useState(false)
    const [copiedStripe, setCopiedStripe] = useState(false)

    const copyToClipboard = (text, type) => {
        if (!text || text === '—' || text === 'Not Connected' || text === 'No key generated') return
        navigator.clipboard.writeText(text)
        if (type === 'key') {
            setCopiedKey(true)
            setTimeout(() => setCopiedKey(false), 2000)
        } else {
            setCopiedStripe(true)
            setTimeout(() => setCopiedStripe(false), 2000)
        }
    }

    useEffect(() => {
        const fetchClient = async () => {
            try {
                const { data } = await api.get('/api/clients')
                const found = data.find(c => String(c.id) === String(clientId))
                if (found) {
                    setClient(found)
                } else {
                    setError('Client not found')
                }
            } catch (err) {
                setError('Failed to fetch client details')
            } finally {
                setLoading(false)
            }
        }

        const fetchEvents = async () => {
            if (!clientId) return
            try {
                const { data } = await api.get(`/api/tt/${clientId}/events`)
                setEvents(data.data?.data || [])
            } catch (err) {
                console.error('Failed to sync events for profile view', err)
            }
        }
        fetchClient()
        fetchEvents()
    }, [clientId])

    if (loading) {
        return (
            <div className="p-4 md:p-6 3xl:p-8 space-y-4 3xl:space-y-6 bg-white dark:bg-[#0a0a0a] min-h-full h-full overflow-y-auto w-full">
                <div className="space-y-6 max-w-3xl mx-auto">
                    <Skeleton className="w-28 h-4 mb-4" />
                    <Skeleton className="w-48 h-6" />
                    <div className="card p-6 space-y-6 mt-4 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="w-20 h-3" />
                                    <Skeleton className="w-full h-4" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (error || !client) {
        return (
            <div className="p-4 md:p-6 3xl:p-8 space-y-4 3xl:space-y-6 bg-white dark:bg-[#0a0a0a] min-h-full h-full overflow-y-auto w-full">
                <div className="space-y-6 max-w-3xl mx-auto">
                    <button onClick={() => navigate('/clients')} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 text-xs font-medium transition-colors mb-6">
                        <X size={14} /> Clear
                    </button>
                    <div className="text-center py-12 text-zinc-500 card bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800">
                        {error || 'Client not found.'}
                    </div>
                </div>
            </div>
        )
    }

    const details = [
        { label: 'Name', value: formatName(client.name), icon: Users },
        { label: 'Domain', value: client.domain_name, icon: Globe, mono: true },
        { label: 'API Key', value: client.tt_api_key, icon: Key, mono: true },
        { label: 'Stripe ID', value: client.stripe_account_id || '—', icon: DollarSign, mono: true },
        { label: 'Platform Fee', value: `${client.platform_fee}%`, icon: DollarSign },
        { label: 'Email', value: client.contact_email || '—', icon: Mail },
        { label: 'Phone', value: client.contact_phone || '—', icon: Phone },
        { label: 'Address', value: client.address || '—', icon: MapPin },
    ]

    return (
        <div className="p-4 md:p-6 lg:p-8 min-h-full h-full overflow-y-auto w-full bg-white dark:bg-[#0a0a0a]">
            <div className="max-w-3xl mx-auto space-y-5 md:space-y-6 pb-12">
                {/* Header Section */}
                <div className="flex flex-wrap sm:flex-nowrap items-end sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <button onClick={() => navigate('/clients')} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors mb-2">
                            <X size={14} /> Clear
                        </button>
                        <div className="flex items-center gap-2 mb-0.5">
                            <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight leading-none">{formatName(client.name)}</h1>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${client.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'}`}>
                                {client.is_active ? 'Active' : 'Suspended'}
                            </span>
                        </div>
                    </div>
                    <div className="shrink-0 w-full sm:w-auto">
                        <button onClick={() => navigate(`/events/${client.id}`, { state: { isolated: true } })} className="w-full sm:w-auto bg-white dark:bg-[#111] hover:bg-zinc-50 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm">
                            <CalendarDays size={16} className="text-zinc-500 dark:text-zinc-400" />
                            Manage Events
                        </button>
                    </div>
                </div>

                {/* Dashboard Flow */}
                <div className="flex flex-col gap-5 md:gap-6 pt-2">

                    {/* Top Row: Client Profile */}
                    <div className="bg-white dark:bg-[#111] rounded-xl border border-zinc-200 dark:border-zinc-800/80 shadow-sm overflow-hidden w-full">
                        <div className="border-b border-zinc-100 dark:border-zinc-800/80 px-5 py-4 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <Users size={15} className="text-zinc-400" />
                                Client Profile
                            </h2>
                            <button onClick={() => navigate(`/clients/${client.id}/edit`)} className="btn-secondary flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors">
                                <Pencil size={12} /> Edit
                            </button>
                        </div>
                        <div className="p-5 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                            <div>
                                <label className="text-xs font-semibold text-zinc-500 mb-2 block">Full Name</label>
                                <p className="text-sm text-zinc-900 dark:text-zinc-100 font-semibold">{formatName(client.name)}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-zinc-500 mb-2 block">Company Domain</label>
                                <div className="flex items-center gap-2">
                                    <Globe size={14} className="text-zinc-400 shrink-0" />
                                    <a href={`https://${client.domain_name}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate">{client.domain_name}</a>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-zinc-500 mb-2 block">Email Address</label>
                                <div className="flex items-center gap-2">
                                    <Mail size={14} className="text-zinc-400 shrink-0" />
                                    <p className="text-sm text-zinc-900 dark:text-zinc-100 truncate">{client.contact_email || '—'}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-zinc-500 mb-2 block">Phone Number</label>
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-zinc-400 shrink-0" />
                                    <p className="text-sm text-zinc-900 dark:text-zinc-100">{client.contact_phone || '—'}</p>
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-xs font-semibold text-zinc-500 mb-2 block">Address</label>
                                <div className="flex items-start gap-2">
                                    <MapPin size={14} className="text-zinc-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-zinc-900 dark:text-zinc-100">{client.address || '—'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: API + Financial side by side */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6 items-stretch">

                        {/* API Configuration */}
                        <div className="bg-white dark:bg-[#111] rounded-xl border border-zinc-200 dark:border-zinc-800/80 shadow-sm overflow-hidden flex flex-col h-full">
                            <div className="border-b border-zinc-100 dark:border-zinc-800/80 px-5 py-4 flex items-center gap-2 bg-zinc-50/50 dark:bg-zinc-900/20 shrink-0">
                                <Key size={15} className="text-zinc-400" />
                                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">API Credentials</h2>
                            </div>
                            <div className="p-5 md:p-6 flex flex-col flex-1">
                                <div>
                                    <label className="text-xs font-semibold text-zinc-500 mb-2 block">TicketTailor Secret Key</label>
                                    <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pr-2 py-2 pl-3 flex items-center justify-between gap-3 overflow-hidden">
                                        <p className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 truncate">
                                            {client.tt_api_key || 'No key generated'}
                                        </p>
                                        <button
                                            onClick={() => copyToClipboard(client.tt_api_key, 'key')}
                                            disabled={!client.tt_api_key}
                                            className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-all shadow-none shrink-0"
                                            title="Copy API Key"
                                        >
                                            {copiedKey ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Settings */}
                        <div className="bg-white dark:bg-[#111] rounded-xl border border-zinc-200 dark:border-zinc-800/80 shadow-sm overflow-hidden flex flex-col h-full">
                            <div className="border-b border-zinc-100 dark:border-zinc-800/80 px-5 py-4 flex items-center gap-2 bg-zinc-50/50 dark:bg-zinc-900/20 shrink-0">
                                <DollarSign size={15} className="text-zinc-400" />
                                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Financial Setup</h2>
                            </div>
                            <div className="p-5 md:p-6 flex flex-col flex-1">
                                <div>
                                    <label className="text-xs font-semibold text-zinc-500 mb-1 block">Platform Rate</label>
                                    <div className="flex items-end gap-1">
                                        <span className="text-2xl font-bold text-zinc-900 dark:text-white leading-none tracking-tight">{client.platform_fee}</span>
                                        <span className="text-base font-bold text-zinc-500">%</span>
                                    </div>
                                </div>

                                <div className="pt-5 mt-5 border-t border-zinc-100 dark:border-zinc-800/50 mt-auto">
                                    <label className="text-xs font-semibold text-zinc-500 mb-2 block">Stripe Connect ID</label>
                                    <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pr-2 py-2 pl-3 flex items-center justify-between gap-3 overflow-hidden">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className={`w-2 h-2 rounded-full ${client.stripe_account_id ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'} shrink-0`}></div>
                                            <p className={`font-mono text-[11px] truncate ${client.stripe_account_id ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 italic'}`}>
                                                {client.stripe_account_id || 'Not Linked'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(client.stripe_account_id, 'stripe')}
                                            disabled={!client.stripe_account_id}
                                            className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors shrink-0 disabled:opacity-50"
                                            title="Copy Stripe ID"
                                        >
                                            {copiedStripe ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Events Section */}
                    {!loading && events.length > 0 && (
                        <div className="bg-white dark:bg-[#111] rounded-xl border border-zinc-200 dark:border-zinc-800/80 shadow-sm overflow-hidden flex flex-col mt-5 md:mt-6">
                            <div className="border-b border-zinc-100 dark:border-zinc-800/80 px-5 py-4 flex items-center justify-between gap-2 bg-zinc-50/50 dark:bg-zinc-900/20">
                                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                    <CalendarDays size={15} className="text-zinc-400" /> Recent Events
                                </h2>
                                <button onClick={() => navigate(`/events/${clientId}`, { state: { isolated: true } })} className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                                    View All
                                </button>
                            </div>
                            <div className="flex flex-col">
                                {events.slice(0, 5).map((event, index) => (
                                    <div
                                        key={event.id}
                                        onClick={() => navigate(`/events/${clientId}/${event.id}`)}
                                        className={`p-4 md:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors ${index !== events.slice(0, 5).length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800/50' : ''}`}
                                    >
                                        <div className="flex flex-col gap-1.5 min-w-0">
                                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{formatName(event.name)}</h3>
                                            <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium">
                                                {event.start && (
                                                    <span className="flex items-center gap-1.5">
                                                        <CalendarDays size={12} className="text-zinc-400" />
                                                        {new Date(event.start.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                )}
                                                <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${event.status === 'published' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                                    {event.status}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-zinc-400 shrink-0" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
