import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'
import {
    ChevronLeft, Users, Globe, Key, DollarSign,
    Mail, Phone, MapPin, CalendarDays, Pencil
} from 'lucide-react'
import Skeleton from '../components/Skeleton'

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
            <div className="p-8 space-y-8 max-w-4xl mx-auto animate-fade-in">
                <Skeleton className="w-32 h-4 mb-6" />
                <Skeleton className="w-64 h-8" />
                <div className="card p-8 space-y-8 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="space-y-3">
                                <Skeleton className="w-24 h-3" />
                                <Skeleton className="w-full h-5" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (error || !client) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <div className="flex items-center gap-1.5 mb-8">
                    <button onClick={() => navigate('/clients')} className="text-gray-500 dark:text-white/30 hover:text-gray-900 dark:hover:text-white/70 flex items-center gap-1.5 text-xs font-medium transition-colors">
                        <ChevronLeft size={14} /> Back to Clients
                    </button>
                </div>
                <div className="text-center py-16 text-gray-500 dark:text-white/40 card">
                    {error || 'Client not found.'}
                </div>
            </div>
        )
    }

    const details = [
        { label: 'Client Name', value: client.name, icon: Users },
        { label: 'Domain Name', value: client.domain_name, icon: Globe, mono: true },
        { label: 'TicketTailor API Key', value: client.tt_api_key, icon: Key, mono: true },
        { label: 'Stripe Account ID', value: client.stripe_account_id || '—', icon: DollarSign, mono: true },
        { label: 'Platform Fee %', value: `${client.platform_fee}%`, icon: DollarSign },
        { label: 'Contact Email', value: client.contact_email || '—', icon: Mail },
        { label: 'Contact Phone', value: client.contact_phone || '—', icon: Phone },
        { label: 'Address', value: client.address || '—', icon: MapPin },
        { label: 'Created At', value: client.created_at ? new Date(client.created_at).toLocaleString() : '—', icon: CalendarDays },
    ]

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-2">
                <div className="space-y-3">
                    <button onClick={() => navigate('/clients')} className="text-gray-500 dark:text-white/30 hover:text-gray-900 dark:hover:text-white/70 flex items-center gap-1.5 text-xs font-medium transition-colors">
                        <ChevronLeft size={14} /> Back to Clients
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <p className="text-gray-600 dark:text-white/60 text-xs font-semibold uppercase tracking-widest">Client Profile</p>
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${client.is_active ? 'badge-green' : 'badge-red'}`}>
                                {client.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white tracking-tight">{client.name}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(`/events/${client.id}`)} className="btn-secondary flex items-center gap-2 text-sm">
                        <CalendarDays size={16} /> View Events
                    </button>
                    <button onClick={() => navigate(`/clients/${client.id}/edit`)} className="btn-primary flex items-center gap-2 text-sm">
                        <Pencil size={16} /> Edit Client
                    </button>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="p-6 md:p-8">
                    <h2 className="text-lg font-semibold text-black dark:text-white mb-6">Client Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 mt-4">
                        {details.map(({ label, value, icon: Icon, mono }, i) => (
                            <div key={i} className="flex items-start gap-4">
                                <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40 shrink-0">
                                    <Icon size={18} />
                                </div>
                                <div className="space-y-1 overflow-hidden">
                                    <p className="text-xs font-medium text-gray-500 dark:text-white/50 uppercase tracking-wide">{label}</p>
                                    <p className={`text-sm text-black dark:text-white/90 break-words ${mono ? 'font-mono tracking-tight text-[13px] bg-gray-50 dark:bg-white/5 px-2 py-1 rounded inline-block mt-0.5' : ''}`}>
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
