import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'
import {
    CalendarDays, AlertCircle, Clock, Plus, Settings, X,
    Ticket, MapPin
} from 'lucide-react'
import Skeleton from '../components/Skeleton'
import ClientSelector from '../components/ClientSelector'
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
            className="card p-5 cursor-pointer hover:border-primary-600/30 transition-all duration-200 space-y-4 group"
        >
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-white leading-tight group-hover:text-primary-400 transition-colors line-clamp-2">
                    {event.name}
                </h3>
                <span className={statusClass}>{status}</span>
            </div>

            <div className="space-y-2 text-xs text-white/40">
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

            <div className="flex gap-2 pt-3 border-t border-white/5">
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

function CreateEventModal({ isOpen, onClose, client_id, onCreated }) {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        start_date: '',
        start_time: '09:00:00',
        end_date: '',
        end_time: '18:00:00',
        venue_name: '',
        postal_code: '',
        country: 'US',
        online_event: false,
        private_event: false,
        groups: [],
        tickets: []
    })

    if (!isOpen) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true); setError('')
        try {
            const { data } = await api.post(`/api/tt/${client_id}/events`, formData)
            onCreated()
            if (data?.data?.id) {
                navigate(`/events/${client_id}/${data.data.id}`)
            } else {
                onClose()
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create event')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-dark-950/80 backdrop-blur-sm">
            <div className="card w-full max-w-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-primary-400 text-xs font-semibold uppercase tracking-widest mb-0.5">New Event</p>
                        <h2 className="text-lg font-bold text-white">Create Event</h2>
                    </div>
                    <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <div className="space-y-5">
                        <div className="space-y-1">
                            <label className="label">Event Name</label>
                            <input
                                required
                                className="input-field"
                                placeholder="e.g. Node.js Bootcamp 2026"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="label">Start Date</label>
                                <input
                                    required type="date"
                                    className="input-field"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="label">Start Time</label>
                                <input
                                    required type="time"
                                    className="input-field"
                                    value={formData.start_time}
                                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="label">End Date</label>
                                <input
                                    required type="date"
                                    className="input-field"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="label">End Time</label>
                                <input
                                    required type="time"
                                    className="input-field"
                                    value={formData.end_time}
                                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-white/5">
                            <div className="space-y-1">
                                <label className="label">Venue</label>
                                <input
                                    disabled={formData.online_event}
                                    className="input-field disabled:opacity-30"
                                    placeholder="e.g. ExCeL London"
                                    value={formData.venue_name}
                                    onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="label">Postal Code</label>
                                <input
                                    disabled={formData.online_event}
                                    className="input-field disabled:opacity-30"
                                    placeholder="e.g. E16 1XL"
                                    value={formData.postal_code}
                                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="label">Country</label>
                                <select
                                    disabled={formData.online_event}
                                    className="input-field disabled:opacity-30 appearance-none"
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                >
                                    <option value="US">United States</option>
                                    <option value="GB">United Kingdom</option>
                                    <option value="IN">India</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="online"
                                checked={formData.online_event}
                                onChange={(e) => setFormData({ ...formData, online_event: e.target.checked })}
                                className="w-4 h-4 rounded border-white/20 bg-dark-950 accent-primary-600"
                            />
                            <label htmlFor="online" className="text-sm text-white/60 cursor-pointer">Online Event</label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <button type="button" onClick={onClose} className="btn-secondary px-6">Cancel</button>
                        <button disabled={loading} className="btn-primary px-8">
                            {loading ? 'Creating...' : 'Create Event'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function EventsPage() {
    const { clientId: urlClientId } = useParams()
    const [clients, setClients] = useState([])
    const [selectedClient, setSelectedClient] = useState('')
    const [events, setEvents] = useState([])
    const [loadingClients, setLoadingClients] = useState(true)
    const [loadingEvents, setLoadingEvents] = useState(false)
    const [error, setError] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
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

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 border-b border-white/5 pb-6">
                <div>
                    <p className="text-primary-400 text-xs font-semibold uppercase tracking-widest mb-1">Client Assets</p>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Event Management</h1>
                </div>
                {selectedClient && (
                    <button onClick={() => setIsCreateOpen(true)} className="btn-primary flex items-center gap-2">
                        <Plus size={16} /> Create Event
                    </button>
                )}
            </div>

            <div className="max-w-sm">
                <label className="label mb-3 block">Select Client</label>
                <ClientSelector
                    clients={clients}
                    selectedId={selectedClient}
                    onSelect={(id) => { setSelectedClient(id); loadEvents(id) }}
                    placeholder="Choose a client..."
                />
            </div>

            {loadingEvents && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in">
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
                            <div className="flex gap-2 pt-3 border-t border-white/5">
                                <Skeleton className="h-8 flex-1 rounded-xl" />
                                <Skeleton className="h-8 flex-1 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {!loadingEvents && events.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                <div className="card py-20 text-center border-dashed border-white/10 bg-transparent">
                    <CalendarDays size={48} className="mx-auto mb-4 text-white/10" />
                    <p className="text-white/60 font-medium">No events found</p>
                    <p className="text-white/30 text-sm mt-1">Create your first event to get started.</p>
                </div>
            )}

            <CreateEventModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                client_id={selectedClient}
                onCreated={() => loadEvents(selectedClient)}
            />

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
