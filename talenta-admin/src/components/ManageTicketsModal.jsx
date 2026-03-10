import { useState, useEffect } from 'react'
import { Ticket, Layers, X, AlertCircle, Plus, Save } from 'lucide-react'
import api from '../lib/api'

export default function ManageTicketsModal({ isOpen, onClose, client_id, event, groups, onCreated, editData = null, mode = 'create' }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [activeTab, setActiveTab] = useState(editData?.type === 'group' ? 'group' : 'ticket')

    // Ticket Data
    const [ttData, setTtData] = useState({
        name: '',
        price: 0,
        quantity: 100,
        group_id: ''
    })

    // Group Data
    const [tgName, setTgName] = useState('')

    const isEdit = mode === 'edit'

    useEffect(() => {
        if (isOpen && editData) {
            if (editData.type === 'ticket') {
                setActiveTab('ticket')
                setTtData({
                    name: editData.name || '',
                    price: (editData.price || 0) / 100,
                    quantity: editData.quantity || 0,
                    group_id: editData.group_id || ''
                })
            } else if (editData.type === 'group') {
                setActiveTab('group')
                setTgName(editData.name || '')
            }
        } else if (isOpen) {
            // Reset for create
            setTtData({ name: '', price: 0, quantity: 100, group_id: '' })
            setTgName('')
        }
    }, [isOpen, editData])

    if (!isOpen || !event) return null

    const handleTicketAction = async (e) => {
        e.preventDefault()
        setLoading(true); setError('')
        try {
            if (isEdit) {
                await api.post(`/api/tt/${client_id}/events/${event.id}/ticket_types/${editData.id}`, ttData)
                if (onCreated) onCreated(`Ticket "${ttData.name}" has been updated successfully.`)
            } else {
                await api.post(`/api/tt/${client_id}/events/${event.id}/ticket_types`, ttData)
                if (onCreated) onCreated(`New ticket "${ttData.name}" has been created.`)
            }
            onClose()
        } catch (err) {
            setError(err.response?.data?.detail || `Failed to ${isEdit ? 'update' : 'create'} ticket`)
        } finally {
            setLoading(false)
        }
    }

    const handleGroupAction = async (e) => {
        e.preventDefault()
        setLoading(true); setError('')
        try {
            if (isEdit) {
                await api.post(`/api/tt/${client_id}/events/${event.id}/ticket_groups/${editData.id}`, { name: tgName })
                if (onCreated) onCreated(`Group "${tgName}" has been updated.`)
            } else {
                await api.post(`/api/tt/${client_id}/events/${event.id}/ticket_groups`, { name: tgName })
                if (onCreated) onCreated(`New group "${tgName}" has been created.`)
            }
            setTgName('')
            onClose()
        } catch (err) {
            setError(err.response?.data?.detail || `Failed to ${isEdit ? 'update' : 'create'} group`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="card w-full max-w-lg bg-[#11131f] border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-tight">
                            {isEdit ? 'Edit Resource' : 'Manage Resources'}
                        </h2>
                        <p className="text-xs text-white/40">{event.name}</p>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                {!isEdit && (
                    <div className="flex border-b border-white/5">
                        <button
                            onClick={() => setActiveTab('ticket')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'ticket' ? 'text-primary-400 bg-primary-500/10 border-b-2 border-primary-500' : 'text-white/30 hover:text-white/50'}`}
                        >
                            <Ticket size={16} /> New Ticket
                        </button>
                        <button
                            onClick={() => setActiveTab('group')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'group' ? 'text-primary-400 bg-primary-500/10 border-b-2 border-primary-500' : 'text-white/30 hover:text-white/50'}`}
                        >
                            <Layers size={16} /> New Group
                        </button>
                    </div>
                )}

                <div className="p-6">
                    {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-2"><AlertCircle size={16} />{error}</div>}

                    {activeTab === 'ticket' ? (
                        <form onSubmit={handleTicketAction} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Ticket Name</label>
                                <input
                                    required
                                    className="input-field"
                                    placeholder="e.g. Early Bird"
                                    value={ttData.name}
                                    onChange={e => setTtData({ ...ttData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Price (£)</label>
                                    <input required type="number" step="0.01" className="input-field" value={ttData.price} onChange={e => setTtData({ ...ttData, price: parseFloat(e.target.value) })} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Quantity</label>
                                    <input required type="number" className="input-field" value={ttData.quantity} onChange={e => setTtData({ ...ttData, quantity: parseInt(e.target.value) })} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Group (Optional)</label>
                                {groups && groups.length > 0 ? (
                                    <select
                                        className="input-field cursor-pointer"
                                        value={ttData.group_id}
                                        onChange={e => setTtData({ ...ttData, group_id: e.target.value })}
                                    >
                                        <option value="" className="bg-[#11131f] text-white/50 italic">Assign to a Group...</option>
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id} className="bg-[#11131f] text-white">
                                                {g.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] text-white/20 italic text-center">
                                        No groups created yet. You can create one in the next tab.
                                    </div>
                                )}
                            </div>
                            <button disabled={loading} className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 mt-4 transition-all active:scale-95 shadow-lg shadow-primary-500/20">
                                {loading ? <div className="animate-spin h-4 w-4 rounded-full border-b-2 border-white" /> : isEdit ? <Save size={18} /> : <Plus size={18} />}
                                {isEdit ? 'Update Ticket' : 'Add Ticket'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleGroupAction} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Group</label>
                                <input
                                    required
                                    className="input-field"
                                    placeholder="e.g. Reserved Seating"
                                    value={tgName}
                                    onChange={e => setTgName(e.target.value)}
                                />
                            </div>
                            <button disabled={loading} className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary-500/20">
                                {loading ? <div className="animate-spin h-4 w-4 rounded-full border-b-2 border-white" /> : isEdit ? <Save size={18} /> : <Plus size={18} />}
                                {isEdit ? 'Update Group' : 'Create Group'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
