import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'
import {
    CalendarDays, AlertCircle, ChevronLeft, MapPin, Ticket,
    Clock, Plus, Settings, Trash2, Save, Globe, Info, ExternalLink,
    ChevronRight, Tag, Users, TrendingUp, DollarSign, Edit2, Layers
} from 'lucide-react'
import Skeleton from '../components/Skeleton'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
import ManageTicketsModal from '../components/ManageTicketsModal'
import Toast from '../components/Toast'

function StatCard({ icon: Icon, label, value, color = 'blue' }) {
    const colors = {
        blue: 'bg-primary-600/20 text-primary-400',
        green: 'bg-emerald-500/20 text-emerald-400',
        slate: 'bg-white/10 text-white/50',
    }
    return (
        <div className="stat-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color] || colors.slate}`}>
                <Icon size={18} strokeWidth={2} />
            </div>
            <div>
                <p className="label">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
            </div>
        </div>
    )
}

export default function EventDetailsPage() {
    const { clientId, eventId } = useParams()
    const navigate = useNavigate()
    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [deleteConfig, setDeleteConfig] = useState({ show: false, type: 'event', id: '', name: '' })
    const [showManageModal, setShowManageModal] = useState(false)
    const [manageConfig, setManageConfig] = useState({ mode: 'create', data: null })
    const [groups, setGroups] = useState([])
    const [toastConfig, setToastConfig] = useState({ show: false, message: '' })

    const [editMode, setEditMode] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        status: '',
        venue_name: '',
        postal_code: '',
        country: 'US',
        online_event: false,
        private_event: false
    })

    useEffect(() => {
        loadEventDetails()
    }, [eventId])

    const loadEventDetails = async () => {
        setLoading(true)
        try {
            const { data } = await api.get(`/api/tt/${clientId}/events/${eventId}`)
            const ev = data.data
            setEvent(ev)
            setGroups(ev.ticket_groups || [])
            setFormData({
                name: ev.name || '',
                description: ev.description || '',
                status: ev.status || '',
                venue_name: ev.venue?.name || '',
                postal_code: ev.venue?.postal_code || '',
                country: ev.venue?.country || 'US',
                online_event: ev.online_event === 'true' || ev.online_event === true,
                private_event: ev.private === 'true' || ev.private === true
            })
        } catch (e) {
            setError('Failed to load event details')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            await api.patch(`/api/tt/${clientId}/events/${eventId}`, formData)
            setEditMode(false)
            setToastConfig({ show: true, message: `Event "${formData.name}" updated successfully.` })
            setTimeout(() => { loadEventDetails() }, 1500)
        } catch (e) {
            setError('Update failed')
        } finally {
            setIsSaving(false)
        }
    }

    const handleConfirmDelete = async () => {
        setIsDeleting(true)
        try {
            if (deleteConfig.type === 'event') {
                await api.delete(`/api/tt/${clientId}/events/${eventId}`)
                navigate('/events')
            } else if (deleteConfig.type === 'ticket') {
                await api.delete(`/api/tt/${clientId}/events/${eventId}/ticket_types/${deleteConfig.id}`)
                loadEventDetails()
            } else if (deleteConfig.type === 'group') {
                await api.delete(`/api/tt/${clientId}/events/${eventId}/ticket_groups/${deleteConfig.id}`)
                loadEventDetails()
            }
            setDeleteConfig({ ...deleteConfig, show: false })
            setToastConfig({ show: true, message: 'Deleted successfully.' })
        } catch (e) {
            setError(`Delete failed: ${e.message}`)
        } finally {
            setIsDeleting(false)
        }
    }

    if (loading) return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-white/5 pb-7">
                <div className="space-y-4 flex-1">
                    <Skeleton className="w-24 h-3" />
                    <Skeleton className="w-3/4 h-8" />
                    <div className="flex gap-3">
                        <Skeleton className="w-20 h-5 rounded-full" />
                        <Skeleton className="w-32 h-3" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Skeleton className="w-32 h-10 rounded-xl" />
                    <Skeleton className="w-10 h-10 rounded-xl" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Main Card Skeleton */}
                    <div className="card p-6 space-y-8">
                        <div className="space-y-3">
                            <Skeleton className="w-32 h-3" />
                            <div className="space-y-2">
                                <Skeleton className="w-full h-4" />
                                <Skeleton className="w-full h-4" />
                                <Skeleton className="w-2/3 h-4" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/5">
                            <div className="flex gap-4">
                                <Skeleton className="w-10 h-10 rounded-xl" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="w-16 h-3" />
                                    <Skeleton className="w-24 h-4" />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Skeleton className="w-10 h-10 rounded-xl" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="w-16 h-3" />
                                    <Skeleton className="w-24 h-4" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table Skeleton */}
                    <div className="card">
                        <div className="p-6 border-b border-white/5">
                            <Skeleton className="w-40 h-5" />
                        </div>
                        <div className="p-6 space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex justify-between gap-4">
                                    <Skeleton className="h-4 flex-1" />
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Skeleton */}
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="stat-card">
                            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="w-16 h-3" />
                                <Skeleton className="w-24 h-6" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )

    if (!event) return (
        <div className="p-10 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-white/20" />
            <p className="text-white font-semibold text-lg mb-6">Event not found</p>
            <Link to="/events" className="btn-secondary inline-flex items-center gap-2">
                <ChevronLeft size={16} /> Back to Events
            </Link>
        </div>
    )

    const statusClass = {
        published: 'badge-published',
        draft: 'badge-draft',
        closed: 'badge-closed',
    }[event.status] || 'badge-draft'

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-white/5 pb-7">
                <div className="space-y-3">
                    <Link to="/events" className="text-white/30 hover:text-primary-400 flex items-center gap-1.5 text-xs font-medium transition-colors">
                        <ChevronLeft size={14} /> Back to Events
                    </Link>
                    <h1 className="text-2xl font-bold text-white tracking-tight">{event.name}</h1>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className={statusClass}>{event.status}</span>
                        <span className="text-white/30 text-xs flex items-center gap-1.5">
                            <Tag size={11} /> {event.id}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setEditMode(!editMode)}
                        className={`btn-secondary flex items-center gap-2 ${editMode ? 'border-primary-600/40 text-primary-400' : ''}`}
                    >
                        <Settings size={16} />
                        {editMode ? 'Cancel Edit' : 'Edit Event'}
                    </button>
                    <button
                        onClick={() => setDeleteConfig({ show: true, type: 'event', id: eventId, name: event.name })}
                        disabled={isDeleting}
                        className="btn-danger p-2.5 rounded-xl"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card p-6">
                        {editMode ? (
                            <form onSubmit={handleUpdate} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="label">Event Name</label>
                                    <input
                                        className="input-field"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="label">Status</label>
                                        <select
                                            className="input-field appearance-none"
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="published">Published</option>
                                            <option value="draft">Draft</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label">Description</label>
                                    <textarea
                                        className="input-field min-h-[180px] resize-none"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                    <button type="button" onClick={() => setEditMode(false)} className="btn-secondary px-6">Cancel</button>
                                    <button type="submit" disabled={isSaving} className="btn-primary px-8">
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                                        <Info size={12} /> Description
                                    </h3>
                                    <div
                                        className="description-content"
                                        dangerouslySetInnerHTML={{ __html: event.description || '<p class="text-white/30 italic">No description provided.</p>' }}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center flex-shrink-0">
                                            <Clock size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-white/40 mb-0.5">Date & Time</p>
                                            <p className="text-sm font-medium text-white">
                                                {event.start ? new Date(event.start.date).toLocaleDateString('en-GB', { dateStyle: 'long' }) : 'TBA'}
                                            </p>
                                            {event.start?.time && (
                                                <p className="text-xs text-white/40">{event.start.time} - {event.end?.time}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 text-white/50 flex items-center justify-center flex-shrink-0">
                                            <MapPin size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-white/40 mb-0.5">Venue</p>
                                            <p className="text-sm font-medium text-white">{event.venue?.name || 'Online / TBA'}</p>
                                            {event.venue?.postal_code && (
                                                <p className="text-xs text-white/40">{event.venue.postal_code}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Ticket Types */}
                    <div className="card overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-white flex items-center gap-2">
                                <Ticket size={16} className="text-primary-400" /> Ticket Types
                            </h3>
                            <button
                                onClick={() => setShowManageModal(true)}
                                className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5"
                            >
                                <Plus size={13} /> Add Ticket
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-white/30 text-xs font-medium uppercase tracking-wider border-b border-white/5">
                                        <th className="px-6 py-3 text-left">Name</th>
                                        <th className="px-6 py-3 text-left">Group</th>
                                        <th className="px-6 py-3 text-left">Price</th>
                                        <th className="px-6 py-3 text-center">Status</th>
                                        <th className="px-6 py-3 text-center">Qty</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {event.ticket_types?.map(tt => (
                                        <tr key={tt.id} className="hover:bg-white/3 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-white group-hover:text-primary-400 transition-colors">{tt.name}</div>
                                                <div className="text-[10px] text-white/30 mt-0.5 font-mono">{tt.id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs px-2 py-0.5 bg-white/10 rounded-md text-white/50">
                                                    {groups.find(g => g.id === tt.group_id)?.name || 'None'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-white">£{(tt.price / 100).toFixed(2)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={tt.status === 'on_sale' ? 'badge-published' : 'badge-draft'}>
                                                    {tt.status?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-white/70">{tt.quantity || 0}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 text-white/30">
                                                    <button onClick={() => { setManageConfig({ mode: 'edit', data: { ...tt, type: 'ticket' } }); setShowManageModal(true); }} className="hover:text-primary-400 p-1 transition-colors"><Edit2 size={14} /></button>
                                                    <button onClick={() => setDeleteConfig({ show: true, type: 'ticket', id: tt.id, name: tt.name })} className="hover:text-red-400 p-1 transition-colors"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {(!event.ticket_types || event.ticket_types.length === 0) && (
                                <div className="text-center py-12 text-white/30">
                                    <Ticket size={32} className="mx-auto mb-3 opacity-30" />
                                    No ticket types yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right sidebar stats */}
                <div className="space-y-4">
                    <StatCard icon={TrendingUp} label="Est. Revenue" value={`£${((event.total_issued_tickets || 0) * (event.ticket_types?.[0]?.price || 0) / 100).toFixed(2)}`} color="blue" />
                    <StatCard icon={Users} label="Total Issued" value={event.total_issued_tickets || 0} color="green" />
                    <StatCard icon={Ticket} label="Ticket Types" value={event.ticket_types?.length || 0} color="slate" />
                </div>
            </div>

            <DeleteConfirmationModal
                isOpen={deleteConfig.show}
                onClose={() => setDeleteConfig({ ...deleteConfig, show: false })}
                onConfirm={handleConfirmDelete}
                isLoading={isDeleting}
                title={`Delete ${deleteConfig.type}`}
                message={`Are you sure you want to delete "${deleteConfig.name}"? This cannot be undone.`}
            />

            <ManageTicketsModal
                isOpen={showManageModal}
                onClose={() => { setShowManageModal(false); setManageConfig({ mode: 'create', data: null }); }}
                client_id={clientId} event={event} groups={groups}
                onCreated={() => loadEventDetails()}
                mode={manageConfig.mode} editData={manageConfig.data}
            />

            <Toast
                show={toastConfig.show} message={toastConfig.message}
                onClose={() => setToastConfig({ ...toastConfig, show: false })}
            />
        </div>
    )
}
