import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { clientApi } from '../../api/client'
import { eventApi } from '../../api/event'
import {
    CalendarDays, AlertCircle, Clock, Plus, Settings, X,
    Ticket, MapPin, RefreshCw, Search, ChevronLeft, ChevronRight
} from 'lucide-react'
import Skeleton from '../../components/ui/Skeleton'
import ClientPillBar from '../../components/clients/ClientPillBar'
import ManageTicketsModal from '../../components/events/ManageTicketsModal'

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
        published: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
        draft: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
        closed: 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700',
    }[status] || 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700'

    return (
        <div
            onClick={() => navigate(`/events/${clientId}/${event.id}/view`)}
            className="card p-4 3xl:p-5 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-md transition-all group"
        >
            <div className="flex items-start justify-between gap-2 mb-3 3xl:mb-4">
                <h3 className="text-sm 3xl:text-base font-semibold text-zinc-800 dark:text-zinc-100 leading-snug group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors line-clamp-2">
                    {formatName(event.name)}
                </h3>
                <span className={`px-2 3xl:px-2.5 py-0.5 3xl:py-1 rounded text-[10px] 3xl:text-xs font-semibold border flex-shrink-0 capitalize ${statusClass}`}>
                    {status}
                </span>
            </div>

            <div className="space-y-1.5 3xl:space-y-2 text-xs 3xl:text-sm text-zinc-500 dark:text-zinc-400 mb-4 3xl:mb-5">
                {event.start && (
                    <div className="flex items-center gap-2">
                        <Clock size={12} className="text-zinc-400 3xl:w-[14px] 3xl:h-[14px] shrink-0" />
                        <span>{new Date(event.start.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <Ticket size={12} className="text-zinc-400 3xl:w-[14px] 3xl:h-[14px] shrink-0" />
                    <span>{event.total_issued_tickets || 0} / {totalCapacity || '∞'} issued</span>
                </div>
                {event.venue && (
                    <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-zinc-400 3xl:w-[14px] 3xl:h-[14px] shrink-0" />
                        <span className="line-clamp-1">{event.venue.name}</span>
                    </div>
                )}
            </div>

            <div className="flex gap-2 3xl:gap-3 pt-3 3xl:pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                    onClick={(e) => { e.stopPropagation(); onManage(event) }}
                    className="btn-secondary px-2 lg:px-3 h-9 3xl:h-10 text-xs lg:text-sm font-medium 3xl:font-semibold flex-1 flex items-center justify-center gap-1.5"
                >
                    <Plus size={14} className="shrink-0 3xl:w-[16px] 3xl:h-[16px]" /> <span className="truncate">Tickets</span>
                </button>
                <div className="btn-primary px-2 lg:px-3 h-9 3xl:h-10 text-xs lg:text-sm font-semibold flex-1 flex items-center justify-center gap-1.5">
                    <Settings size={14} className="shrink-0 3xl:w-[16px] 3xl:h-[16px]" /> <span className="truncate">Manage</span>
                </div>
            </div>
        </div>
    )
}



export default function EventsPage() {
    const navigate = useNavigate()
    const { clientId: urlClientId } = useParams()
    const location = useLocation()
    const isIsolated = location.state?.isolated || false

    const [clients, setClients] = useState([])
    const [clientsPage, setClientsPage] = useState(1)
    const [clientsTotalPages, setClientsTotalPages] = useState(1)
    const [clientsTotalItems, setClientsTotalItems] = useState(0)
    const [clientSearch, setClientSearch] = useState('')
    const [debouncedClientSearch, setDebouncedClientSearch] = useState('')
    const currentClientsFetchRef = useRef(0)

    const [selectedClient, setSelectedClient] = useState('')
    const [clientDetail, setClientDetail] = useState(null)
    const [events, setEvents] = useState([])
    const [loadingClients, setLoadingClients] = useState(true)
    const [loadingEvents, setLoadingEvents] = useState(false)
    const [error, setError] = useState('')
    const [isManageOpen, setIsManageOpen] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState(null)

    // Debounce client search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedClientSearch(prev => {
                if (prev !== clientSearch) {
                    setClientsPage(1)
                    return clientSearch
                }
                return prev
            })
        }, 400)
        return () => clearTimeout(timer)
    }, [clientSearch])

    const loadClients = async () => {
        const fetchId = Date.now()
        currentClientsFetchRef.current = fetchId
        setLoadingClients(true)
        try {
            const { data } = await clientApi.getPaginatedQuery(`page=${clientsPage}&size=6&search=${debouncedClientSearch}&sort_by=created_at&sort_order=desc`)
            if (currentClientsFetchRef.current === fetchId) {
                setClients(data.items || [])
                setClientsTotalPages(data.pages || 1)
                setClientsTotalItems(data.total || 0)
            }
        } catch (err) {
            if (currentClientsFetchRef.current === fetchId) {
                console.error('Failed to load clients', err)
            }
        } finally {
            if (currentClientsFetchRef.current === fetchId) {
                setLoadingClients(false)
            }
        }
    }

    useEffect(() => {
        loadClients()
    }, [clientsPage, debouncedClientSearch])

    useEffect(() => {
        const newClientId = urlClientId || ''
        if (newClientId !== selectedClient) {
            setSelectedClient(newClientId)
            if (newClientId) {
                clientApi.getPageNum(newClientId, debouncedClientSearch).then(res => {
                    if (res.data && res.data.page) {
                        setClientsPage(res.data.page)
                    }
                }).catch(err => console.error("Could not fetch client page", err))

                loadEvents(newClientId)
            } else {
                setEvents([])
                setEventSearch('')
                setError('')
                setClientDetail(null)
            }
        }
    }, [urlClientId, selectedClient, debouncedClientSearch])

    const currentFetchRef = useRef(0)

    const loadEvents = async (clientId) => {
        if (!clientId) return

        const fetchId = Date.now()
        currentFetchRef.current = fetchId

        setLoadingEvents(true); setError(''); setEvents([]); setClientDetail(null);
        try {
            const [clientRes, eventsRes] = await Promise.all([
                clientApi.getById(clientId).catch(() => ({ data: null })),
                eventApi.getAll(clientId)
            ])
            if (currentFetchRef.current === fetchId) {
                if (clientRes.data) setClientDetail(clientRes.data)
                setEvents(eventsRes.data.data?.data || [])
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

    const [eventSearch, setEventSearch] = useState('')
    const filteredEvents = events.filter(e =>
        e.name.toLowerCase().includes(eventSearch.toLowerCase())
    )

    return (
        <div className="flex flex-col md:flex-row h-full overflow-hidden bg-white dark:bg-zinc-950">

            {/* ── Desktop Left Sidebar: Clients List ── */}
            {(!selectedClient || !isIsolated) && (
                <div className="hidden md:flex flex-col flex-shrink-0 w-64 lg:w-72 3xl:w-80 4xl:w-96 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 h-full">
                    <div className="p-4 3xl:p-5 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between mb-3 3xl:mb-4">
                            <h2 className="text-xs 3xl:text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Select Client
                            </h2>
                            {!loadingClients && (
                                <span className="text-xs font-medium text-zinc-500 bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                                    {clientsTotalItems}
                                </span>
                            )}
                        </div>
                        <div className="relative mt-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="input-field pl-9 text-sm 3xl:py-2.5"
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
                                        className={`w-full text-left p-3 3xl:p-4 transition-all duration-200 border rounded-lg
                                            ${isSelected
                                                ? 'bg-white dark:bg-zinc-800 border-zinc-900 dark:border-zinc-600 shadow-sm my-0.5'
                                                : 'bg-transparent border-transparent hover:bg-white dark:hover:bg-zinc-800/50 hover:border-zinc-200 dark:hover:border-zinc-700'
                                            }`}
                                    >
                                        <div className="flex flex-col overflow-hidden pr-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm 3xl:text-base truncate font-medium ${isSelected ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                                    {formatName(c.name)}
                                                </span>
                                                {!c.is_active && (
                                                    <span className="shrink-0 text-[9px] 3xl:text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-800/50">
                                                        Inactive
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] 3xl:text-xs font-mono text-zinc-400 truncate mt-0.5">
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

                    {/* Sidebar Pagination */}
                    {clientsTotalPages > 1 && (
                        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
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
            )}

            {/* ── Right Main Area: Events ── */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Mobile Client selector */}
                {(!selectedClient || !isIsolated) && (
                    <div className="md:hidden p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                        <p className="text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-2">Select Client</p>
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
                )}

                <div className="flex-1 overflow-y-auto p-4 md:p-6 3xl:p-8 space-y-6 3xl:space-y-8">
                    {/* Page Title + Actions Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl 3xl:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {clientDetail ? formatName(clientDetail.name) : 'Events'}
                            </h1>
                            <p className="text-zinc-500 dark:text-zinc-400 text-sm 3xl:text-base mt-0.5">
                                {clientDetail ? `Manage events for ${clientDetail.domain_name}` : 'Select a client to manage their events'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 3xl:gap-3">
                            {selectedClient && (
                                <>
                                    {isIsolated && (
                                        <button onClick={() => navigate('/events')} className="btn-secondary h-9 3xl:h-10 px-3 sm:px-4 text-sm font-medium">
                                            Clear Selection
                                        </button>
                                    )}
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                                        <input
                                            type="text"
                                            placeholder="Search events..."
                                            className="input-field h-9 3xl:h-10 pl-9 pr-8 w-48 sm:w-64 3xl:w-80 text-sm"
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
                                    <div className="relative group flex items-center">
                                        <button
                                            onClick={() => !error && navigate(`/events/${selectedClient}/new`)}
                                            className={`btn-primary h-9 3xl:h-10 flex items-center justify-center gap-1.5 px-4 3xl:px-5 font-semibold 3xl:text-base transition-all ${error ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                        >
                                            <Plus size={16} /> <span className="hidden sm:inline">New Event</span>
                                        </button>
                                        {error && (
                                            <div className="absolute right-0 top-full mt-2 hidden group-hover:block w-56 p-2.5 bg-zinc-900 dark:bg-zinc-800 border border-zinc-800 dark:border-zinc-700 text-white text-xs font-medium rounded-lg shadow-xl z-[100] text-left leading-snug">
                                                API Invalid: Cannot create new events. Please check the API key.
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Empty: No client selected */}
                    {!selectedClient && !loadingClients && (
                        <div className="py-20 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-2xl flex flex-col items-center justify-center w-full max-w-2xl mx-auto mt-8">
                            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                                <CalendarDays size={26} className="text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100 mb-1">Select a Client</h3>
                            <p className="text-zinc-500 dark:text-zinc-500 text-sm max-w-xs">
                                Choose a client from the sidebar to view and manage their events.
                            </p>
                        </div>
                    )}

                    {/* Loading skeleton */}
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
                                    <div className="flex gap-2 3xl:gap-3 pt-3 3xl:pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                        <Skeleton className="h-9 3xl:h-10 flex-1 rounded" />
                                        <Skeleton className="h-9 3xl:h-10 flex-1 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {/* Events Grid */}
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

                    {/* Empty events */}
                    {!loadingEvents && selectedClient && events.length === 0 && !error && (
                        <div className="card py-16 text-center border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                            <CalendarDays size={36} className="mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                            <p className="text-zinc-800 dark:text-zinc-100 font-semibold">No events found</p>
                            <p className="text-zinc-500 dark:text-zinc-500 text-sm mt-1">Create your first event to get started.</p>
                            <button
                                onClick={() => navigate(`/events/${selectedClient}/new`)}
                                className="mt-4 btn-primary h-9 3xl:h-10 inline-flex items-center justify-center gap-1.5 px-5 font-semibold"
                            >
                                <Plus size={16} /> Create Event
                            </button>
                        </div>
                    )}

                    {/* No search results */}
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
