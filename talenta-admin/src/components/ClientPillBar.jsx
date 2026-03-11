import Skeleton from './Skeleton'

/**
 * A horizontal scrollable bar of clickable client pills.
 * Desktop: wraps to multiple lines.
 * Mobile: single scrollable row.
 *
 * Props:
 *   clients    – array of client objects
 *   selectedId – currently selected client id (string | number)
 *   onSelect   – fn(clientId: string)
 *   loading    – show skeleton pills while fetching
 */
export default function ClientPillBar({ clients = [], selectedId, onSelect, loading = false }) {
    if (loading) {
        return (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-32 flex-shrink-0 rounded-2xl" />
                ))}
            </div>
        )
    }

    if (clients.length === 0) {
        return <p className="text-white/30 text-sm">No active clients found.</p>
    }

    return (
        /* scrollable-x on mobile, wrap on desktop */
        <div
            className="flex items-center gap-3 overflow-x-auto md:flex-wrap pb-1 md:pb-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
            {clients.map(client => {
                const isActive = selectedId?.toString() === client.id?.toString()
                const host = client.domain_name
                    ?.replace(/^https?:\/\//, '')
                    ?.replace(/\/$/, '')
                    ?.split('.')[0] ?? ''

                return (
                    <button
                        key={client.id}
                        onClick={() => onSelect(client.id.toString())}
                        className={`group flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border transition-all duration-200 text-left flex-shrink-0
                            ${isActive
                                ? 'bg-primary-600 border-primary-500 shadow-lg shadow-primary-600/25 text-white'
                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20 hover:text-white'
                            }`}
                    >
                        {/* Initial avatar */}
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors
                            ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40 group-hover:bg-white/15'}`}>
                            {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                            <span className="text-sm font-semibold whitespace-nowrap">{client.name}</span>
                            <span className={`text-[10px] font-mono whitespace-nowrap transition-colors
                                ${isActive ? 'text-white/60' : 'text-white/25 group-hover:text-white/40'}`}>
                                {host}
                            </span>
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
