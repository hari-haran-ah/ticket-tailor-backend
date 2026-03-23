import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { eventApi } from '../../api/event'
import {
    CalendarDays, AlertCircle, ChevronLeft, MapPin, Ticket,
    Clock, Plus, Settings, Trash2, Save, Info, ExternalLink,
    ChevronRight, Tag, Users, TrendingUp, DollarSign, Edit2, Layers, X
} from 'lucide-react'
import Skeleton from '../../components/ui/Skeleton'
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal'
import ManageTicketsModal from '../../components/events/ManageTicketsModal'
import Toast from '../../components/ui/Toast'

function StatCard({ icon: Icon, label, value, color = 'blue' }) {
    return (
        <div className="stat-card">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <Icon size={18} strokeWidth={2} />
            </div>
            <div>
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{value}</p>
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
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
    const [groups, setGroups] = useState([])
    const [toastConfig, setToastConfig] = useState({ show: false, message: '', type: 'success' })

    const [editMode, setEditMode] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        status: '',
        venue_name: '',
        postal_code: '',
        country: 'US'
    })

    const stripHtml = (html) => {
        if (!html) return '';
        let text = html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        text = text.replace(/<br\s*[\/]?>/gi, '\n');
        text = text.replace(/<\/p>/gi, '\n\n');
        text = text.replace(/<\/li>/gi, '\n');
        text = text.replace(/<li>/gi, '• ');
        return text.replace(/<[^>]*>?/gm, '').trim();
    }

    useEffect(() => {
        loadEventDetails(true)
    }, [eventId])

    const loadEventDetails = async (showSkeleton = true) => {
        if (showSkeleton) setLoading(true)
        try {
            const { data } = await eventApi.getById(clientId, eventId)
            const ev = data.data
            setEvent(ev)
            setGroups(ev.ticket_groups || [])
            setFormData({
                name: ev.name || '',
                description: stripHtml(ev.description),
                status: ev.status || '',
                venue_name: ev.venue?.name || '',
                postal_code: ev.venue?.postal_code || '',
                country: ev.venue?.country || 'US'
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
            await eventApi.update(clientId, eventId, formData)
            await loadEventDetails(false)
            setEditMode(false)
            setToastConfig({ show: true, message: `Event "${formData.name}" updated successfully.`, type: 'success' })
        } catch (e) {
            let errorMsg = e.response?.data?.detail || e.message || 'Update failed'
            if (errorMsg.includes('TicketTailor API error:')) {
                try {
                    const ttData = JSON.parse(errorMsg.replace('TicketTailor API error: ', ''))
                    if (ttData.error_code === 'VALIDATION_ERROR' && ttData.message?.includes('payment method')) {
                        errorMsg = 'Payment method missing. Add billing details in Ticket Tailor.'
                    } else if (ttData.message) {
                        errorMsg = ttData.message
                    } else if (ttData.error?.message) {
                        errorMsg = ttData.error.message
                    }
                } catch (parseErr) {}
            }
            if (event) {
                setFormData(prev => ({ ...prev, status: event.status || '' }))
            }
            setToastConfig({ show: true, message: `Error: ${errorMsg}`, type: 'error' })
        } finally {
            setIsSaving(false)
        }
    }

    const handleConfirmDelete = async () => {
        setIsDeleting(true)
        try {
            if (deleteConfig.type === 'event') {
                await eventApi.delete(clientId, eventId)
                navigate('/events')
            } else if (deleteConfig.type === 'ticket') {
                await eventApi.deleteTicket(clientId, eventId, deleteConfig.id)
                loadEventDetails(false)
            } else if (deleteConfig.type === 'group') {
                await eventApi.deleteGroup(clientId, eventId, deleteConfig.id)
                loadEventDetails(false)
            }
            setDeleteConfig({ ...deleteConfig, show: false })
            setToastConfig({ show: true, message: 'Deleted successfully.', type: 'success' })
        } catch (e) {
            setError(`Delete failed: ${e.message}`)
            setToastConfig({ show: true, message: `Delete failed: ${e.message}`, type: 'error' })
        } finally {
            setIsDeleting(false)
        }
    }

    if (loading) return (
        <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 pb-12">
                    <div className="flex flex-row items-center justify-between gap-4 w-full border-b border-zinc-200 dark:border-zinc-800 pb-4">
                        <div className="flex items-center gap-4 flex-1">
                            <Skeleton className="w-16 h-4" />
                            <Skeleton className="w-1/2 md:w-1/3 h-8" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="w-32 h-9 rounded-lg" />
                            <Skeleton className="w-9 h-9 rounded-lg" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="card p-6 space-y-8">
                                <div className="space-y-3">
                                    <Skeleton className="w-32 h-3" />
                                    <div className="space-y-2">
                                        <Skeleton className="w-full h-4" />
                                        <Skeleton className="w-full h-4" />
                                        <Skeleton className="w-2/3 h-4" />
                                    </div>
                                </div>
                            </div>
                            <div className="card">
                                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
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
        <div className="p-10 text-center bg-white dark:bg-zinc-950 min-h-screen">
            <AlertCircle size={48} className="mx-auto mb-4 text-zinc-300 dark:text-zinc-700" />
            <p className="text-zinc-700 dark:text-zinc-300 font-semibold text-lg mb-6">Event not found</p>
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
        <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 pb-12">

                    {/* ─── Header ─── */}
                    <div className="flex flex-row items-center justify-between gap-4 w-full border-b border-zinc-200 dark:border-zinc-800 pb-4">
                        <div className="flex items-center gap-3 lg:gap-4 shrink overflow-hidden">
                            <Link
                                to={`/events/${clientId}`}
                                className="shrink-0 h-4 flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 text-xs font-bold uppercase tracking-wider transition-colors pr-3 border-r border-zinc-200 dark:border-zinc-800"
                            >
                                <X size={14} strokeWidth={2.5} /> Close
                            </Link>
                            <h1 className="text-xl lg:text-[22px] font-bold text-zinc-900 dark:text-white tracking-tight leading-none truncate shrink">
                                {event.name}
                            </h1>
                            <span className={`${statusClass} text-[10px] px-2 py-0.5 shadow-sm whitespace-nowrap`}>
                                {event.status?.replace('_', ' ')}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => {
                                    if (!editMode) {
                                        setFormData(prev => ({ ...prev, description: stripHtml(prev.description) }))
                                    }
                                    setEditMode(!editMode)
                                }}
                                className={`h-9 px-4 font-semibold flex items-center justify-center gap-1.5 shrink-0 ${editMode ? 'btn-secondary' : 'btn-primary'}`}
                            >
                                <Settings size={16} strokeWidth={2.5} />
                                {editMode ? 'Cancel Edit' : 'Edit Event'}
                            </button>
                            <button
                                onClick={() => setDeleteConfig({ show: true, type: 'event', id: eventId, name: event.name })}
                                disabled={isDeleting}
                                className="btn-danger h-9 w-9 rounded-lg flex items-center justify-center p-0 shrink-0"
                            >
                                <Trash2 size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* ─── Main Content ─── */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="card p-6 max-h-[800px] overflow-y-auto custom-scrollbar">
                                {editMode ? (
                                    <form onSubmit={handleUpdate} className="space-y-5">
                                        <div className="space-y-1.5">
                                            <label className="label">Event Name</label>
                                            <input
                                                className="input-field text-sm"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="label">Status</label>
                                                <div className="relative">
                                                    <div
                                                        className="input-field cursor-pointer flex items-center justify-between text-sm"
                                                        onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                                                    >
                                                        <span className="capitalize">{formData.status}</span>
                                                        <span className="ml-2 text-zinc-400">▼</span>
                                                    </div>
                                                    {statusDropdownOpen && (
                                                        <div className="absolute top-11 left-0 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-50 overflow-hidden py-1">
                                                            {['published', 'draft', 'closed'].map(statusOption => (
                                                                <div
                                                                    key={statusOption}
                                                                    className="px-4 py-2 cursor-pointer capitalize text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, status: statusOption });
                                                                        setStatusDropdownOpen(false);
                                                                    }}
                                                                >
                                                                    {statusOption}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="label">Description</label>
                                            <textarea
                                                className="input-field min-h-[180px] max-h-[300px] resize-y custom-scrollbar text-sm"
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            />
                                        </div>
                                        {/* Venue Details */}
                                        <div className="pt-2">
                                            <h4 className="text-zinc-400 dark:text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-3">Venue Details</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="label">Venue Name</label>
                                                    <input
                                                        className="input-field text-sm"
                                                        placeholder="e.g. ExCeL London"
                                                        value={formData.venue_name}
                                                        onChange={e => setFormData({ ...formData, venue_name: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="label">Postal Code</label>
                                                    <input
                                                        className="input-field text-sm"
                                                        placeholder="e.g. E16 1XL"
                                                        value={formData.postal_code}
                                                        onChange={e => setFormData({ ...formData, postal_code: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="label">Country</label>
                                                    <select
                                                        className="input-field appearance-none text-sm"
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
                                        <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                            <button type="button" onClick={() => setEditMode(false)} className="btn-secondary h-9 px-4 font-semibold">Cancel</button>
                                            <button type="submit" disabled={isSaving} className="btn-primary h-9 px-4 font-semibold">
                                                {isSaving ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                                <Info size={12} /> Description
                                            </h3>
                                            <div
                                                className="description-content max-h-[400px] overflow-y-auto overflow-x-hidden break-words text-left pr-2 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed custom-scrollbar whitespace-pre-wrap"
                                                dangerouslySetInnerHTML={{
                                                    __html: event.description
                                                        ? event.description.replace(/\n/g, '<br>')
                                                        : '<p class="text-zinc-400 italic">No description provided.</p>'
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ─── Ticket Types Table ─── */}
                            <div className="card overflow-hidden">
                                <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 sticky top-0 z-10">
                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                                        <Ticket size={15} className="text-zinc-400" /> Ticket Types
                                    </h3>
                                    <button
                                        onClick={() => setShowManageModal(true)}
                                        className="btn-primary h-9 px-4 font-semibold flex items-center justify-center gap-1.5"
                                    >
                                        <Plus size={15} /> Add Ticket
                                    </button>
                                </div>
                                <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 z-10">
                                            <tr className="border-b-2 border-zinc-200 dark:border-zinc-800">
                                                <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">Name</th>
                                                <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">Group</th>
                                                <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">Price</th>
                                                <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">Status</th>
                                                <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">Qty</th>
                                                <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                            {event.ticket_types?.map((tt, i) => (
                                                <tr key={tt.id} className={`transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${i % 2 === 1 ? 'bg-zinc-50/40 dark:bg-zinc-900/20' : ''}`}>
                                                    <td className="px-5 py-3.5">
                                                        <div className="font-medium text-sm text-zinc-700 dark:text-zinc-300">{tt.name}</div>
                                                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-mono">{tt.id}</div>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md text-zinc-500 dark:text-zinc-400">
                                                            {groups.find(g => g.id === tt.group_id)?.name || 'None'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">£{(tt.price / 100).toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className={tt.status === 'on_sale' ? 'badge-published' : 'badge-draft'}>
                                                            {tt.status?.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center text-sm text-zinc-600 dark:text-zinc-400">{tt.quantity || 0}</td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5 text-zinc-400 dark:text-zinc-500">
                                                            <button
                                                                onClick={() => { setManageConfig({ mode: 'edit', data: { ...tt, type: 'ticket' } }); setShowManageModal(true); }}
                                                                className="p-1.5 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteConfig({ show: true, type: 'ticket', id: tt.id, name: tt.name })}
                                                                className="p-1.5 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {(!event.ticket_types || event.ticket_types.length === 0) && (
                                        <div className="text-center py-12 text-zinc-400 dark:text-zinc-500">
                                            <Ticket size={32} className="mx-auto mb-3 opacity-30" />
                                            <p className="text-sm">No ticket types yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ─── Right Sidebar ─── */}
                        <div className="space-y-4 h-fit sticky top-8">
                            {/* Event Info Card */}
                            <div className="card p-5 space-y-4">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock size={12} strokeWidth={2.5} /> Date & Time
                                    </p>
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                                        {event.start ? new Date(event.start.date).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : 'TBA'}
                                    </p>
                                    {event.start?.time && (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{event.start.time} {event.end?.time ? `- ${event.end.time}` : ''}</p>
                                    )}
                                </div>
                                <hr className="border-zinc-200 dark:border-zinc-800" />
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <MapPin size={12} strokeWidth={2.5} /> Venue
                                    </p>
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-snug pr-2">
                                        {event.venue?.name || 'TBA'}
                                    </p>
                                    {event.venue?.postal_code && (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{event.venue.postal_code}</p>
                                    )}
                                </div>
                            </div>

                            <StatCard icon={TrendingUp} label="Est. Revenue" value={`£${((event.total_issued_tickets || 0) * (event.ticket_types?.[0]?.price || 0) / 100).toFixed(2)}`} />
                            <StatCard icon={Users} label="Total Issued" value={event.total_issued_tickets || 0} />
                            <StatCard icon={Ticket} label="Ticket Types" value={event.ticket_types?.length || 0} />
                            <StatCard icon={Layers} label="Ticket Groups" value={groups.length || 0} />
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
                        show={toastConfig.show} message={toastConfig.message} type={toastConfig.type}
                        onClose={() => setToastConfig({ ...toastConfig, show: false })}
                    />
                </div>
            </div>
        </div>
    )
}
