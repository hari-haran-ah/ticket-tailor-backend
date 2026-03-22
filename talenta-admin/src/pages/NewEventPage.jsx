import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'
import { AlertCircle, ChevronLeft } from 'lucide-react'

export default function NewEventPage() {
    const { clientId } = useParams()
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

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true); setError('')
        try {
            await api.post(`/api/tt/${clientId}/events`, formData)
            // Go back to the client's events list page after successful creation
            navigate(`/events/${clientId}`)
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create event')
            setLoading(false)
        }
    }

    return (
        <div className="p-8 space-y-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-gray-300 dark:border-white/10 pb-6">
                <div className="space-y-3">
                    <button onClick={() => navigate(`/events/${clientId}`)} className="text-gray-500 dark:text-white/30 hover:text-gray-900 dark:hover:text-white/70 flex items-center gap-1.5 text-xs font-medium transition-colors">
                        <ChevronLeft size={14} /> Back to Events
                    </button>
                    <div>
                        <p className="text-gray-600 dark:text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">New Event</p>
                        <h1 className="text-2xl font-bold text-black dark:text-white tracking-tight">Create a New Event</h1>
                    </div>
                </div>
            </div>

            <div className="card overflow-hidden">
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2">
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="label">Event Name</label>
                            <input
                                required
                                className="input-field max-w-2xl md:text-[15px]"
                                placeholder="e.g. Next-Gen Tech Conference 2026"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="label">Description</label>
                            <textarea
                                className="input-field min-h-[120px] max-h-[400px] resize-y custom-scrollbar md:text-[15px]"
                                placeholder="A brief description of the event..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        {/* Date and Time Row 1 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                            <div className="space-y-1.5">
                                <label className="label">Start Date</label>
                                <input
                                    required type="date"
                                    className="input-field md:text-[15px]"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="label">Start Time</label>
                                <input
                                    required type="time"
                                    className="input-field md:text-[15px]"
                                    value={formData.start_time}
                                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Date and Time Row 2 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                            <div className="space-y-1.5">
                                <label className="label">End Date</label>
                                <input
                                    required type="date"
                                    className="input-field md:text-[15px]"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="label">End Time</label>
                                <input
                                    required type="time"
                                    className="input-field md:text-[15px]"
                                    value={formData.end_time}
                                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                />
                            </div>
                        </div>

                        <hr className="border-gray-300 dark:border-white/10" />

                        {/* Location Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1.5">
                                <label className="label">Venue Name</label>
                                <input
                                    disabled={formData.online_event}
                                    className="input-field disabled:opacity-30 md:text-[15px]"
                                    placeholder="e.g. ExCeL London"
                                    value={formData.venue_name}
                                    onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="label">Postal Code</label>
                                <input
                                    disabled={formData.online_event}
                                    className="input-field disabled:opacity-30 md:text-[15px]"
                                    placeholder="e.g. E16 1XL"
                                    value={formData.postal_code}
                                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="label">Country</label>
                                <select
                                    disabled={formData.online_event}
                                    className="input-field disabled:opacity-30 appearance-none md:text-[15px]"
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                >
                                    <option value="US">United States</option>
                                    <option value="GB">United Kingdom</option>
                                    <option value="IN">India</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <input
                                type="checkbox"
                                id="online"
                                checked={formData.online_event}
                                onChange={(e) => setFormData({ ...formData, online_event: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-300 dark:border-white/20 bg-white dark:bg-black accent-black dark:accent-white cursor-pointer"
                            />
                            <label htmlFor="online" className="text-sm font-medium text-gray-700 dark:text-white/80 cursor-pointer select-none">
                                This is an Online Event
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
                        <button type="button" onClick={() => navigate(`/events/${clientId}`)} className="btn-secondary">Cancel</button>
                        <button disabled={loading} className="btn-primary">
                            {loading ? 'Creating Event...' : 'Create Event'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
