import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import {
    Ticket, MapPin, Clock, CalendarDays, ArrowLeft,
    ShieldCheck, AlertCircle
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function CheckoutSkeleton() {
    return (
        <div className="max-w-5xl mx-auto py-12 px-6 lg:px-12 animate-pulse">
            <div className="w-24 h-4 bg-app-surface-2 rounded mb-12"></div>
            <div className="flex justify-between items-end mb-10">
                <div className="w-48 h-10 bg-app-surface-2 rounded-xl"></div>
                <div className="w-32 h-8 bg-app-surface-2 rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-7">
                    <div className="h-96 bg-app-surface-2 rounded-[1.5rem] border border-app-border p-8">
                        <div className="w-48 h-6 bg-app-surface-2 rounded mb-8"></div>
                        <div className="space-y-6">
                            <div className="h-14 bg-app-surface-2 rounded-xl"></div>
                            <div className="h-14 bg-app-surface-2 rounded-xl"></div>
                            <div className="h-14 bg-app-surface-2 rounded-xl"></div>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-5">
                    <div className="h-64 bg-app-surface-2 rounded-[1.5rem] border border-app-border p-6"></div>
                </div>
            </div>
        </div>
    )
}

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
                if (detail.includes('Ticket Tailor issuance failed')) {
                    let ttMessage = detail;
                    try {
                        const jsonStrMatch = detail.match(/\{.*\}/);
                        if (jsonStrMatch) {
                            const parsed = JSON.parse(jsonStrMatch[0]);
                            if (parsed.message) {
                                ttMessage = parsed.message;
                            }
                        }
                    } catch (e) { }
                    errMsg = `Organizer configuration issue: We could not issue your ticket. Please contact the event organizer. (${ttMessage})`;
                } else {
                    errMsg = detail;
                }
            } else if (Array.isArray(detail)) {
                errMsg = detail.map(d => `${d.loc?.[d.loc.length - 1] || 'Field'}: ${d.msg}`).join(', ');
            }
            setCheckoutError(errMsg);
            setProcessing(false)
        }
    }

    if (loading) return <CheckoutSkeleton />

    if (!event || tickets.length === 0) {
        return (
            <div className="max-w-md mx-auto py-24 px-6 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100 mx-auto mb-6">
                    <AlertCircle size={32} className="text-red-500" />
                </div>
                <h1 className="font-outfit text-2xl font-bold text-app-text mb-2">Unavailable</h1>
                <p className="text-app-text-muted text-sm mb-8">{checkoutError || 'This ticket is no longer available.'}</p>
                <Link to="/" className="inline-flex items-center gap-2 font-semibold text-sm bg-app-surface border border-app-border text-app-text px-6 py-3 rounded-xl hover:bg-app-surface-2 transition-colors shadow-sm">
                    Return to Directory
                </Link>
            </div>
        )
    }

    const totalPrice = tickets.reduce((sum, t) => sum + ((t.price || 0) / 100 * selectedTickets[t.id]), 0);

    const d = event.start?.date ? new Date(event.start.date) : null
    const dateStr = d ? d.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : null

    return (
        <div className="max-w-4xl mx-auto py-8 px-5 lg:px-8 animate-fade-up bg-app-bg">
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-app-text-muted hover:text-app-text mb-6 transition-colors group">
                <ArrowLeft size={12} className="transition-transform group-hover:-translate-x-1" /> Back
            </button>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-app-border pb-6">
                <div>
                    <h1 className="font-outfit text-2xl md:text-3xl font-bold text-app-text tracking-tight">Checkout</h1>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 flex-shrink-0">
                    <ShieldCheck size={14} className="text-emerald-500" /> Secure SSL
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

                {/* ─── Left Column: Payment Form ─── */}
                <div className="lg:col-span-7 order-2 lg:order-1">
                    <div className="p-5 md:p-6 bg-app-surface border border-app-border shadow-organic rounded-[1.25rem]">
                        <h2 className="font-outfit text-lg font-bold text-app-text mb-5 flex items-center gap-3">
                            <span className="w-5 h-5 rounded bg-brand-600/10 text-brand-600 flex items-center justify-center text-[10px] font-bold border border-brand-400/20">1</span>
                            Your Details
                        </h2>

                        <form onSubmit={handleCheckout}>
                            {checkoutError && (
                                <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs flex items-start gap-2.5">
                                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                    <p className="font-medium leading-relaxed">{checkoutError}</p>
                                </div>
                            )}

                            <div className="space-y-3.5 mb-6">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-app-text-muted mb-1.5">
                                        Full Name <span className="text-brand-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Jane Doe"
                                        className="w-full px-3.5 py-2.5 rounded-lg bg-app-bg border border-app-border text-app-text placeholder-app-text-faint focus:bg-app-surface focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all font-medium text-[13px]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-app-text-muted mb-1.5">
                                        Email Address <span className="text-brand-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="jane@example.com"
                                        className="w-full px-3.5 py-2.5 rounded-lg bg-app-bg border border-app-border text-app-text placeholder-app-text-faint focus:bg-app-surface focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all font-medium text-[13px]"
                                    />
                                    <p className="text-[10px] font-medium text-app-text-faint mt-1.5 ml-1">
                                        Tickets will be sent here.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-app-text-muted mb-1.5">
                                        Phone Number <span className="text-brand-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="+44 7700 900000"
                                        className="w-full px-3.5 py-2.5 rounded-lg bg-app-bg border border-app-border text-app-text placeholder-app-text-faint focus:bg-app-surface focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all font-medium text-[13px]"
                                    />
                                </div>
                            </div>

                            <div className="pt-5 border-t border-app-border">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full flex items-center justify-center gap-2 bg-app-text text-app-surface font-bold py-3 rounded-lg hover:bg-[#1A1817] transition-colors disabled:opacity-50 disabled:pointer-events-none text-[13px] shadow-organic"
                                >
                                    {processing ? (
                                        <>
                                            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        `Pay £${totalPrice.toFixed(2)}`
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* ─── Right Column: Order Summary ─── */}
                <div className="lg:col-span-5 order-1 lg:order-2 lg:sticky lg:top-24">
                    <div className="bg-app-bg border border-app-border rounded-[1.25rem] overflow-hidden shadow-sm">

                        <div className="p-5 border-b border-app-border bg-app-surface">
                            <h3 className="font-outfit text-base font-bold text-app-text mb-3 line-clamp-2">{event.name}</h3>

                            <div className="space-y-1.5 text-xs font-medium text-app-text-muted">
                                {dateStr && (
                                    <div className="flex items-center gap-2">
                                        <CalendarDays size={14} className="text-brand-500" />
                                        <span>{dateStr}</span>
                                    </div>
                                )}
                                {event.venue?.name && (
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="text-brand-500" />
                                        <span>{event.venue.name}</span>
                                    </div>
                                )}
                                {event.start?.time && (
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-brand-500" />
                                        <span>{event.start.time}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-5">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-app-text-faint mb-4">Summary</h4>

                            <div className="space-y-3.5 mb-5">
                                {tickets.map(t => {
                                    const qty = selectedTickets[t.id];
                                    const price = (t.price || 0) / 100;
                                    return (
                                        <div key={t.id} className="flex justify-between gap-4">
                                            <div className="flex-1">
                                                <p className="font-outfit font-bold text-app-text text-[13px] mb-0.5">{t.name}</p>
                                                <p className="text-[10px] font-medium text-app-text-muted">£{price.toFixed(2)} x {qty}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-outfit font-bold text-sm text-app-text">£{(price * qty).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="bg-app-surface rounded-lg p-3.5 border border-app-border mt-4 flex items-center justify-between shadow-sm">
                                <span className="font-bold text-app-text text-[13px]">Total</span>
                                <span className="font-outfit font-black text-xl text-brand-600">£{totalPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
