import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import Skeleton from './Skeleton'

/**
 * A dropdown selector for clients.
 *
 * Props:
 *   clients    – array of client objects
 *   selectedId – currently selected client id (string | number)
 *   onSelect   – fn(clientId: string)
 *   loading    – show skeleton while fetching
 */
export default function ClientPillBar({ clients = [], selectedId, onSelect, loading = false }) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (loading) {
        return <Skeleton className="h-[42px] w-full rounded-lg" />
    }

    if (clients.length === 0) {
        return <p className="text-gray-400 dark:text-white/30 text-sm">No clients found.</p>
    }

    const selectedClient = clients.find(c => c.id.toString() === selectedId?.toString())

    const getHost = (client) => {
        return client?.domain_name
            ?.replace(/^https?:\/\//, '')
            ?.replace(/\/$/, '')
            ?.split('.')[0] ?? ''
    }

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-[42px] flex items-center justify-between gap-2 px-3 rounded-lg bg-white dark:bg-zinc-800 border border-[#E2E5E9] dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                type="button"
            >
                <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                    {selectedClient ? (
                        <>
                            <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold bg-[#f5f5f5] dark:bg-zinc-700 text-[#0a0a0a] dark:text-white">
                                {selectedClient.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col items-start leading-tight overflow-hidden pt-0.5">
                                <span className="text-sm font-semibold text-[#111827] dark:text-zinc-100 truncate w-full text-left">{selectedClient.name}</span>
                            </div>
                        </>
                    ) : (
                        <span className="text-sm font-medium text-[#6B7280] dark:text-zinc-400">Select a client...</span>
                    )}
                </div>
                <ChevronDown size={14} className={`text-zinc-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-full mt-1 w-full max-h-64 overflow-y-auto bg-white dark:bg-[#1f1f23] border border-[#E2E5E9] dark:border-zinc-700 rounded-lg shadow-lg z-[100] py-1 custom-scrollbar">
                    {clients.map(client => {
                        const isActive = selectedId?.toString() === client.id?.toString()
                        return (
                            <button
                                key={client.id}
                                onClick={() => {
                                    onSelect(client.id.toString())
                                    setIsOpen(false)
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all duration-200 border
                                    ${isActive
                                        ? 'bg-white shadow-sm dark:bg-zinc-800 border-black dark:border-zinc-100 rounded-lg text-[#111827] dark:text-white my-1'
                                        : 'bg-transparent border-transparent hover:bg-[#F9FAFB] dark:hover:bg-zinc-800/50 rounded-lg'
                                    }`}
                            >
                                <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors
                                    ${isActive ? 'bg-[#e5e7eb] dark:bg-zinc-700 text-[#0a0a0a] dark:text-white' : 'bg-[#f5f5f5] dark:bg-zinc-800/80 text-gray-500 dark:text-zinc-400'}`}>
                                    {client.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 flex flex-col items-start leading-tight overflow-hidden">
                                    <span className={`text-sm truncate w-full ${isActive ? 'font-semibold text-[#111827] dark:text-zinc-100' : 'font-medium text-[#4B5563] dark:text-zinc-300'}`}>
                                        {client.name}
                                    </span>
                                    <span className={`text-[10px] font-mono truncate w-full ${isActive ? 'text-[#6B7280] dark:text-zinc-400' : 'text-[#9CA3AF] dark:text-zinc-500'}`}>
                                        {getHost(client)}
                                    </span>
                                </div>
                                {isActive && <Check size={14} className="text-[#111827] dark:text-zinc-100 flex-shrink-0" />}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
