import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import {
    ArrowLeft, CalendarDays, MapPin, Ticket, Clock,
    Users, AlertCircle, Lock, ChevronRight, ShieldCheck,
    Minus, Plus, Zap, ChevronDown
} from 'lucide-react'
import { useRef } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function EventDetailPage() {
    const { eventId } = useParams()
    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedTickets, setSelectedTickets] = useState({})

    // For scroll-down indicator
    const descriptionRef = useRef(null)
    const [showScrollIndicator, setShowScrollIndicator] = useState(false)

    const handleQuantityChange = (ttId, delta, available) => {
        setSelectedTickets(prev => {
            const current = prev[ttId] || 0;
            const maxAllowed = Math.min(10, available);
            const next = Math.max(0, Math.min(maxAllowed, current + delta));
            if (next === 0) {
                const copy = { ...prev };
                delete copy[ttId];
                return copy;
            }
            return { ...prev, [ttId]: next };
        });
    }

    useEffect(() => {
        axios.get(`${API}/api/site/events/${eventId}`)
            .then(({ data }) => setEvent(data))
            .catch(() => setError('Event not found.'))
            .finally(() => setLoading(false))
    }, [eventId])

    // Scroll indicator check
    useEffect(() => {
        const checkScroll = () => {
            if (descriptionRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = descriptionRef.current
                // Allow a small buffer (5px)
                setShowScrollIndicator(scrollHeight > clientHeight + scrollTop + 5)
            }
        }

        if (!loading && event?.description) {
            // Initial check after render
            setTimeout(checkScroll, 100)
            const ref = descriptionRef.current
            if (ref) {
                ref.addEventListener('scroll', checkScroll)
                window.addEventListener('resize', checkScroll)
                return () => {
                    ref.removeEventListener('scroll', checkScroll)
                    window.removeEventListener('resize', checkScroll)
                }
            }
        }
    }, [loading, event?.description])

    const scrollToBottom = () => {
        if (descriptionRef.current) {
            descriptionRef.current.scrollTo({
                top: descriptionRef.current.scrollHeight,
                behavior: 'smooth'
            })
        }
    }

    if (loading) return (
        <div className="min-h-screen animate-pulse space-y-0" style={{ color: 'var(--app-text)' }}>
            {/* Hero Skeleton */}
            <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 space-y-8">
                <div className="w-24 h-4 rounded bg-zinc-800/50 skeleton-shimmer" />
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="w-20 h-6 rounded-full bg-zinc-800/50 skeleton-shimmer" />
                        <div className="w-32 h-6 rounded bg-zinc-800/50 skeleton-shimmer" />
                    </div>
                    <div className="w-3/4 h-12 md:h-16 rounded bg-zinc-800/50 skeleton-shimmer" />
                    <div className="flex gap-5">
                        <div className="w-40 h-5 rounded bg-zinc-800/50 skeleton-shimmer" />
                        <div className="w-24 h-5 rounded bg-zinc-800/50 skeleton-shimmer" />
                    </div>
                </div>
            </div>

            {/* Content Grid Skeleton */}
            <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-12">
                    {/* Tickets Skeleton */}
                    <div className="space-y-5">
                        <div className="w-24 h-4 rounded bg-zinc-800/50 skeleton-shimmer" />
                        <div className="w-48 h-8 rounded bg-zinc-800/50 skeleton-shimmer" />
                        <div className="space-y-3">
                            {[1, 2].map(i => (
                                <div key={i} className="h-32 rounded-2xl bg-zinc-900/50 border border-white/5 skeleton-shimmer" />
                            ))}
                        </div>
                    </div>
                </div>
                {/* Sidebar Skeleton */}
                <div className="space-y-5">
                    <div className="h-64 rounded-2xl bg-zinc-900/50 border border-white/5 skeleton-shimmer" />
                    <div className="h-48 rounded-2xl bg-zinc-900/50 border border-white/5 skeleton-shimmer" />
                </div>
            </div>
        </div>
    )

    if (error || !event) return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-5 text-center px-4 animate-fade-up">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center">
                <AlertCircle size={28} style={{ color: 'var(--app-text-faint)' }} />
            </div>
            <div>
                <h1 className="text-2xl font-extrabold text-white mb-2">Event Not Found</h1>
                <p className="text-sm" style={{ color: 'var(--app-text-muted)' }}>
                    The event you're looking for doesn't exist or has been removed.
                </p>
            </div>
            <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ color: 'rgb(234,179,8)', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.15)' }}
            >
                <ArrowLeft size={14} /> Back to Events
            </Link>
        </div>
    )

    const totalSold = event.total_issued_tickets || 0
    const totalCapacity = (event.ticket_types || []).reduce((s, t) => s + (t.quantity || 0), 0)
    const percentTotal = totalCapacity > 0 ? Math.min(100, (totalSold / totalCapacity) * 100) : 0

    const formatEventDate = (start) => {
        if (!start?.date) return { date: 'TBA', time: '' }
        const d = new Date(start.date)
        return {
            date: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
            time: start.time || ''
        }
    }

    const { date: eventDate, time: eventTime } = formatEventDate(event.start)

    const totalSelectedCount = Object.values(selectedTickets).reduce((a, b) => a + b, 0)
    const totalSelectedPrice = Object.entries(selectedTickets).reduce((acc, [id, qty]) => {
        const t = event.ticket_types?.find(x => x.id === id)
        return acc + (t ? (t.price || 0) * qty : 0)
    }, 0)

    return (
        <div style={{ color: 'var(--app-text)' }} className="animate-fade-up">

            {/* ── Hero Header ─────────────────────────────────────────── */}
            <div
                className="relative overflow-hidden"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
                {/* Ambient brand glow */}
                <div
                    className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(234,179,8,0.05) 0%, transparent 70%)' }}
                />

                <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 relative z-10">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-xs font-semibold mb-8 transition-colors group"
                        style={{ color: 'var(--app-text-muted)' }}
                    >
                        <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
                        Back to Events
                    </Link>

                    <div className="space-y-4 animate-fade-up">
                        <div className="flex flex-wrap items-center gap-3">
                            <span
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                                style={{ background: 'rgba(234,179,8,0.12)', color: 'rgb(234,179,8)', border: '1px solid rgba(234,179,8,0.2)' }}
                            >
                                <Zap size={9} fill="currentColor" />
                                {event.status}
                            </span>
                            {event.venue?.name && (
                                <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--app-text-muted)' }}>
                                    <MapPin size={12} style={{ color: 'rgba(234,179,8,0.6)' }} />
                                    {event.venue.name}
                                    {event.venue.city && ` · ${event.venue.city}`}
                                </span>
                            )}
                        </div>

                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.05]">
                            {event.name}
                        </h1>

                        <div className="flex flex-wrap items-center gap-5 text-sm" style={{ color: 'var(--app-text-muted)' }}>
                            <span className="flex items-center gap-2">
                                <CalendarDays size={15} style={{ color: 'rgba(234,179,8,0.6)' }} />
                                {eventDate}
                            </span>
                            {eventTime && (
                                <span className="flex items-center gap-2">
                                    <Clock size={15} style={{ color: 'rgba(234,179,8,0.6)' }} />
                                    {eventTime}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Content Grid ──────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-10">

                {/* ── Main Column ───────────────────────────────────── */}
                <div className="lg:col-span-2 space-y-12 animate-fade-up-delay-1">

                    {/* Ticket Types */}
                    {event.ticket_types?.length > 0 && (
                        <div className="space-y-5">
                            <div>
                                <p
                                    className="text-[10px] font-black uppercase tracking-[0.2em] mb-2"
                                    style={{ color: 'rgb(234,179,8)', opacity: 0.8 }}
                                >
                                    Tickets
                                </p>
                                <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-3">
                                    <span className="w-1 h-6 rounded-full" style={{ background: 'rgb(234,179,8)' }} />
                                    Choose Your Ticket
                                </h2>
                            </div>

                            <div className="space-y-3">
                                {event.ticket_types.map((tt) => {
                                    const capacity = tt.quantity || 0
                                    const sold = tt.quantity_sold || 0
                                    const available = tt.quantity_available != null
                                        ? tt.quantity_available
                                        : Math.max(0, capacity - sold)
                                    const percent = capacity > 0 ? Math.min(100, (sold / capacity) * 100) : 0
                                    const isLow = available > 0 && available <= 10
                                    const isSoldOut = available <= 0 && capacity > 0
                                    const qty = selectedTickets[tt.id] || 0
                                    const isSelected = qty > 0

                                    return (
                                        <div
                                            key={tt.id}
                                            className="rounded-2xl overflow-hidden transition-all duration-300"
                                            style={{
                                                background: isSelected
                                                    ? 'linear-gradient(135deg, rgba(234,179,8,0.06) 0%, rgba(20,20,22,0.95) 100%)'
                                                    : 'rgba(255,255,255,0.02)',
                                                border: isSelected
                                                    ? '1px solid rgba(234,179,8,0.25)'
                                                    : '1px solid rgba(255,255,255,0.06)',
                                                boxShadow: isSelected ? '0 4px 20px rgba(234,179,8,0.08)' : 'none'
                                            }}
                                        >
                                            <div className="p-5">
                                                <div className="flex items-start justify-between gap-4">
                                                    {/* Left: Name + badges */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-white text-base tracking-tight mb-2">
                                                            {tt.name}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {isSoldOut ? (
                                                                <span
                                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                                                                    style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                                                                >
                                                                    Sold Out
                                                                </span>
                                                            ) : sold === 0 ? (
                                                                <span
                                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                                                                    style={{ background: 'rgba(234,179,8,0.1)', color: 'rgb(234,179,8)', border: '1px solid rgba(234,179,8,0.2)' }}
                                                                >
                                                                    New
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px]" style={{ color: 'var(--app-text-faint)' }}>
                                                                    {sold} booked
                                                                </span>
                                                            )}
                                                            {available > 0 && (
                                                                <span
                                                                    className="text-[11px] font-semibold"
                                                                    style={{ color: isLow ? '#fbbf24' : 'var(--app-text-faint)' }}
                                                                >
                                                                    {isLow ? `⚡ Only ${available} left!` : `${available} available`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Right: Price + Stepper */}
                                                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                                                        <p
                                                            className="text-2xl font-black tracking-tight"
                                                            style={{ color: tt.price > 0 ? 'var(--app-text)' : '#10b981' }}
                                                        >
                                                            {tt.price > 0 ? `£${(tt.price / 100).toFixed(2)}` : 'FREE'}
                                                        </p>

                                                        {available > 0 && (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleQuantityChange(tt.id, -1, available)}
                                                                    disabled={qty === 0}
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-30"
                                                                    style={{
                                                                        background: qty > 0 ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.04)',
                                                                        border: qty > 0 ? '1px solid rgba(234,179,8,0.3)' : '1px solid rgba(255,255,255,0.08)',
                                                                        color: qty > 0 ? 'rgb(234,179,8)' : 'var(--app-text-muted)'
                                                                    }}
                                                                >
                                                                    <Minus size={13} />
                                                                </button>

                                                                <span
                                                                    className="font-black text-base w-7 text-center"
                                                                    style={{ color: qty > 0 ? 'rgb(234,179,8)' : 'var(--app-text-muted)' }}
                                                                >
                                                                    {qty}
                                                                </span>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleQuantityChange(tt.id, 1, available)}
                                                                    disabled={qty >= Math.min(10, available)}
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-30"
                                                                    style={{
                                                                        background: 'rgba(234,179,8,0.15)',
                                                                        border: '1px solid rgba(234,179,8,0.3)',
                                                                        color: 'rgb(234,179,8)'
                                                                    }}
                                                                >
                                                                    <Plus size={13} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Progress bar */}
                                                {capacity > 0 && (
                                                    <div className="mt-4 h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                                        <div
                                                            className="h-full rounded-full transition-all duration-1000"
                                                            style={{
                                                                width: `${Math.max(1, percent)}%`,
                                                                background: isSoldOut
                                                                    ? '#ef4444'
                                                                    : 'linear-gradient(90deg, rgb(234,179,8), rgb(250,204,21))'
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {event.description && (
                        <div className="space-y-5">
                            <div>
                                <p
                                    className="text-[10px] font-black uppercase tracking-[0.2em] mb-2"
                                    style={{ color: 'rgba(255,255,255,0.3)' }}
                                >
                                    About
                                </p>
                                <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-3">
                                    <span className="w-1 h-6 rounded-full bg-zinc-700" />
                                    Event Details
                                </h2>
                            </div>
                            <div className="relative group/desc">
                                <div
                                    ref={descriptionRef}
                                    className="description-content text-base leading-relaxed max-h-[400px] overflow-y-auto pr-4 custom-scrollbar"
                                    style={{
                                        whiteSpace: 'pre-line',
                                        scrollBehavior: 'smooth'
                                    }}
                                    dangerouslySetInnerHTML={{
                                        __html: event.description.replace(/•([^\s\n])/g, '\n• $1')
                                    }}
                                />

                                {showScrollIndicator && (
                                    <button
                                        onClick={scrollToBottom}
                                        className="absolute bottom-4 right-8 w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all duration-300 shadow-2xl animate-bounce"
                                        title="Scroll to bottom"
                                    >
                                        <ChevronDown size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Sidebar ─────────────────────────────────────────── */}
                <div className="space-y-5 animate-fade-up-delay-2 lg:sticky lg:top-20 self-start">

                    {/* Event Info card */}
                    <div
                        className="rounded-2xl p-6 space-y-6"
                        style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            backdropFilter: 'blur(20px)'
                        }}
                    >
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5"
                                style={{ color: 'rgb(234,179,8)', opacity: 0.8 }}>Date & Time</p>
                            <p className="text-base font-bold text-white leading-snug">{eventDate}</p>
                            {eventTime && <p className="text-sm mt-1" style={{ color: 'var(--app-text-muted)' }}>{eventTime}</p>}
                        </div>

                        <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5"
                                style={{ color: 'rgb(234,179,8)', opacity: 0.8 }}>Venue</p>
                            <p className="text-base font-bold text-white leading-snug">{event.venue?.name || 'TBA'}</p>
                            {event.venue?.city && <p className="text-sm mt-1" style={{ color: 'var(--app-text-muted)' }}>{event.venue.city}</p>}
                        </div>

                        {totalCapacity > 0 && (
                            <>
                                <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1"
                                                style={{ color: 'rgb(234,179,8)', opacity: 0.8 }}>Attendance</p>
                                            {totalSold === 0 ? (
                                                <p className="text-sm font-semibold" style={{ color: 'rgb(234,179,8)' }}>Be the first!</p>
                                            ) : (
                                                <p className="text-xl font-extrabold text-white">
                                                    {totalSold}
                                                    <span className="text-sm font-normal ml-1" style={{ color: 'var(--app-text-muted)' }}>
                                                        / {totalCapacity}
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                        <div
                                            className="w-11 h-11 rounded-xl flex items-center justify-center"
                                            style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.15)' }}
                                        >
                                            <Users size={20} style={{ color: 'rgb(234,179,8)' }} />
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                        <div
                                            className="h-full rounded-full transition-all duration-1000"
                                            style={{
                                                width: `${Math.max(2, percentTotal)}%`,
                                                background: 'linear-gradient(90deg, rgb(234,179,8), rgb(250,204,21))'
                                            }}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ── CTA Card ─────────────────────────────────────── */}
                    <div
                        className="rounded-2xl overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, rgba(20,20,22,0.98) 0%, rgba(12,12,14,1) 100%)',
                            border: '1px solid rgba(234,179,8,0.15)',
                            boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 60px rgba(234,179,8,0.04)'
                        }}
                    >
                        <div className="p-6 space-y-5">
                            {/* Header */}
                            <div className="text-center">
                                <p
                                    className="text-[10px] font-black uppercase tracking-[0.22em] mb-2"
                                    style={{ color: 'rgb(234,179,8)', opacity: 0.85 }}
                                >
                                    Ready?
                                </p>
                                <p className="text-white text-xl font-extrabold tracking-tight leading-snug">
                                    Get Your Tickets Now
                                </p>
                            </div>

                            {event.ticket_types?.length > 0 ? (
                                <>
                                    {totalSelectedCount > 0 ? (
                                        <div className="space-y-3">
                                            {/* Summary row */}
                                            <div
                                                className="flex justify-between items-center px-4 py-3 rounded-xl"
                                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                            >
                                                <span className="text-sm font-semibold" style={{ color: 'var(--app-text-muted)' }}>
                                                    {totalSelectedCount} ticket{totalSelectedCount !== 1 ? 's' : ''}
                                                </span>
                                                <span className="text-lg font-black text-white">
                                                    £{(totalSelectedPrice / 100).toFixed(2)}
                                                </span>
                                            </div>

                                            {/* Checkout button — CENTERED */}
                                            <Link
                                                to={`/checkout?eventId=${eventId}&tickets=${encodeURIComponent(JSON.stringify(selectedTickets))}`}
                                                className="relative flex items-center justify-center w-full rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                                                style={{
                                                    height: '3.25rem',
                                                    background: 'linear-gradient(135deg, rgb(234,179,8) 0%, rgb(202,138,4) 100%)',
                                                    color: '#000',
                                                    boxShadow: '0 8px 30px rgba(234,179,8,0.3), 0 2px 8px rgba(0,0,0,0.3)',
                                                    letterSpacing: '0.05em'
                                                }}
                                            >
                                                <Lock size={13} className="absolute left-5 opacity-60" />
                                                <span>Proceed to Checkout</span>
                                                <ChevronRight size={13} className="absolute right-5 opacity-60" />
                                            </Link>
                                        </div>
                                    ) : (
                                        <div
                                            className="py-5 px-4 rounded-2xl text-center"
                                            style={{
                                                background: 'rgba(255,255,255,0.02)',
                                                border: '1px dashed rgba(255,255,255,0.08)'
                                            }}
                                        >
                                            <Ticket size={20} className="mx-auto mb-2" style={{ color: 'rgba(234,179,8,0.35)' }} />
                                            <p className="text-xs font-medium" style={{ color: 'var(--app-text-muted)' }}>
                                                Select tickets above to continue
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div
                                    className="py-5 px-4 rounded-2xl text-center"
                                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                                >
                                    <p className="text-xs font-medium" style={{ color: 'var(--app-text-faint)' }}>
                                        Booking opens soon
                                    </p>
                                </div>
                            )}

                            {/* Secure badge */}
                            <div className="flex items-center justify-center gap-1.5 pt-1">
                                <ShieldCheck size={12} className="text-green-400" />
                                <p className="text-[11px] font-medium" style={{ color: 'var(--app-text-faint)' }}>
                                    Secure checkout via Stripe
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
