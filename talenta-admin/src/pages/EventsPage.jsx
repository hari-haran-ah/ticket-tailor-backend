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

function EventCard({ event, clientId, onManage }) {
    const navigate = useNavigate()
    const status = event.status || 'unknown'
    const totalCapacity = (event.ticket_types || []).reduce((s, t) => s + (t.quantity || 0), 0)

    const statusClass = {
        published: 'badge-published',
        draft: 'badge-draft',
        closed: 'badge-closed',
    }[status] || 'badge-draft'

    return (
        <div
            onClick={() => navigate(`/events/${clientId}/${event.id}`)}
            className="card p-5 cursor-pointer hover:border-gray-400 dark:hover:border-white/30 transition-all duration-200 space-y-4 group"
        >
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-black dark:text-white leading-tight group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors line-clamp-2">
                    {event.name}
                </h3>
                <span className={statusClass}>{status}</span>
            </div>

            <div className="space-y-2 text-xs text-gray-500 dark:text-white/50">
                {event.start && (
                    <div className="flex items-center gap-2">
                        <Clock size={13} />
                        <span>{new Date(event.start.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <Ticket size={13} />
                    <span>{event.total_issued_tickets || 0} / {totalCapacity || '∞'} issued</span>
                </div>
                {event.venue && (
                    <div className="flex items-center gap-2">
                        <MapPin size={13} />
                        <span className="line-clamp-1">{event.venue.name}</span>
                    </div>
                )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-gray-300 dark:border-white/10">
                <button
                    onClick={(e) => { e.stopPropagation(); onManage(event) }}
                    className="btn-secondary flex-1 py-2 text-xs"
                >
                    Add Tickets
                </button>
                <div className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1.5">
                    <Settings size={13} /> Manage
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
        <div className="flex flex-col md:flex-row h-full overflow-hidden bg-white dark:bg-[#212121]">
            
            {/* ── Desktop Left Sidebar: Clients List ── */}
            <div className="hidden md:flex flex-col flex-shrink-0 w-72 lg:w-80 border-r border-gray-300 dark:border-white/10 bg-gray-50/50 dark:bg-[#1a1a1a]/50 h-full">
                <div className="p-5 border-b border-gray-300 dark:border-white/10">
                    <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest">Select Client</h2>
                    <div className="relative mt-4">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
                        <input 
                            type="text" 
                            placeholder="Search clients..." 
                            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-[#212121] border border-gray-300 dark:border-white/10 rounded-lg text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-white/30 transition-shadow"
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    {loadingClients ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="p-3 rounded-xl border border-transparent">
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
                                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all duration-200 border ${
                                        isSelected 
                                            ? 'bg-gray-100 dark:bg-white/10 border-gray-200 dark:border-white/10 shadow-sm' 
                                            : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-white/5 hover:border-gray-200 dark:hover:border-white/10'
                                    }`}
                                >
                                    <div className="flex flex-col overflow-hidden pr-3">
                                        <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                            {c.name}
                                        </span>
                                        <span className="text-[10px] font-mono text-gray-500 dark:text-white/40 truncate mt-0.5">
                                            {c.domain_name.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                        </span>
                                    </div>
                                    <div className={`px-2 py-1 rounded-md text-[10px] font-bold flex-shrink-0 ${
                                        isSelected 
                                            ? 'bg-gray-200 dark:bg-white/20 text-gray-700 dark:text-white' 
                                            : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/40'
                                    }`}>
                                        {c.events !== undefined ? c.events : '-'} Evts
                                    </div>
                                </button>
                            )
                        })
                    ) : (
                        <div className="p-4 text-center text-sm text-gray-500 dark:text-white/40 italic">
                            {clientSearch ? 'No clients match your search.' : 'No active clients found.'}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Right Main Area: Events ── */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Mobile Client selector */}
                <div className="md:hidden p-4 border-b border-gray-300 dark:border-white/10 bg-gray-50/50 dark:bg-[#1a1a1a]/50">
                    <p className="text-gray-500 dark:text-white/50 text-xs uppercase tracking-widest font-semibold mb-2">Select Client</p>
                    <ClientPillBar
                        clients={clients}
                        selectedId={selectedClient}
                        onSelect={(id) => { setSelectedClient(id); loadEvents(id) }}
                        loading={loadingClients}
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 border-b border-gray-300 dark:border-white/10 pb-6">
                        <div>
                            <p className="text-gray-600 dark:text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Client Assets</p>
                            <h1 className="text-2xl font-bold text-black dark:text-white tracking-tight">Event Management</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    setLoadingClients(true);
                                    api.get('/api/clients').then(({ data }) => {
                                        setClients(data.filter(c => c.is_active));
                                        setLoadingClients(false);
                                        if (selectedClient) loadEvents(selectedClient);
                                    });
                                }}
                                className="btn-secondary group flex items-center gap-2"
                            >
                                <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                            {selectedClient && (
                                <button onClick={() => navigate(`/events/${selectedClient}/new`)} className="btn-primary flex items-center gap-2">
                                    <Plus size={16} /> Create Event
                                </button>
                            )}
                        </div>
                    </div>

                    {!selectedClient && !loadingClients && (
                        <div className="card py-24 text-center border-dashed border-gray-300 dark:border-white/20 bg-transparent flex flex-col items-center justify-center">
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 border border-gray-200 dark:border-white/10">
                                <CalendarDays size={28} className="text-gray-400 dark:text-white/30" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Select a Client</h3>
                            <p className="text-gray-500 dark:text-white/50 max-w-sm mx-auto text-sm">
                                Choose a client from the sidebar to view and manage their events, ticket types, and groups.
                            </p>
                        </div>
                    )}

                    {selectedClient && loadingEvents && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5 animate-in fade-in duration-300">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="card p-5 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <Skeleton className="w-40 h-5" />
                                        <Skeleton className="w-16 h-5 rounded-full" />
                                    </div>
                                    <div className="space-y-3">
                                        <Skeleton className="w-32 h-3" />
                                        <Skeleton className="w-24 h-3" />
                                        <Skeleton className="w-48 h-3" />
                                    </div>
                                    <div className="flex gap-2 pt-3 border-t border-gray-300 dark:border-white/10">
                                        <Skeleton className="h-8 flex-1 rounded-xl" />
                                        <Skeleton className="h-8 flex-1 rounded-xl" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 text-black dark:text-white text-sm rounded-xl flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {!loadingEvents && events.length > 0 && selectedClient && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5 animate-in fade-in duration-300">
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
                        <div className="card py-20 text-center border-dashed border-gray-300 dark:border-white/20 bg-transparent animate-in fade-in duration-300">
                            <CalendarDays size={48} className="mx-auto mb-4 text-gray-300 dark:text-white/20" />
                            <p className="text-gray-900 dark:text-white font-semibold text-lg">No events found</p>
                            <p className="text-gray-500 dark:text-white/40 text-sm mt-1">Create your first event for this client to get started.</p>
                            <button 
                                onClick={() => navigate(`/events/${selectedClient}/new`)} 
                                className="mt-6 btn-primary inline-flex items-center gap-2 shadow-lg shadow-black/10 dark:shadow-white/10"
                            >
                                <Plus size={16} /> Create Event
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
