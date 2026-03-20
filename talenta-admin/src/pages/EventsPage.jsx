import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'
import {
    CalendarDays, AlertCircle, Clock, Plus, Settings, X,
    Ticket, MapPin, RefreshCw, Search
} from 'lucide-react'
import Skeleton from '../components/Skeleton'
import ClientPillBar from '../components/ClientPillBar'
import ManageTicketsModal from '../components/ManageTicketsModal'

// Helper function to format name with proper capitalization
const formatName = (name) => {
    if (!name) return ''
    return name.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
}

function EventCard({ event, clientId, onManage }) {
    const navigate = useNavigate()
    const status = event.status || 'unknown'
    const totalCapacity = (event.ticket_types || []).reduce((s, t) => s + (t.quantity || 0), 0)

    const statusClass = {
        published: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/20',
        draft: 'bg-[#e5e7eb] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-500 border-[#d1d5db] dark:border-zinc-700',
        closed: 'bg-[#e5e7eb] dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-[#d1d5db] dark:border-zinc-700',
    }[status] || 'bg-[#e5e7eb] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-500 border-[#d1d5db] dark:border-zinc-700'

    return (
        <div
            onClick={() => navigate(`/events/${clientId}/${event.id}`)}
            className="card p-4 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition-all group"
        >
            <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-100 leading-snug group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors line-clamp-2">
                    {formatName(event.name)}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium border flex-shrink-0 ${statusClass}`}>
                    {status}
                </span>
            </div>

            <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-500 mb-4">
                {event.start && (
                    <div className="flex items-center gap-2">
                        <Clock size={12} />
                        <span>{new Date(event.start.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <Ticket size={12} />
                    <span>{event.total_issued_tickets || 0} / {totalCapacity || '∞'} issued</span>
                </div>
                {event.venue && (
                    <div className="flex items-center gap-2">
                        <MapPin size={12} />
                        <span className="line-clamp-1">{event.venue.name}</span>
                    </div>
                )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-[#e5e7eb] dark:border-zinc-800">
                <button
                    onClick={(e) => { e.stopPropagation(); onManage(event) }}
                    className="btn-secondary btn-sm flex-1"
                >
                    Add Tickets
                </button>
                <div className="btn-primary btn-sm flex-1 flex items-center justify-center gap-1">
                    <Settings size={12} /> Manage
                </div>
            </div>
        </div>
    )
}



export default function EventsPage() {
    const navigate = useNavigate()
    const { clientId: urlClientId } = useParams()
    const [clients, setClients] = useState([])
    const [selectedClient, setSelectedClient] = useState('')
    const [events, setEvents] = useState([])
    const [loadingClients, setLoadingClients] = useState(true)
    const [loadingEvents, setLoadingEvents] = useState(false)
    const [error, setError] = useState('')
    const [isManageOpen, setIsManageOpen] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState(null)

    useEffect(() => {
        api.get('/api/clients').then(({ data }) => {
            const active = data.filter(c => c.is_active)
            setClients(active)
            setLoadingClients(false)

            if (urlClientId) {
                setSelectedClient(urlClientId)
                loadEvents(urlClientId)
            }
        })
    }, [urlClientId])

    const loadEvents = async (clientId) => {
        if (!clientId) return
        setLoadingEvents(true); setError(''); setEvents([])
        try {
            const { data } = await api.get(`/api/tt/${clientId}/events`)
            setEvents(data.data?.data || [])
        } catch (e) {
            setError(e.response?.data?.detail || 'Failed to sync with TicketTailor')
        } finally {
            setLoadingEvents(false)
        }
    }

    // Filter clients for sidebar
    const [clientSearch, setClientSearch] = useState('')
    const filteredClients = clients.filter(c => 
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
        c.domain_name.toLowerCase().includes(clientSearch.toLowerCase())
    )

    return (
        <div className="flex flex-col md:flex-row h-full overflow-hidden bg-[#f0f1f3] dark:bg-[#0a0a0a]">

            {/* ── Desktop Left Sidebar: Clients List - Theme Aware ── */}
            <div className="hidden md:flex flex-col flex-shrink-0 w-64 lg:w-72 border-r border-zinc-200 dark:border-zinc-700 bg-[#fafafa] dark:bg-[#18181b] h-full">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
                    <h2 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Select Client</h2>
                    <div className="relative mt-3">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="input-field pl-9"
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    {loadingClients ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="p-3 rounded-lg">
                                <Skeleton className="w-3/4 h-4 mb-2" />
                                <Skeleton className="w-1/2 h-3" />
                            </div>
                        ))
                    ) : filteredClients.length > 0 ? (
                        filteredClients.map(c => {
                            const isSelected = selectedClient === c.id.toString()
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => { setSelectedClient(c.id.toString()); loadEvents(c.id.toString()); }}
                                    className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-all ${
                                        isSelected
                                            ? 'bg-zinc-200 dark:bg-zinc-800'
                                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                                    }`}
                                >
                                    <div className="flex flex-col overflow-hidden pr-2">
                                        <span className={`text-sm truncate ${isSelected ? 'font-medium text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                            {formatName(c.name)}
                                        </span>
                                        <span className="text-[10px] font-mono text-zinc-500 truncate mt-0.5">
                                            {c.domain_name.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                        </span>
                                    </div>
                                </button>
                            )
                        })
                    ) : (
                        <div className="p-4 text-center text-xs text-zinc-500">
                            {clientSearch ? 'No clients match your search.' : 'No active clients.'}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Right Main Area: Events ── */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Mobile Client selector - Theme Aware */}
                <div className="md:hidden p-4 border-b border-zinc-200 dark:border-zinc-700 bg-[#fafafa] dark:bg-[#18181b]">
                    <p className="text-zinc-600 dark:text-zinc-400 text-xs uppercase tracking-wider font-medium mb-2">Select Client</p>
                    <ClientPillBar
                        clients={clients}
                        selectedId={selectedClient}
                        onSelect={(id) => { setSelectedClient(id); loadEvents(id) }}
                        loading={loadingClients}
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    {/* Page Title + Actions Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Events</h1>
                            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">Manage events for selected client</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedClient && (
                                <button onClick={() => navigate(`/events/${selectedClient}/new`)} className="btn-primary flex items-center gap-1.5">
                                    <Plus size={14} /> New Event
                                </button>
                            )}
                        </div>
                    </div>

                    {!selectedClient && !loadingClients && (
                        <div className="card py-16 text-center border-dashed bg-transparent flex flex-col items-center justify-center">
                            <div className="w-12 h-12 rounded-xl bg-[#e5e7eb] dark:bg-zinc-800 flex items-center justify-center mb-3">
                                <CalendarDays size={24} className="text-zinc-500 dark:text-zinc-400" />
                            </div>
                            <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-100 mb-1">Select a Client</h3>
                            <p className="text-zinc-600 dark:text-zinc-500 text-sm max-w-xs">
                                Choose a client to view and manage their events.
                            </p>
                        </div>
                    )}

                    {selectedClient && loadingEvents && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="card p-4 space-y-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <Skeleton className="w-36 h-4" />
                                        <Skeleton className="w-14 h-4 rounded" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="w-28 h-3" />
                                        <Skeleton className="w-20 h-3" />
                                    </div>
                                    <div className="flex gap-2 pt-3 border-t border-[#e5e7eb] dark:border-zinc-800">
                                        <Skeleton className="h-7 flex-1 rounded" />
                                        <Skeleton className="h-7 flex-1 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="card p-3 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {!loadingEvents && events.length > 0 && selectedClient && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {events.map(ev => (
                                <EventCard
                                    key={ev.id}
                                    event={ev}
                                    clientId={selectedClient}
                                    onManage={(e) => { setSelectedEvent(e); setIsManageOpen(true) }}
                                />
                            ))}
                        </div>
                    )}

                    {!loadingEvents && selectedClient && events.length === 0 && !error && (
                        <div className="card py-16 text-center border-dashed bg-transparent">
                            <CalendarDays size={36} className="mx-auto mb-3 text-zinc-400 dark:text-zinc-600" />
                            <p className="text-zinc-800 dark:text-zinc-100 font-medium">No events found</p>
                            <p className="text-zinc-600 dark:text-zinc-500 text-sm mt-1">Create your first event to get started.</p>
                            <button
                                onClick={() => navigate(`/events/${selectedClient}/new`)}
                                className="mt-4 btn-primary inline-flex items-center gap-1.5"
                            >
                                <Plus size={14} /> Create Event
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <ManageTicketsModal
                isOpen={isManageOpen}
                onClose={() => setIsManageOpen(false)}
                client_id={selectedClient}
                event={selectedEvent}
                groups={selectedEvent?.ticket_groups || []}
                onCreated={() => loadEvents(selectedClient)}
            />
        </div>
    )
}
