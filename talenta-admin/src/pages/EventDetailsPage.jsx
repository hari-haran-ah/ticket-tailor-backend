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
        blue: 'bg-gray-100 dark:bg-white/10 text-black dark:text-white',
        green: 'bg-gray-100 dark:bg-white/10 text-black dark:text-white',
        slate: 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/50',
    }
    return (
        <div className="stat-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color] || colors.slate}`}>
                <Icon size={18} strokeWidth={2} />
            </div>
            <div>
                <p className="label">{label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
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
        loadEventDetails(true)
    }, [eventId])

    const loadEventDetails = async (showSkeleton = true) => {
        if (showSkeleton) setLoading(true)
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
            if (showSkeleton) setError('Failed to load event details')
        } finally {
            if (showSkeleton) setLoading(false)
        }
    }

    const handleUpdate = async (e) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            await api.patch(`/api/tt/${clientId}/events/${eventId}`, formData)
            await loadEventDetails(false)
            setEditMode(false)
            setToastConfig({ show: true, message: `Event "${formData.name}" updated successfully.` })
        } catch (e) {
            setToastConfig({ show: true, message: 'Update failed.' })
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
                loadEventDetails(false)
            } else if (deleteConfig.type === 'group') {
                await api.delete(`/api/tt/${clientId}/events/${eventId}/ticket_groups/${deleteConfig.id}`)
                loadEventDetails(false)
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
        <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-[#0a0a0a]">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
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
            </div>
        </div>
    )

    if (!event) return (
        <div className="p-10 text-center bg-white dark:bg-[#0a0a0a] min-h-screen">
            <AlertCircle size={48} className="mx-auto mb-4 text-gray-400 dark:text-white/20" />
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
        <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-[#0a0a0a]">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-8 max-w-7xl mx-auto space-y-8 pb-12">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-gray-300 dark:border-white/10 pb-7">
                        <div className="space-y-3">
                            <Link to="/events" className="text-gray-500 dark:text-white/30 hover:text-gray-900 dark:hover:text-white/70 flex items-center gap-1.5 text-xs font-medium transition-colors">
                                <ChevronLeft size={14} /> Back to Events
                            </Link>
                            <h1 className="text-2xl font-bold text-black dark:text-white tracking-tight break-words">{event.name}</h1>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className={statusClass}>{event.status}</span>
                                <span className="text-gray-400 dark:text-white/30 text-xs flex items-center gap-1.5">
                                    <Tag size={11} /> {event.id}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setEditMode(!editMode)}
                                className={`btn-secondary flex items-center gap-2 ${editMode ? 'border-gray-400 dark:border-white/40 text-black dark:text-white bg-gray-100 dark:bg-white/10' : ''}`}
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
                            <div className="card p-6 max-h-[800px] overflow-y-auto custom-scrollbar">
                                {editMode ? (
                                    <form onSubmit={handleUpdate} className="space-y-5">
                                        <div className="space-y-1.5">
                                            <label className="label">Event Name</label>
                                            <input
                                                className="input-field md:text-[15px]"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="label">Status</label>
                                                <select
                                                    className="input-field appearance-none md:text-[15px]"
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
                                                className="input-field min-h-[180px] max-h-[300px] resize-y custom-scrollbar md:text-[15px]"
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            />
                                        </div>

                                        {/* Options */}
                                        <div className="flex items-center gap-6 pt-2">
                                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-white/70 cursor-pointer hover:text-black dark:hover:text-white transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-white focus:ring-white/50 focus:ring-offset-gray-900 accent-white"
                                                    checked={formData.online_event}
                                                    onChange={e => setFormData({ ...formData, online_event: e.target.checked })}
                                                />
                                                <span>Online Event</span>
                                            </label>
                                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-white/70 cursor-pointer hover:text-black dark:hover:text-white transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-white focus:ring-white/50 focus:ring-offset-gray-900 accent-white"
                                                    checked={formData.private_event}
                                                    onChange={e => setFormData({ ...formData, private_event: e.target.checked })}
                                                />
                                                <span>Private Event</span>
                                            </label>
                                        </div>

                                        {/* Venue Details */}
                                        <div className="pt-2">
                                            <h4 className="text-gray-500 dark:text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Venue Details</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="label">Venue Name</label>
                                                    <input
                                                        disabled={formData.online_event}
                                                        className="input-field disabled:opacity-30 disabled:cursor-not-allowed md:text-[15px]"
                                                        placeholder="e.g. ExCeL London"
                                                        value={formData.venue_name}
                                                        onChange={e => setFormData({ ...formData, venue_name: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="label">Postal Code</label>
                                                    <input
                                                        disabled={formData.online_event}
                                                        className="input-field disabled:opacity-30 disabled:cursor-not-allowed md:text-[15px]"
                                                        placeholder="e.g. E16 1XL"
                                                        value={formData.postal_code}
                                                        onChange={e => setFormData({ ...formData, postal_code: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="label">Country</label>
                                                    <select
                                                        disabled={formData.online_event}
                                                        className="input-field appearance-none disabled:opacity-30 disabled:cursor-not-allowed md:text-[15px]"
                                                        value={formData.country}
                                                        onChange={e => setFormData({ ...formData, country: e.target.value })}
                                                    >
                                                        <option value="US">United States</option>
                                                        <option value="GB">United Kingdom</option>
                                                        <option value="IN">India</option>
                                                        <option value="CA">Canada</option>
                                                        <option value="AU">Australia</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-300 dark:border-white/10">
                                            <button type="button" onClick={() => setEditMode(false)} className="btn-secondary text-xs py-1.5 px-4">Cancel</button>
                                            <button type="submit" disabled={isSaving} className="btn-primary text-xs py-1.5 px-5">
                                                {isSaving ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider flex items-center gap-2">
                                                <Info size={12} /> Description
                                            </h3>
                                            <div
                                                className="description-content max-h-[400px] overflow-y-auto overflow-x-hidden break-words text-left pr-2 text-sm text-gray-700 dark:text-white/100 leading-relaxed custom-scrollbar whitespace-pre-wrap"
                                                dangerouslySetInnerHTML={{
                                                    __html: event.description
                                                        ? event.description.replace(/\n/g, '<br>')
                                                        : '<p class="text-white/30 italic">No description provided.</p>'
                                                }}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 text-black dark:text-white flex items-center justify-center flex-shrink-0 border border-gray-300 dark:border-white/10">
                                                    <Clock size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-white/40 mb-0.5">Date & Time</p>
                                                    <p className="text-sm font-medium text-black dark:text-white">
                                                        {event.start ? new Date(event.start.date).toLocaleDateString('en-GB', { dateStyle: 'long' }) : 'TBA'}
                                                    </p>
                                                    {event.start?.time && (
                                                        <p className="text-xs text-gray-500 dark:text-white/40">{event.start.time} - {event.end?.time}</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/50 flex items-center justify-center flex-shrink-0 border border-gray-300 dark:border-white/10">
                                                    <MapPin size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-white/40 mb-0.5">Venue</p>
                                                    <p className="text-sm font-medium text-black dark:text-white break-words pr-4">{event.venue?.name || 'Online / TBA'}</p>
                                                    {event.venue?.postal_code && (
                                                        <p className="text-xs text-gray-500 dark:text-white/40">{event.venue.postal_code}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Ticket Types */}
                            <div className="card overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-300 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-[#212121]/50 backdrop-blur-sm sticky top-0 z-10">
                                    <h3 className="text-base font-semibold text-black dark:text-white flex items-center gap-2">
                                        <Ticket size={16} className="text-black dark:text-white" /> Ticket Types
                                    </h3>
                                    <button
                                        onClick={() => setShowManageModal(true)}
                                        className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5"
                                    >
                                        <Plus size={13} /> Add Ticket
                                    </button>
                                </div>
                                <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-gray-50/90 dark:bg-[#212121]/90 backdrop-blur-sm z-10">
                                            <tr className="text-gray-400 dark:text-white/30 text-xs font-medium uppercase tracking-wider border-b border-gray-300 dark:border-white/10">
                                                <th className="px-6 py-3 text-left">Name</th>
                                                <th className="px-6 py-3 text-left">Group</th>
                                                <th className="px-6 py-3 text-left">Price</th>
                                                <th className="px-6 py-3 text-center">Status</th>
                                                <th className="px-6 py-3 text-center">Qty</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                                            {event.ticket_types?.map(tt => (
                                                <tr key={tt.id} className="hover:bg-white/3 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-black dark:text-white group-hover:text-gray-600 dark:group-hover:text-white/100 transition-colors">{tt.name}</div>
                                                        <div className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5 font-mono">{tt.id}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded-md text-gray-500 dark:text-white/50">
                                                            {groups.find(g => g.id === tt.group_id)?.name || 'None'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-semibold text-black dark:text-white">£{(tt.price / 100).toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={tt.status === 'on_sale' ? 'badge-published' : 'badge-draft'}>
                                                            {tt.status?.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-gray-600 dark:text-white/70">{tt.quantity || 0}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2 text-gray-400 dark:text-white/30">
                                                            <button onClick={() => { setManageConfig({ mode: 'edit', data: { ...tt, type: 'ticket' } }); setShowManageModal(true); }} className="hover:text-black dark:hover:text-white p-1 transition-colors"><Edit2 size={14} /></button>
                                                            <button onClick={() => setDeleteConfig({ show: true, type: 'ticket', id: tt.id, name: tt.name })} className="hover:text-black dark:hover:text-white p-1 transition-colors"><Trash2 size={14} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {(!event.ticket_types || event.ticket_types.length === 0) && (
                                        <div className="text-center py-12 text-gray-400 dark:text-white/30">
                                            <Ticket size={32} className="mx-auto mb-3 opacity-30" />
                                            No ticket types yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right sidebar stats */}
                        <div className="space-y-4 h-fit sticky top-8">
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
                        onCreated={() => loadEventDetails(false)}
                        mode={manageConfig.mode} editData={manageConfig.data}
                    />

                    <Toast
                        show={toastConfig.show} message={toastConfig.message}
                        onClose={() => setToastConfig({ ...toastConfig, show: false })}
                    />
                </div>
            </div>
        </div>
    )
}
