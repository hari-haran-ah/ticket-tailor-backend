import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check, Globe } from 'lucide-react'

export default function ClientSelector({ clients, selectedId, onSelect, placeholder = "Select a client...", icon: Icon }) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const containerRef = useRef(null)

    const selectedClient = clients.find(c => c.id?.toString() === selectedId?.toString())

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.domain_name.toLowerCase().includes(search.toLowerCase())
    )

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white dark:bg-dark-950 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3 min-h-[48px] text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-white/50 transition-all duration-200"
            >
                <div className="flex items-center gap-3 overflow-hidden pointer-events-none">
                    {Icon && <Icon size={18} className="text-black dark:text-white" />}
                    <span className={`truncate ${!selectedClient ? 'text-gray-400 dark:text-white/30 text-sm' : 'font-semibold text-sm'}`}>
                        {selectedClient ? selectedClient.name : placeholder}
                    </span>
                </div>
                <ChevronDown size={16} className={`text-gray-400 dark:text-white/30 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-[99999] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                >
                    <div className="p-2 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-dark-950/50">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/20" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search clients..."
                                className="w-full bg-white dark:bg-white/5 border-none rounded-lg py-2 pl-9 pr-3 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-gray-400 dark:focus:ring-white/50 placeholder-gray-400 dark:placeholder-white/20"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                        {filteredClients.length > 0 ? (
                            <div className="p-1">
                                {filteredClients.map(client => (
                                    <div
                                        key={client.id}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            onSelect(client.id);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className={`px-3 py-2.5 rounded-lg cursor-pointer transition-all flex items-center justify-between group ${selectedId?.toString() === client.id.toString()
                                            ? 'bg-black dark:bg-white text-white dark:text-black'
                                            : 'text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                            }`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{client.name}</span>
                                            <span className={`text-[10px] font-mono mt-0.5 ${selectedId?.toString() === client.id.toString() ? 'text-white/60 dark:text-black/60' : 'text-gray-400 dark:text-white/20'}`}>
                                                {client.domain_name}
                                            </span>
                                        </div>
                                        {selectedId?.toString() === client.id.toString() && <Check size={14} className="text-white dark:text-black" />}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center">
                                <Search size={24} className="mx-auto mb-2 text-gray-200 dark:text-white/5" />
                                <p className="text-xs text-gray-400 dark:text-white/20">No matching clients</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
