import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react'

export default function CheckoutCancelPage() {
    const [searchParams] = useSearchParams()
    const eventId = searchParams.get('event_id')

    return (
        <div className="flex-1 flex items-center justify-center p-4 py-20 min-h-screen" style={{ background: 'var(--app-bg)' }}>
            <div className="w-full max-w-sm animate-fade-up">
                <div
                    className="rounded-3xl overflow-hidden text-center"
                    style={{
                        background: 'linear-gradient(135deg, rgba(20,20,22,0.98) 0%, rgba(12,12,14,1) 100%)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        boxShadow: '0 30px 80px rgba(0,0,0,0.5)'
                    }}
                >
                    {/* Icon Header */}
                    <div className="px-8 pt-10 pb-6">
                        <div
                            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                            style={{
                                background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.2)',
                                boxShadow: '0 0 40px rgba(239,68,68,0.08)'
                            }}
                        >
                            <AlertTriangle size={34} className="text-red-400" />
                        </div>

                        <h1 className="text-2xl font-black text-white mb-3">Checkout Cancelled</h1>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--app-text-muted)' }}>
                            You've cancelled the payment process. No charges were made.
                            If you experienced any issues, please try again or contact support.
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="h-px mx-8" style={{ background: 'rgba(255,255,255,0.06)' }} />

                    {/* Buttons */}
                    <div className="px-8 py-7 space-y-3">
                        {eventId && (
                            <Link
                                to={`/events/${eventId}`}
                                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm transition-all"
                                style={{
                                    background: 'linear-gradient(135deg, rgb(234,179,8) 0%, rgb(202,138,4) 100%)',
                                    color: '#000',
                                    boxShadow: '0 6px 20px rgba(234,179,8,0.2)'
                                }}
                            >
                                <ArrowLeft size={15} />
                                Return to Event
                            </Link>
                        )}
                        <Link
                            to="/"
                            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm transition-all"
                            style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: 'var(--app-text-muted)'
                            }}
                        >
                            <Home size={15} />
                            Browse Events
                        </Link>
                    </div>
                </div>

                <p className="text-center text-xs mt-5" style={{ color: 'var(--app-text-faint)' }}>
                    Need help? <Link to="/" style={{ color: 'rgb(234,179,8)' }}>Contact support</Link>
                </p>
            </div>
        </div>
    )
}
