import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { eventApi } from '../../api/event'
import { AlertCircle, ChevronLeft } from 'lucide-react'

export default function NewEventPage() {
    const { clientId } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const initialToday = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
    const initialTime = new Date().toTimeString().slice(0, 5) + ':00'
    const end = new Date(new Date().getTime() + 60 * 60000)
    const initialEndTime = end.toTimeString().slice(0, 5) + ':00'

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        venue_name: '',
        postal_code: '',
        country: 'US',
        groups: [],
        tickets: []
    })

    const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 5);

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (formData.start_date === today && formData.start_time && formData.start_time < currentTime) {
            setError('Start time cannot be in the past for today\'s events.')
            return
        }

        if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
            setError('End date cannot be before the start date.')
            return
        }

        if (formData.start_date && formData.end_date && formData.start_time && formData.end_time && formData.start_date === formData.end_date && formData.end_time <= formData.start_time) {
            setError('End time must be after the start time on the same day.')
            return
        }

        setLoading(true); setError('')

        // Ensure time strings are formatted to H:i:s as required by TicketTailor API
        const formatTime = (timeStr) => {
            if (!timeStr) return timeStr
            if (timeStr.length === 5) return `${timeStr}:00`
            return timeStr
        }

        const payload = {
            ...formData,
            start_time: formatTime(formData.start_time),
            end_time: formatTime(formData.end_time)
        }

        try {
            await eventApi.create(clientId, payload)
            // Go back to the client's events list page after successful creation
            navigate(`/events/${clientId}`)
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create event')
            setLoading(false)
        }
    }

    return (
        <div className="w-full min-h-[100vh] bg-white dark:bg-zinc-950">
            <div className="p-4 md:p-8 space-y-6 max-w-3xl mx-auto pb-24">
                {/* Header */}
                <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
                    <button
                        onClick={() => navigate(`/events/${clientId}`)}
                        className="shrink-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors pr-4 border-r border-zinc-200 dark:border-zinc-800"
                    >
                        <ChevronLeft size={14} /> Back
                    </button>
                    <div>
                        <h1 className="text-xl lg:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Create a New Event</h1>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Fill in the details below to create an event via TicketTailor</p>
                    </div>
                </div>

                <div className="card overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-6">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="label">Start Date</label>
                                    <input
                                        required type="date"
                                        min={today}
                                        className="input-field md:text-[15px]"
                                        value={formData.start_date}
                                        onChange={(e) => {
                                            const newStartDate = e.target.value;
                                            setFormData(prev => ({
                                                ...prev,
                                                start_date: newStartDate,
                                                // Reset end date if it's now before the new start date
                                                end_date: (prev.end_date && prev.end_date < newStartDate) ? newStartDate : prev.end_date
                                            }));
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label">Start Time</label>
                                    <input
                                        required type="time"
                                        min={formData.start_date === today ? currentTime : undefined}
                                        className={`input-field md:text-[15px] ${formData.start_date === today && formData.start_time && formData.start_time < currentTime ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                    />
                                    {formData.start_date === today && formData.start_time && formData.start_time < currentTime && (
                                        <p className="text-red-500 dark:text-red-400 text-xs font-medium">Start time cannot be in the past.</p>
                                    )}
                                </div>
                            </div>

                            {/* Date and Time Row 2 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="label">End Date</label>
                                    <input
                                        required type="date"
                                        min={formData.start_date || today}
                                        className="input-field md:text-[15px]"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label">End Time</label>
                                    <input
                                        required type="time"
                                        min={formData.start_date && formData.end_date && formData.end_date === formData.start_date ? formData.start_time : undefined}
                                        className={`input-field md:text-[15px] ${formData.start_date && formData.end_date && formData.start_time && formData.end_time && formData.start_date === formData.end_date && formData.end_time <= formData.start_time ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                    />
                                    {formData.start_date && formData.end_date && formData.start_time && formData.end_time && formData.start_date === formData.end_date && formData.end_time <= formData.start_time && (
                                        <p className="text-red-500 dark:text-red-400 text-xs font-medium">End time must be after the start time.</p>
                                    )}
                                </div>
                            </div>

                            <hr className="border-zinc-200 dark:border-zinc-800" />

                            {/* Location Details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="space-y-1.5">
                                    <label className="label">Venue Name</label>
                                    <input
                                        className="input-field md:text-[15px]"
                                        placeholder="e.g. ExCeL London"
                                        value={formData.venue_name}
                                        onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label">Postal Code</label>
                                    <input
                                        className="input-field md:text-[15px]"
                                        placeholder="e.g. E16 1XL"
                                        value={formData.postal_code}
                                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label">Country</label>
                                    <select
                                        className="input-field appearance-none md:text-[15px]"
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    >
                                        <option value="US">United States</option>
                                        <option value="GB">United Kingdom</option>
                                        <option value="IN">India</option>
                                    </select>
                                </div>
                            </div>

                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                            <button type="button" onClick={() => navigate(`/events/${clientId}`)} className="btn-secondary h-9 px-5 font-semibold flex items-center justify-center">Cancel</button>
                            <button disabled={loading} className="btn-primary h-9 px-5 font-semibold flex items-center justify-center gap-1.5">
                                {loading ? 'Creating Event...' : 'Create Event'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
