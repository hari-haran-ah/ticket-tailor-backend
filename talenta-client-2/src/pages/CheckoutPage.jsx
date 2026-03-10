import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import {
    Ticket, MapPin, Clock, CalendarDays, ArrowLeft,
    ShieldCheck, AlertCircle, CreditCard, Lock, ChevronRight
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ─── Skeleton Components ────────────────────────────────────────────────────

function SkeletonLine({ width = 'w-full', height = 'h-4', className = '' }) {
    return (
        <div className={`skeleton-shimmer rounded-lg ${width} ${height} ${className}`} />
    )
}

function CheckoutSkeleton() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4">
            <div className="skeleton-shimmer h-8 w-24 rounded-lg mb-10" />
            <div className="skeleton-shimmer h-10 w-48 rounded-xl mb-10" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left form skeleton */}
                <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-8 space-y-6">
                    <SkeletonLine width="w-40" height="h-6" />
                    <div className="space-y-5 pt-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="space-y-2">
                                <SkeletonLine width="w-28" height="h-3" />
                                <SkeletonLine height="h-12" className="rounded-xl" />
                            </div>
                        ))}
                    </div>
                    <SkeletonLine height="h-14" className="rounded-2xl mt-4" />
                </div>
                {/* Right summary skeleton */}
                <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-8 space-y-6">
                    <SkeletonLine width="w-32" height="h-5" />
                    <SkeletonLine height="h-4" />
                    <SkeletonLine width="w-3/4" height="h-4" />
                    <div className="pt-4 space-y-4">
                        <SkeletonLine height="h-16" className="rounded-xl" />
                        <SkeletonLine height="h-16" className="rounded-xl" />
                    </div>
                    <div className="flex justify-between pt-2">
                        <SkeletonLine width="w-16" height="h-5" />
                        <SkeletonLine width="w-24" height="h-5" />
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CheckoutPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const eventId = searchParams.get('eventId')
    const ticketsParam = searchParams.get('tickets')

    const selectedTickets = useMemo(() => {
        if (!ticketsParam) return {};
        try {
            return JSON.parse(ticketsParam);
        } catch (e) {
            console.error('Failed to parse tickets param:', e);
            return {};
        }
    }, [ticketsParam]);

    const [event, setEvent] = useState(null)
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [checkoutError, setCheckoutError] = useState('')
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        if (!eventId || Object.keys(selectedTickets).length === 0) {
            const timer = setTimeout(() => {
                if (!eventId || Object.keys(selectedTickets).length === 0) {
                    navigate('/')
                }
            }, 100);
            return () => clearTimeout(timer);
        }

        axios.get(`${API}/api/site/events/${eventId}`)
            .then(({ data }) => {
                setEvent(data)
                const selected = Object.keys(selectedTickets).map(id => {
                    const t = (data.ticket_types || []).find(x => x.id === id)
                    return t ? { ...t, quantity: selectedTickets[id] } : null
                }).filter(Boolean)

                if (selected.length === 0) {
                    setCheckoutError('Selected tickets not found. They may have been removed.')
                } else {
                    setTickets(selected)
                }
            })
            .catch(() => setCheckoutError('Failed to load event details.'))
            .finally(() => setLoading(false))
    }, [eventId, selectedTickets, navigate])

    const handleCheckout = async (e) => {
        e.preventDefault()
        if (!email) {
            setCheckoutError('Please enter your email address.')
            return
        }

        setProcessing(true)
        setCheckoutError('')

        try {
            const items = tickets.map(t => ({
                ticket_type_id: t.id,
                quantity: selectedTickets[t.id]
            }));

            const { data } = await axios.post(`${API}/api/site/checkout/session`, {
                event_id: eventId,
                items,
                customer_email: email,
                customer_name: name,
                customer_phone: phone
            })

            window.location.href = data.url
        } catch (err) {
            const detail = err.response?.data?.detail;
            let errMsg = 'Failed to initiate checkout. Please try again.';
            if (typeof detail === 'string') {
                errMsg = detail;
            } else if (Array.isArray(detail)) {
                errMsg = detail.map(d => `${d.loc?.[d.loc.length - 1] || 'Field'}: ${d.msg}`).join(', ');
            }
            setCheckoutError(errMsg);
            setProcessing(false)
        }
    }

    // ── Loading State ──────────────────────────────────────────────────────
    if (loading) {
        return <CheckoutSkeleton />
    }

    // ── Error / Unavailable State ──────────────────────────────────────────
    if (!event || tickets.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-4 py-20 min-h-[60vh]">
                <div className="w-full max-w-md text-center">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={36} className="text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold mb-3 text-white">Tickets Unavailable</h1>
                    <p className="text-app-text-muted mb-8 text-sm leading-relaxed">
                        {checkoutError || 'These tickets are no longer available.'}
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                    >
                        <ArrowLeft size={16} />
                        Browse Events
                    </Link>
                </div>
            </div>
        )
    }

    const totalPrice = tickets.reduce((sum, t) => sum + ((t.price || 0) / 100 * selectedTickets[t.id]), 0);
    const d = event.start?.date ? new Date(event.start.date) : null
    const dateStr = d ? d.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : null

    return (
        <div className="max-w-4xl mx-auto py-10 px-4 animate-fade-up">

            {/* ── Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 text-sm text-app-text-muted hover:text-white mb-8 transition-colors group"
            >
                <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-1" />
                Back
            </button>

            {/* ── Page Header */}
            <div className="flex items-end justify-between mb-10 animate-fade-up-delay-1">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-500 opacity-80 mb-2">Step 2 of 2</p>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Complete Your Order</h1>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                    <Lock size={12} className="text-green-400" />
                    <span className="text-xs font-semibold text-green-400">Secure Checkout</span>
                </div>
            </div>

            {/* ── Two-Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-6 lg:gap-10 items-start">

                {/* ─── LEFT: Contact Form ─────────────────────────────── */}
                <div
                    className="checkout-card order-2 md:order-1 animate-fade-up-delay-2"
                    style={{
                        background: 'linear-gradient(135deg, rgba(20,20,22,0.95) 0%, rgba(12,12,14,0.98) 100%)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '1.5rem',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                        padding: '2rem'
                    }}
                >
                    {/* Card Header */}
                    <div className="flex items-center gap-3 mb-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.2)' }}>
                            <CreditCard size={15} style={{ color: 'rgb(234,179,8)' }} />
                        </div>
                        <h2 className="text-base font-bold text-white">Contact Information</h2>
                    </div>

                    {/* Error Banner */}
                    {checkoutError && (
                        <div className="mb-5 p-4 rounded-xl flex items-start gap-3 animate-fade-up"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <AlertCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-red-400 text-sm leading-relaxed">{checkoutError}</p>
                        </div>
                    )}

                    <form onSubmit={handleCheckout} className="space-y-5">

                        {/* Full Name */}
                        <div className="form-group animate-fade-up-delay-3">
                            <label className="checkout-label">
                                Full Name <span style={{ color: 'rgb(234,179,8)' }}>*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Enter your full name"
                                className="checkout-input"
                            />
                        </div>

                        {/* Email */}
                        <div className="form-group animate-fade-up-delay-4">
                            <label className="checkout-label">
                                Email Address <span style={{ color: 'rgb(234,179,8)' }}>*</span>
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="checkout-input"
                            />
                            <p className="mt-1.5 text-[10px] uppercase tracking-wide" style={{ color: 'var(--app-text-faint)' }}>
                                Tickets & receipt will be sent here
                            </p>
                        </div>

                        {/* Phone */}
                        <div className="form-group animate-fade-up-delay-5">
                            <label className="checkout-label">
                                Phone Number <span style={{ color: 'rgb(234,179,8)' }}>*</span>
                            </label>
                            <input
                                type="tel"
                                required
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="+1 (555) 000-0000"
                                className="checkout-input"
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="pt-3">
                            <button
                                type="submit"
                                disabled={processing}
                                className="checkout-pay-btn relative"
                            >
                                {processing ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-black/40 border-t-black animate-spin" />
                                        <span>Processing Payment…</span>
                                    </>
                                ) : (
                                    <>
                                        <Lock size={15} className="absolute left-5 opacity-70" />
                                        <span className="font-black tracking-wide">Pay ${totalPrice.toFixed(2)}</span>
                                        <ChevronRight size={15} className="absolute right-5 opacity-70" />
                                    </>
                                )}
                            </button>

                            <div className="flex items-center justify-center gap-2 mt-4">
                                <ShieldCheck size={13} className="text-green-400" />
                                <p className="text-[11px] text-center" style={{ color: 'var(--app-text-faint)' }}>
                                    Redirected to Stripe for secure payment
                                </p>
                            </div>
                        </div>
                    </form>
                </div>

                {/* ─── RIGHT: Order Summary ────────────────────────────── */}
                <div className="order-1 md:order-2 sticky top-24 animate-fade-up-delay-2">
                    <div
                        style={{
                            background: 'linear-gradient(135deg, rgba(20,20,22,0.95) 0%, rgba(12,12,14,0.98) 100%)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '1.5rem',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Event Snapshot Header */}
                        <div className="relative p-6 overflow-hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            {/* Glow blob */}
                            <div
                                className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
                                style={{ background: 'radial-gradient(circle, rgba(234,179,8,0.12) 0%, transparent 70%)' }}
                            />
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: 'rgb(234,179,8)', opacity: 0.8 }}>
                                Your Event
                            </p>
                            <h3 className="text-lg font-bold text-white mb-4 leading-snug relative z-10">{event.name}</h3>

                            <div className="space-y-2 relative z-10">
                                {dateStr && (
                                    <div className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--app-text-muted)' }}>
                                        <CalendarDays size={13} style={{ color: 'rgb(234,179,8)' }} />
                                        <span>{dateStr}</span>
                                    </div>
                                )}
                                {event.venue?.name && (
                                    <div className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--app-text-muted)' }}>
                                        <MapPin size={13} style={{ color: 'rgb(234,179,8)' }} />
                                        <span>{event.venue.name}</span>
                                    </div>
                                )}
                                {event.start?.time && (
                                    <div className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--app-text-muted)' }}>
                                        <Clock size={13} style={{ color: 'rgb(234,179,8)' }} />
                                        <span>{event.start.time}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Order Breakdown */}
                        <div className="p-6">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--app-text-faint)' }}>
                                Order Summary
                            </p>

                            <div className="space-y-3 mb-5">
                                {tickets.map(t => {
                                    const qty = selectedTickets[t.id];
                                    const price = (t.price || 0) / 100;
                                    return (
                                        <div
                                            key={t.id}
                                            className="flex items-start justify-between gap-3 p-3 rounded-xl"
                                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                                        >
                                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                                <div className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center mt-0.5"
                                                    style={{ background: 'rgba(234,179,8,0.12)' }}>
                                                    <Ticket size={12} style={{ color: 'rgb(234,179,8)' }} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-sm text-white truncate">{t.name}</p>
                                                    <p className="text-xs mt-0.5" style={{ color: 'var(--app-text-muted)' }}>
                                                        ${price.toFixed(2)} × {qty}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-sm text-white flex-shrink-0">
                                                ${(price * qty).toFixed(2)}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Divider */}
                            <div className="h-px w-full mb-4" style={{ background: 'rgba(255,255,255,0.06)' }} />

                            {/* Total */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-white">Total Due</span>
                                <span className="text-2xl font-black" style={{ color: 'rgb(234,179,8)' }}>
                                    ${totalPrice.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
