import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'
import {
    CalendarDays, AlertCircle, Clock, Plus, Settings, X,
    Ticket, MapPin, RefreshCw, Search, ChevronLeft, ChevronRight
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
            className="card p-4 3xl:p-5 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition-all group"
        >
            <div className="flex items-start justify-between gap-2 mb-3 3xl:mb-4">
                <h3 className="text-sm 3xl:text-base font-medium text-zinc-800 dark:text-zinc-100 leading-snug group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors line-clamp-2">
                    {formatName(event.name)}
                </h3>
                <span className={`px-2 3xl:px-2.5 py-0.5 3xl:py-1 rounded text-[10px] 3xl:text-xs font-medium border flex-shrink-0 ${statusClass}`}>
                    {status}
                </span>
            </div>

            <div className="space-y-1.5 3xl:space-y-2 text-xs 3xl:text-sm text-zinc-600 dark:text-zinc-500 mb-4 3xl:mb-5">
                {event.start && (
                    <div className="flex items-center gap-2">
                        <Clock size={12} className="3xl:w-[14px] 3xl:h-[14px]" />
                        <span>{new Date(event.start.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <Ticket size={12} className="3xl:w-[14px] 3xl:h-[14px]" />
                    <span>{event.total_issued_tickets || 0} / {totalCapacity || '∞'} issued</span>
                </div>
                {event.venue && (
                    <div className="flex items-center gap-2">
                        <MapPin size={12} className="3xl:w-[14px] 3xl:h-[14px]" />
                        <span className="line-clamp-1">{event.venue.name}</span>
                    </div>
                )}
            </div>

            <div className="flex gap-2 3xl:gap-3 pt-3 3xl:pt-4 border-t border-[#e5e7eb] dark:border-zinc-800">
                <button
                    onClick={(e) => { e.stopPropagation(); onManage(event) }}
                    className="btn-secondary btn-sm 3xl:text-sm flex-1"
                >
                    Add Tickets
                </button>
                <div className="btn-primary btn-sm 3xl:text-sm flex-1 flex items-center justify-center gap-1">
                    <Settings size={12} className="3xl:w-[14px] 3xl:h-[14px]" /> Manage
                </div>
            </div>
        </div>
    )
}



export default function EventsPage() {
    const navigate = useNavigate()
    const { clientId: urlClientId } = useParams()
    const [clients, setClients] = useState([])
    const [clientsPage, setClientsPage] = useState(1)
    const [clientsTotalPages, setClientsTotalPages] = useState(1)
    const [clientSearch, setClientSearch] = useState('')
    const [debouncedClientSearch, setDebouncedClientSearch] = useState('')

    const [selectedClient, setSelectedClient] = useState('')
    const [events, setEvents] = useState([])
    const [loadingClients, setLoadingClients] = useState(true)
    const [loadingEvents, setLoadingEvents] = useState(false)
    const [error, setError] = useState('')
    const [isManageOpen, setIsManageOpen] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState(null)

    // Debounce client search
    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedClientSearch(clientSearch); setClientsPage(1) }, 400)
        return () => clearTimeout(timer)
    }, [clientSearch])

    const loadClients = async () => {
        setLoadingClients(true)
        try {
            const { data } = await api.get(`/api/clients/paginated?page=${clientsPage}&size=6&search=${debouncedClientSearch}&sort_by=created_at&sort_order=desc`)
            setClients(data.items || [])
            setClientsTotalPages(data.pages || 1)
        } catch (err) {
            console.error('Failed to load clients', err)
        } finally {
            setLoadingClients(false)
        }
    }

    useEffect(() => {
        loadClients()
    }, [clientsPage, debouncedClientSearch])

    useEffect(() => {
        if (urlClientId && urlClientId !== selectedClient) {
            setSelectedClient(urlClientId)
            loadEvents(urlClientId)
        }
    }, [urlClientId])

    const currentFetchRef = useRef(0)

    const loadEvents = async (clientId) => {
        if (!clientId) return

        const fetchId = Date.now()
        currentFetchRef.current = fetchId

        setLoadingEvents(true); setError(''); setEvents([])
        try {
            const { data } = await api.get(`/api/tt/${clientId}/events`)
            if (currentFetchRef.current === fetchId) {
                setEvents(data.data?.data || [])
            }
        } catch (e) {
            if (currentFetchRef.current === fetchId) {
                const detail = e.response?.data?.detail;
                if (typeof detail === 'string' && (detail.includes('FORBIDDEN') || detail.includes('status":403'))) {
                    setError('TicketTailor API key is missing or invalid.');
                } else {
                    setError(detail || 'Failed to sync with TicketTailor');
                }
            }
        } finally {
            if (currentFetchRef.current === fetchId) {
                setLoadingEvents(false)
            }
        }
    }

    // Filter events for main area
    const [eventSearch, setEventSearch] = useState('')
    const filteredEvents = events.filter(e =>
        e.name.toLowerCase().includes(eventSearch.toLowerCase())
    )

    return (
        <div className="flex flex-col md:flex-row h-full overflow-hidden bg-[#e8e8ea] dark:bg-[#0a0a0a]">

            {/* ── Desktop Left Sidebar: Clients List - Theme Aware ── */}
            <div className="hidden md:flex flex-col flex-shrink-0 w-64 lg:w-72 3xl:w-80 4xl:w-96 border-r border-zinc-200 dark:border-zinc-700 bg-[#f0f0f2] dark:bg-[#18181b] h-full">
                <div className="p-4 3xl:p-5 border-b border-zinc-200 dark:border-zinc-700">
                    <h2 className="text-xs 3xl:text-sm font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Select Client</h2>
                    <div className="relative mt-3 3xl:mt-4">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="input-field pl-9 3xl:text-base 3xl:py-2.5"
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 3xl:p-3 space-y-0.5 3xl:space-y-1">
                    {loadingClients ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="p-3 3xl:p-4 rounded-lg">
                                <Skeleton className="w-3/4 h-4 3xl:h-5 mb-2" />
                                <Skeleton className="w-1/2 h-3 3xl:h-4" />
                            </div>
                        ))
                    ) : clients.length > 0 ? (
                        clients.map(c => {
                            const isSelected = selectedClient === c.id.toString()
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => {
                                        if (isSelected) navigate('/events')
                                        else navigate(`/events/${c.id}`)
                                    }}
                                    className={`w-full text-left p-3 3xl:p-4 rounded-lg flex items-center justify-between transition-all ${isSelected
                                            ? 'bg-zinc-200 dark:bg-zinc-800'
                                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                                        }`}
                                >
                                    <div className="flex flex-col overflow-hidden pr-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm 3xl:text-base truncate ${isSelected ? 'font-medium text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                                {formatName(c.name)}
                                            </span>
                                            {!c.is_active && (
                                                <span className="shrink-0 text-[9px] 3xl:text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] 3xl:text-xs font-mono text-zinc-500 truncate mt-0.5">
                                            {c.domain_name.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                        </span>
                                    </div>
                                </button>
                            )
                        })
                    ) : (
                        <div className="p-4 text-center text-xs 3xl:text-sm text-zinc-500">
                            {clientSearch ? 'No clients match your search.' : 'No active clients.'}
                        </div>
                    )}

                </div>

                {/* ── Sidebar Pagination ── */}
                {clientsTotalPages > 1 && (
                    <div className="p-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                        <button
                            disabled={clientsPage === 1}
                            onClick={() => {
                                setClientsPage(p => Math.max(1, p - 1))
                                if (selectedClient) navigate('/events')
                            }}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            {clientsPage} / {clientsTotalPages}
                        </span>
                        <button
                            disabled={clientsPage === clientsTotalPages}
                            onClick={() => {
                                setClientsPage(p => Math.min(clientsTotalPages, p + 1))
                                if (selectedClient) navigate('/events')
                            }}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── Right Main Area: Events ── */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Mobile Client selector - Theme Aware */}
                <div className="md:hidden p-4 border-b border-zinc-200 dark:border-zinc-700 bg-[#f0f0f2] dark:bg-[#18181b]">
                    <p className="text-zinc-600 dark:text-zinc-400 text-xs uppercase tracking-wider font-medium mb-2">Select Client</p>
                    <ClientPillBar
                        clients={clients}
                        selectedId={selectedClient}
                        onSelect={(id) => {
                            if (id === selectedClient) navigate('/events')
                            else navigate(`/events/${id}`)
                        }}
                        loading={loadingClients}
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 3xl:p-8 space-y-6 3xl:space-y-8">
                    {/* Page Title + Actions Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl 3xl:text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Events</h1>
                            <p className="text-zinc-500 dark:text-zinc-400 text-sm 3xl:text-base mt-0.5">Manage events for selected client</p>
                        </div>
                        <div className="flex items-center gap-2 3xl:gap-3">
                            {selectedClient && (
                                <>
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                                        <input
                                            type="text"
                                            placeholder="Search events..."
                                            className="input-field h-9 3xl:h-10 pl-9 pr-8 w-48 sm:w-64 3xl:w-80 3xl:text-base"
                                            value={eventSearch}
                                            onChange={e => setEventSearch(e.target.value)}
                                        />
                                        {eventSearch && (
                                            <button
                                                onClick={() => setEventSearch('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                                                title="Clear search"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <button onClick={() => navigate(`/events/${selectedClient}/new`)} className="btn-primary h-9 3xl:h-10 flex items-center justify-center gap-1.5 px-3 3xl:px-4 3xl:text-base">
                                        <Plus size={16} /> <span className="hidden sm:inline">New Event</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {!selectedClient && !loadingClients && (
                        <div className="py-20 text-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-[#18181b]/50 rounded-2xl flex flex-col items-center justify-center w-full max-w-2xl mx-auto mt-8">
                            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mb-4">
                                <CalendarDays size={26} className="text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-100 mb-1">Select a Client</h3>
                            <p className="text-zinc-600 dark:text-zinc-500 text-sm max-w-xs">
                                Choose a client to view and manage their events.
                            </p>
                        </div>
                    )}

                    {selectedClient && loadingEvents && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 4xl:grid-cols-5 gap-4 3xl:gap-5">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="card p-4 3xl:p-5 space-y-4 3xl:space-y-5">
                                    <div className="flex items-start justify-between gap-2">
                                        <Skeleton className="w-36 h-4 3xl:h-5" />
                                        <Skeleton className="w-14 h-4 3xl:h-5 rounded" />
                                    </div>
                                    <div className="space-y-2 3xl:space-y-3">
                                        <Skeleton className="w-28 h-3 3xl:h-4" />
                                        <Skeleton className="w-20 h-3 3xl:h-4" />
                                    </div>
                                    <div className="flex gap-2 3xl:gap-3 pt-3 3xl:pt-4 border-t border-[#e5e7eb] dark:border-zinc-800">
                                        <Skeleton className="h-7 3xl:h-8 flex-1 rounded" />
                                        <Skeleton className="h-7 3xl:h-8 flex-1 rounded" />
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 4xl:grid-cols-5 gap-4 3xl:gap-5">
                            {filteredEvents.map(ev => (
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

                    {!loadingEvents && selectedClient && events.length > 0 && filteredEvents.length === 0 && !error && (
                        <div className="py-12 text-center text-sm text-zinc-500">
                            No events match your search.
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
