import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'
import {
    ChevronLeft, Users, Globe, Key, DollarSign,
    Mail, Phone, MapPin, CalendarDays, Pencil
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
        fetchClient()
    }, [clientId])

    if (loading) {
        return (
            <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
                <Skeleton className="w-28 h-4 mb-4" />
                <Skeleton className="w-48 h-6" />
                <div className="card p-6 space-y-6 mt-4">
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
        )
    }

    if (error || !client) {
        return (
            <div className="p-4 md:p-6 max-w-3xl mx-auto">
                <button onClick={() => navigate('/clients')} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 text-xs font-medium transition-colors mb-6">
                    <ChevronLeft size={14} /> Back
                </button>
                <div className="text-center py-12 text-zinc-500 card">
                    {error || 'Client not found.'}
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
        <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                    <button onClick={() => navigate('/clients')} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 text-xs font-medium transition-colors">
                        <ChevronLeft size={14} /> Back
                    </button>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{formatName(client.name)}</h1>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                            client.is_active
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                        }`}>
                            {client.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/events/${client.id}`)} className="btn-secondary flex items-center gap-1.5">
                        <CalendarDays size={14} /> Events
                    </button>
                    <button onClick={() => navigate(`/clients/${client.id}/edit`)} className="btn-primary flex items-center gap-1.5">
                        <Pencil size={14} /> Edit
                    </button>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="p-4 md:p-5">
                    <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-4">Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {details.map(({ label, value, icon: Icon, mono }, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">
                                    <Icon size={14} />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
                                    <p className={`text-sm text-zinc-900 dark:text-zinc-100 break-words ${mono ? 'font-mono text-xs' : ''}`}>
                                        {value}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
