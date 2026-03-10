import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, AlertCircle, Loader2, Ticket, Mail, Calendar, ArrowRight } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function CheckoutSuccessPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const sessionId = searchParams.get('session_id')

    const [status, setStatus] = useState('loading') // loading | success | failed
    const [sessionData, setSessionData] = useState(null)

    useEffect(() => {
        if (!sessionId) {
            navigate('/')
            return
        }

        let attempts = 0
        const maxAttempts = 6

        async function pollSession() {
            try {
                const { data } = await axios.get(`${API}/api/site/checkout/session/${sessionId}`)
                if (data.status === 'complete') {
                    setSessionData(data)
                    setStatus('success')
                } else if (data.status === 'failed') {
                    setStatus('failed')
                    setSessionData(data)
                } else if (data.status === 'pending' && attempts < maxAttempts) {
                    attempts++
                    setTimeout(pollSession, 3000)
                } else {
                    setSessionData(data)
                    setStatus('success')
                }
            } catch (err) {
                setStatus('success')
                setSessionData({ session_id: sessionId })
            }
        }

        pollSession()
    }, [sessionId, navigate])

    const shortOrderId = sessionId ? sessionId.split('_').slice(-1)[0].slice(0, 12).toUpperCase() : ''

    return (
        <div
            className="flex-1 flex items-center justify-center p-4 py-16 min-h-screen"
            style={{ background: 'var(--app-bg)' }}
        >
            {/* ── Loading ── */}
            {status === 'loading' && (
                <div className="text-center animate-fade-up">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div
                            className="w-20 h-20 rounded-full border-2 animate-spin"
                            style={{ borderColor: 'rgba(234,179,8,0.15)', borderTopColor: 'rgb(234,179,8)' }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 size={24} style={{ color: 'rgb(234,179,8)' }} />
                        </div>
                    </div>
                    <p className="text-lg font-bold text-white mb-1">Confirming your booking…</p>
                    <p className="text-sm" style={{ color: 'var(--app-text-muted)' }}>Please wait while we verify your order</p>
                </div>
            )}

            {/* ── Payment Failed ── */}
            {status === 'failed' && (
                <div className="w-full max-w-md animate-fade-up">
                    <div
                        className="rounded-3xl overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, rgba(20,20,22,0.98) 0%, rgba(12,12,14,1) 100%)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(239,68,68,0.05)'
                        }}
                    >
                        {/* Red Header */}
                        <div
                            className="p-8 text-center"
                            style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}
                        >
                            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                                <XCircle size={36} className="text-white" />
                            </div>
                            <h2 className="text-2xl font-black text-white">Payment Failed</h2>
                            <p className="text-red-200 text-sm mt-2">We couldn't process your transaction</p>
                        </div>

                        {/* Body */}
                        <div className="p-8 text-center space-y-6">
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--app-text-muted)' }}>
                                We were unable to verify your payment session. If funds were deducted from your account,
                                please contact our support team immediately.
                            </p>
                            <Link
                                to="/"
                                className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm transition-all"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: 'var(--app-text)'
                                }}
                            >
                                <ArrowRight size={16} className="rotate-180" />
                                Return to Events
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Success ── */}
            {status === 'success' && (
                <div className="w-full max-w-md animate-fade-up">
                    <div
                        className="rounded-3xl overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, rgba(20,20,22,0.98) 0%, rgba(12,12,14,1) 100%)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 80px rgba(16,185,129,0.06)'
                        }}
                    >
                        {/* Green Header */}
                        <div
                            className="p-8 text-center relative overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
                        >
                            {/* Glow effect */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div
                                    className="w-40 h-40 rounded-full"
                                    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)' }}
                                />
                            </div>
                            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 relative z-10">
                                <CheckCircle size={36} className="text-white" />
                            </div>
                            <h2 className="text-2xl font-black text-white relative z-10">Booking Confirmed!</h2>
                            <p className="text-emerald-200 text-sm mt-2 relative z-10">Your tickets are on their way</p>
                        </div>

                        {/* Body */}
                        <div className="p-7 space-y-4">

                            {/* Ticket Tailor Issue Alert */}
                            {sessionData?.tt_error && (
                                <div
                                    className="rounded-2xl p-4 flex items-start gap-3"
                                    style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}
                                >
                                    <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-amber-400 mb-1">Ticket Delivery Delayed</p>
                                        <p className="text-xs leading-relaxed" style={{ color: 'var(--app-text-muted)' }}>
                                            Your payment was successful! However, the ticketing system is experiencing a slight delay in generating your barcodes.
                                        </p>
                                        {sessionData.tt_error.includes("billing details") && (
                                            <p className="text-[10px] mt-2 italic" style={{ color: 'var(--app-text-faint)' }}>
                                                Note: The organizer has been notified. You will receive your tickets within 24 hours.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Order Reference */}
                            {shortOrderId && (
                                <div
                                    className="flex items-center gap-3 rounded-2xl p-4"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                >
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'rgba(234,179,8,0.12)' }}
                                    >
                                        <Ticket size={14} style={{ color: 'rgb(234,179,8)' }} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--app-text-faint)' }}>
                                            Order Reference
                                        </p>
                                        <p className="font-mono font-bold text-sm text-white tracking-wider">
                                            #{shortOrderId}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Next Steps */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--app-text-faint)' }}>
                                    What's Next
                                </p>
                                <div className="space-y-3">
                                    <div
                                        className="flex items-start gap-3 rounded-xl p-4"
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                                    >
                                        <div
                                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                            style={{ background: 'rgba(234,179,8,0.12)' }}
                                        >
                                            <Mail size={13} style={{ color: 'rgb(234,179,8)' }} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-white">Check your inbox</p>
                                            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--app-text-muted)' }}>
                                                A confirmation email with your ticket barcode has been sent.
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className="flex items-start gap-3 rounded-xl p-4"
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                                    >
                                        <div
                                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                            style={{ background: 'rgba(234,179,8,0.12)' }}
                                        >
                                            <Calendar size={13} style={{ color: 'rgb(234,179,8)' }} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-white">Present your ticket</p>
                                            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--app-text-muted)' }}>
                                                Show your ticket barcode at the venue entrance on event day.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CTA */}
                            <Link
                                to="/"
                                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-sm transition-all mt-2"
                                style={{
                                    background: 'linear-gradient(135deg, rgb(234,179,8) 0%, rgb(202,138,4) 100%)',
                                    color: '#000',
                                    boxShadow: '0 8px 25px rgba(234,179,8,0.25)'
                                }}
                            >
                                Browse More Events
                                <ArrowRight size={15} />
                            </Link>

                            <p className="text-center text-[11px]" style={{ color: 'var(--app-text-faint)' }}>
                                Didn't receive the email? Check your spam folder or{' '}
                                <Link to="/" style={{ color: 'rgb(234,179,8)' }}>contact support</Link>.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
