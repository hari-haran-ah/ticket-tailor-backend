import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
    CalendarDays, MapPin, Clock, Search,
    ArrowRight, Ticket, ChevronDown,
    Target, Users, Zap, Shield
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function HomePage() {
    const [events, setEvents] = useState([])
    const [clientName, setClientName] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const eventsRef = useRef(null)

    useEffect(() => {
        axios.get(`${API}/api/site/events`)
            .then(({ data }) => {
                setEvents(data.data || [])
                if (data.client_name) setClientName(data.client_name)
            })
            .catch(() => setError('Failed to load events. Please try again.'))
            .finally(() => setLoading(false))
    }, [])

    const filtered = events.filter(ev =>
        ev.name?.toLowerCase().includes(search.toLowerCase())
    )

    const featured = events[0]

    const formatDate = (dateStr) => {
        if (!dateStr) return null
        const d = new Date(dateStr)
        return {
            day: d.toLocaleDateString('en-GB', { day: 'numeric' }),
            month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
            full: d.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
        }
    }

    const getLowestPrice = (ticketTypes) => {
        if (!ticketTypes?.length) return null
        const prices = ticketTypes.map(t => t.price || 0).filter(p => p >= 0)
        const min = Math.min(...prices)
        return min === 0 ? 'Free' : `£${(min / 100).toFixed(2)}`
    }

    const brand = `rgb(var(--brand-r),var(--brand-g),var(--brand-b))`
    const brandA = (a) => `rgba(var(--brand-r),var(--brand-g),var(--brand-b),${a})`

    return (
        <div style={{ backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' }}>

            {/* ══════════════════════════════════════════════
                HERO — Clean, no blobs, brand gradient stripe
            ══════════════════════════════════════════════ */}
            <section
                className="relative overflow-hidden"
                style={{
                    borderBottom: `1px solid var(--app-border)`,
                    background: `linear-gradient(180deg, ${brandA(0.06)} 0%, ${brandA(0)} 100%)`,
                }}
            >
                {/* Thin brand top line */}
                <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${brandA(0)}, ${brand}, ${brandA(0)})` }} />

                <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
                    {/* Brand pill */}
                    <div
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-8"
                        style={{
                            background: brandA(0.1),
                            border: `1px solid ${brandA(0.25)}`,
                            color: brand,
                        }}
                    >
                        <Zap size={11} fill="currentColor" />
                        {clientName || 'Welcome'}
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-5" style={{ color: 'var(--app-text)', lineHeight: 1.08 }}>
                        Find Your Next<br />
                        <span style={{ color: brand }}>Adventure</span>
                    </h1>

                    <p className="text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: 'var(--app-text-muted)' }}>
                        Premium off-road experiences, recovery workshops, and adventure events — all in one place.
                    </p>

                    <button
                        onClick={() => eventsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                        className="inline-flex items-center gap-2 font-bold text-sm px-7 py-3.5 rounded-xl transition-all"
                        style={{ background: brand, color: 'var(--app-bg)' }}
                    >
                        Browse Events <ChevronDown size={16} />
                    </button>
                </div>
            </section>

            {/* ══════════════════════════════════════════════
                ABOUT — Shootah Company
            ══════════════════════════════════════════════ */}
            <section
                className="py-16 md:py-20"
                style={{ borderBottom: `1px solid var(--app-border)` }}
            >
                <div className="max-w-6xl mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Left — copy */}
                        <div>
                            <p className="section-label mb-3">Who We Are</p>
                            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-5" style={{ color: 'var(--app-text)' }}>
                                Built for Off-Road<br />
                                <span style={{ color: brand }}>Enthusiasts</span>
                            </h2>
                            <p className="leading-relaxed mb-4" style={{ color: 'var(--app-text-muted)' }}>
                                {clientName || 'Shootah'} delivers world-class off-road events, recovery classes,
                                and adventure workshops designed for every skill level — from first-timers to seasoned trail veterans.
                            </p>
                            <p className="leading-relaxed" style={{ color: 'var(--app-text-muted)' }}>
                                Our certified instructors bring years of field experience to teach you the skills that matter when you're miles from help — vehicle recovery, terrain navigation, and emergency preparedness.
                            </p>
                        </div>

                        {/* Right — stat cards */}
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { icon: <Users size={22} />, stat: '2,000+', label: 'Participants Trained' },
                                { icon: <Target size={22} />, stat: '50+', label: 'Events Run' },
                                { icon: <Shield size={22} />, stat: '100%', label: 'Safety Record' },
                                { icon: <Zap size={22} />, stat: '10+ yrs', label: 'Industry Experience' },
                            ].map(({ icon, stat, label }) => (
                                <div
                                    key={label}
                                    className="rounded-2xl p-5"
                                    style={{
                                        backgroundColor: 'var(--app-surface)',
                                        border: `1px solid var(--app-border)`,
                                    }}
                                >
                                    <div className="mb-3" style={{ color: brand }}>{icon}</div>
                                    <p className="text-2xl font-black mb-0.5" style={{ color: 'var(--app-text)' }}>{stat}</p>
                                    <p className="text-xs font-medium" style={{ color: 'var(--app-text-muted)' }}>{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════
                FEATURED EVENT
            ══════════════════════════════════════════════ */}
            {!loading && featured && (
                <section
                    className="py-16 md:py-20"
                    style={{ borderBottom: `1px solid var(--app-border)` }}
                >
                    <div className="max-w-6xl mx-auto px-4">
                        <p className="section-label mb-2">Spotlight</p>
                        <h2 className="text-2xl font-black mb-8" style={{ color: 'var(--app-text)' }}>Featured Event</h2>

                        <Link
                            to={`/events/${featured.id}`}
                            className="block rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.01]"
                            style={{
                                background: `linear-gradient(135deg, var(--app-surface) 0%, ${brandA(0.08)} 100%)`,
                                border: `1px solid ${brandA(0.2)}`,
                                boxShadow: `0 8px 40px ${brandA(0.08)}`,
                            }}
                        >
                            <div className="flex flex-col md:flex-row">
                                {/* Date Panel */}
                                <div
                                    className="flex-shrink-0 flex flex-col items-center justify-center p-10 md:w-52"
                                    style={{ background: brandA(0.1), borderRight: `1px solid ${brandA(0.15)}` }}
                                >
                                    {featured.start?.date ? (
                                        <>
                                            <span className="text-7xl font-black leading-none" style={{ color: brand }}>
                                                {formatDate(featured.start.date)?.day}
                                            </span>
                                            <span className="text-sm font-bold tracking-widest uppercase mt-1" style={{ color: 'var(--app-text-muted)' }}>
                                                {formatDate(featured.start.date)?.month}
                                            </span>
                                        </>
                                    ) : (
                                        <CalendarDays size={48} style={{ color: brandA(0.5) }} />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 p-8 flex flex-col justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                                            <span
                                                className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                                                style={{ background: brand, color: 'var(--app-bg)' }}
                                            >
                                                Featured
                                            </span>
                                            <span
                                                className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                                                style={{ background: 'var(--app-surface)', border: `1px solid var(--app-border)`, color: 'var(--app-text-muted)' }}
                                            >
                                                {featured.status}
                                            </span>
                                        </div>

                                        <h3 className="text-2xl md:text-3xl font-black tracking-tight mb-3" style={{ color: 'var(--app-text)' }}>
                                            {featured.name}
                                        </h3>

                                        <div className="flex flex-wrap gap-5 text-sm mb-4" style={{ color: 'var(--app-text-muted)' }}>
                                            {featured.start?.date && (
                                                <span className="flex items-center gap-1.5">
                                                    <Clock size={14} style={{ color: brand }} />
                                                    {formatDate(featured.start.date)?.full}
                                                </span>
                                            )}
                                            {featured.venue?.name && (
                                                <span className="flex items-center gap-1.5">
                                                    <MapPin size={14} style={{ color: brand }} />
                                                    {featured.venue.name}
                                                </span>
                                            )}
                                        </div>

                                        {featured.description && (
                                            <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--app-text-muted)' }}>
                                                {featured.description.replace(/<[^>]+>/g, '')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        {(() => {
                                            const p = getLowestPrice(featured.ticket_types)
                                            return p ? (
                                                <span className="text-2xl font-black" style={{ color: brand }}>
                                                    {p === 'Free' ? 'Free Entry' : `From ${p}`}
                                                </span>
                                            ) : null
                                        })()}
                                        <span
                                            className="inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl"
                                            style={{ background: brand, color: 'var(--app-bg)' }}
                                        >
                                            Get Tickets <ArrowRight size={14} />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                </section>
            )}

            {/* ══════════════════════════════════════════════
                ALL EVENTS GRID
            ══════════════════════════════════════════════ */}
            <section ref={eventsRef} className="py-16 md:py-20">
                <div className="max-w-6xl mx-auto px-4">

                    {loading && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mb-4"
                                style={{ borderColor: brandA(0.3), borderTopColor: brand }} />
                            <p className="text-xs font-semibold" style={{ color: 'var(--app-text-muted)' }}>Loading events...</p>
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-20">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            {/* Header + Search */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                                <div>
                                    <p className="section-label mb-1">Browse</p>
                                    <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--app-text)' }}>
                                        All Events
                                        <span className="ml-2 text-base font-semibold" style={{ color: 'var(--app-text-muted)' }}>
                                            ({filtered.length})
                                        </span>
                                    </h2>
                                </div>
                                <div className="relative w-full sm:w-64">
                                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--app-text-faint)' }} />
                                    <input
                                        type="text"
                                        placeholder="Search events..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                                        style={{
                                            background: 'var(--app-surface)',
                                            border: `1px solid var(--app-border)`,
                                            color: 'var(--app-text)',
                                        }}
                                    />
                                </div>
                            </div>

                            {filtered.length === 0 ? (
                                <div className="text-center py-20 rounded-2xl" style={{ background: 'var(--app-surface)', border: `1px solid var(--app-border)` }}>
                                    <Ticket size={36} className="mx-auto mb-3" style={{ color: 'var(--app-text-faint)' }} />
                                    <p className="font-semibold" style={{ color: 'var(--app-text-muted)' }}>No events found</p>
                                    <p className="text-sm mt-1" style={{ color: 'var(--app-text-faint)' }}>Try adjusting your search</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {filtered.map((ev, idx) => {
                                        const sold = ev.total_issued_tickets || 0
                                        // quantity is the original total (remaining + sold), set by backend
                                        const total = (ev.ticket_types || []).reduce((s, t) => s + (t.quantity || 0), 0)
                                        // For remaining, sum quantity_available from each ticket type
                                        const remaining = (ev.ticket_types || []).reduce(
                                            (s, t) => s + (t.quantity_available != null ? t.quantity_available : Math.max(0, (t.quantity || 0) - (t.quantity_sold || 0))),
                                            0
                                        )
                                        const percent = total > 0 ? Math.min(100, (sold / total) * 100) : 0
                                        const dateInfo = formatDate(ev.start?.date)
                                        const price = getLowestPrice(ev.ticket_types)
                                        const isFeatured = ev.id === events[0]?.id

                                        return (
                                            <Link
                                                key={ev.id}
                                                to={`/events/${ev.id}`}
                                                className="group rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                                                style={{
                                                    background: 'var(--app-surface)',
                                                    border: `1px solid var(--app-border)`,
                                                    boxShadow: isFeatured ? `0 0 0 1px ${brandA(0.3)}` : '',
                                                }}
                                            >
                                                {/* Card Top — Date area */}
                                                <div
                                                    className="relative h-40 flex items-center justify-center"
                                                    style={{ background: brandA(0.05) }}
                                                >
                                                    <CalendarDays
                                                        size={56}
                                                        strokeWidth={0.5}
                                                        style={{ color: brandA(0.12) }}
                                                    />

                                                    {/* Date chip */}
                                                    {dateInfo && (
                                                        <div
                                                            className="absolute top-3 left-3 rounded-lg px-2.5 py-1.5 text-center min-w-[44px]"
                                                            style={{ background: 'var(--app-bg)', border: `1px solid var(--app-border)` }}
                                                        >
                                                            <p className="text-base font-black leading-none" style={{ color: brand }}>{dateInfo.day}</p>
                                                            <p className="text-[9px] font-bold tracking-wider mt-0.5 uppercase" style={{ color: 'var(--app-text-muted)' }}>{dateInfo.month}</p>
                                                        </div>
                                                    )}

                                                    {/* Price badge */}
                                                    {price && (
                                                        <div className="absolute top-3 right-3">
                                                            <span
                                                                className="text-[10px] font-extrabold px-2 py-1 rounded-full"
                                                                style={price === 'Free'
                                                                    ? { background: 'rgba(16,185,129,0.15)', color: '#10b981' }
                                                                    : { background: brand, color: 'var(--app-bg)' }
                                                                }
                                                            >
                                                                {price === 'Free' ? 'FREE' : price}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Status bottom-left */}
                                                    <div className="absolute bottom-3 left-3">
                                                        <span
                                                            className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
                                                            style={{ background: 'var(--app-bg)', border: `1px solid var(--app-border)`, color: 'var(--app-text-muted)' }}
                                                        >
                                                            {ev.status}
                                                        </span>
                                                    </div>

                                                    {/* Featured dot */}
                                                    {isFeatured && (
                                                        <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full animate-pulse" style={{ background: brand }} />
                                                    )}
                                                </div>

                                                {/* Card Body */}
                                                <div className="p-4">
                                                    <h3
                                                        className="font-bold text-base leading-snug mb-2 line-clamp-2 transition-colors"
                                                        style={{ color: 'var(--app-text)' }}
                                                    >
                                                        {ev.name}
                                                    </h3>

                                                    <div className="space-y-1 mb-3">
                                                        {dateInfo && (
                                                            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--app-text-muted)' }}>
                                                                <Clock size={11} style={{ color: brandA(0.7) }} />
                                                                <span>{dateInfo.full}{ev.start?.time ? ` · ${ev.start.time}` : ''}</span>
                                                            </div>
                                                        )}
                                                        {ev.venue?.name && (
                                                            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--app-text-muted)' }}>
                                                                <MapPin size={11} style={{ color: brandA(0.7) }} />
                                                                <span className="line-clamp-1">{ev.venue.name}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Sales progress */}
                                                    {total > 0 && (
                                                        <div className="mb-3">
                                                            <div className="flex justify-between text-[10px] font-semibold mb-1" style={{ color: 'var(--app-text-faint)' }}>
                                                                <span>{sold === 0 ? 'Just launched' : `${sold} sold`}</span>
                                                                <span>{remaining} left</span>
                                                            </div>
                                                            <div className="h-1 w-full rounded-full" style={{ background: 'var(--app-bg)' }}>
                                                                <div
                                                                    className="h-full rounded-full transition-all duration-1000"
                                                                    style={{ width: `${Math.max(2, percent)}%`, background: brand }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div
                                                        className="flex items-center gap-1 text-xs font-semibold transition-all group-hover:gap-2"
                                                        style={{ color: brand }}
                                                    >
                                                        View Details <ArrowRight size={12} />
                                                    </div>
                                                </div>
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>
        </div>
    )
}
