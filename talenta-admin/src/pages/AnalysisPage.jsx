import { useState, useEffect } from 'react'
import api from '../lib/api'
import {
    BarChart3, AlertCircle, TrendingUp, Ticket,
    DollarSign, CalendarDays, PieChart, X
} from 'lucide-react'
import Skeleton from '../components/Skeleton'
import ClientSelector from '../components/ClientSelector'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend,
    AreaChart, Area, ScatterChart, Scatter, ZAxis
} from 'recharts'

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#1d4ed8']

export default function AnalysisPage() {
    const [clients, setClients] = useState([])
    const [selectedClient, setSelectedClient] = useState('')
    const [analytics, setAnalytics] = useState(null)
    const [events, setEvents] = useState([])
    const [loadingClients, setLoadingClients] = useState(true)
    const [loadingAnalytics, setLoadingAnalytics] = useState(false)
    const [error, setError] = useState('')
    const [selectedMonth, setSelectedMonth] = useState(null) // null = All Time

    useEffect(() => {
        api.get('/api/clients').then(({ data }) => {
            setClients(data.filter(c => c.is_active))
            setLoadingClients(false)
        })
    }, [])

    const loadAnalytics = async (clientId) => {
        if (!clientId) return
        setLoadingAnalytics(true)
        setError('')
        setAnalytics(null)
        setEvents([])
        setSelectedMonth(null) // Always reset to All Time when loading new client
        try {
            const [analyticsRes, eventsRes] = await Promise.all([
                api.get(`/api/tt/${clientId}/analytics`),
                api.get(`/api/tt/${clientId}/events`),
            ])
            setAnalytics(analyticsRes.data)
            setEvents(eventsRes.data?.data?.data || [])
        } catch (e) {
            setError(e.response?.data?.detail || 'Failed to load analytics')
        } finally {
            setLoadingAnalytics(false)
        }
    }

    // ── Base event data ──
    const allEventChartData = (analytics?.analytics?.per_event || []).map(ev => ({
        ...ev,
        name: (ev.name || 'Unnamed').substring(0, 20) + '…',
        sold: ev.tickets || 0,
        revenue: +(ev.revenue || 0),
        earnings: +(ev.earnings || 0),
        price: ev.avg_price || 0,
        date: ev.start_iso ? new Date(ev.start_iso) : null,
        monthly_breakdown: ev.monthly_breakdown || {}
    }))

    // ── Monthly aggregation (Global transaction months) ──
    const monthlyMap = {}
    allEventChartData.forEach(ev => {
        Object.entries(ev.monthly_breakdown).forEach(([monthKey, stats]) => {
            if (!monthlyMap[monthKey]) {
                const [mon, yr] = monthKey.split(' ') // "Feb 2026"
                const monthIndex = new Date(`${mon} 1, 2000`).getMonth() + 1
                const sortKey = `${yr}-${monthIndex.toString().padStart(2, '0')}`

                monthlyMap[monthKey] = { name: monthKey, revenue: 0, tickets: 0, events: 0, sortKey }
            }
            monthlyMap[monthKey].revenue += stats.revenue
            monthlyMap[monthKey].tickets += stats.tickets
            monthlyMap[monthKey].events += 1 // Count event as active in this month
        })
    })
    const monthlyRevenueData = Object.values(monthlyMap)
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        .map(m => ({ ...m, revenue: +m.revenue.toFixed(2) }))

    // ── Filtered dataset based on selected transaction month ──
    let eventChartData = []
    if (selectedMonth) {
        // Only include events that had sales in this month, and override their values
        allEventChartData.forEach(ev => {
            if (ev.monthly_breakdown[selectedMonth]) {
                const mStats = ev.monthly_breakdown[selectedMonth]
                eventChartData.push({
                    ...ev,
                    sold: mStats.tickets,
                    revenue: mStats.revenue,
                    earnings: mStats.earnings
                })
            }
        })
    } else {
        eventChartData = allEventChartData
    }

    // ── Derived stats ──
    const topEarningsData = [...eventChartData].sort((a, b) => b.earnings - a.earnings).slice(0, 5)
    const topTicketsData = [...eventChartData].sort((a, b) => b.sold - a.sold).slice(0, 5)

    const filteredStats = {
        total_events: eventChartData.length,
        published_events: eventChartData.filter(ev => ev.status === 'published').length,
        total_tickets_sold: eventChartData.reduce((s, ev) => s + ev.sold, 0),
        total_revenue_gbp: +eventChartData.reduce((s, ev) => s + ev.revenue, 0).toFixed(2),
        platform_earnings_gbp: +eventChartData.reduce((s, ev) => s + ev.earnings, 0).toFixed(2),
    }

    // ── Cumulative growth (sorted by date) ──
    let cumRev = 0
    const growthData = [...eventChartData]
        .sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0))
        .map((ev, idx) => {
            cumRev += ev.revenue
            return { index: idx + 1, name: ev.name, revenue: ev.revenue, cumulative: +cumRev.toFixed(2) }
        })

    // ── Scatter ──
    const scatterData = eventChartData.map(ev => ({ x: ev.price, y: ev.sold, name: ev.name }))

    // ── Status pie ──
    const statusCounts = eventChartData.reduce((acc, ev) => {
        const s = ev.status || 'unknown'
        acc[s] = (acc[s] || 0) + 1
        return acc
    }, {})
    const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

    return (
        <div className="p-8 space-y-8">

            {/* Page header */}
            <div className="border-b border-white/5 pb-6">
                <h1 className="text-2xl font-bold text-white tracking-tight">Intelligence Analysis</h1>
                <p className="text-white/40 text-sm mt-1">Deep-dive performance metrics per client</p>
            </div>

            {/* Client selector */}
            <div className="max-w-md">
                <label className="label mb-3 block">Select Target Client</label>
                <ClientSelector
                    clients={clients}
                    selectedId={selectedClient}
                    onSelect={(id) => {
                        setSelectedClient(id)
                        loadAnalytics(id)
                    }}
                    placeholder="Search and select a client..."
                />
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Loading skeleton */}
            {loadingAnalytics && (
                <div className="space-y-8 animate-fade-in">
                    <Skeleton className="h-32 rounded-2xl" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="stat-card">
                                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="w-16 h-3" />
                                    <Skeleton className="w-24 h-6" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <Skeleton className="h-24 rounded-2xl" />
                    <Skeleton className="h-[300px] rounded-2xl" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Skeleton className="h-[280px] rounded-2xl" />
                        <Skeleton className="h-[280px] rounded-2xl" />
                    </div>
                </div>
            )}

            {/* ── Analytics content ── */}
            {analytics && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* ══════════════════════════════════════════════════════
                        MONTH FILTER BAR — prominent, always visible
                    ══════════════════════════════════════════════════════ */}
                    {monthlyRevenueData.length > 0 && (
                        <div className="card p-4">
                            {/* Label row */}
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                                    <CalendarDays size={13} /> Filter by Month
                                </span>
                                {selectedMonth && (
                                    <button
                                        onClick={() => setSelectedMonth(null)}
                                        className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
                                    >
                                        <X size={13} /> Clear filter
                                    </button>
                                )}
                            </div>

                            {/* Scrollable pill row */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                {/* All Time button */}
                                <button
                                    onClick={() => setSelectedMonth(null)}
                                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border whitespace-nowrap ${!selectedMonth
                                        ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-600/30'
                                        : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    All Time
                                </button>

                                {/* One pill per month — chronological */}
                                {monthlyRevenueData.map(m => (
                                    <button
                                        key={m.name}
                                        onClick={() => setSelectedMonth(prev => prev === m.name ? null : m.name)}
                                        title={`${m.events} events · ${m.tickets} tickets · £${m.revenue.toLocaleString()}`}
                                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border whitespace-nowrap ${selectedMonth === m.name
                                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                            : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                                            }`}
                                    >
                                        {m.name}
                                        <span className={`ml-1.5 text-[10px] ${selectedMonth === m.name ? 'text-white/70' : 'text-white/25'}`}>
                                            {m.events}ev
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Active filter summary */}
                            {selectedMonth && (
                                <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] text-white/40">Showing:</span>
                                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                        {selectedMonth}
                                    </span>
                                    <span className="text-[11px] text-white/30">
                                        {filteredStats.total_events} events · {filteredStats.total_tickets_sold} tickets · £{filteredStats.total_revenue_gbp.toLocaleString()} revenue
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════
                        STAT CARDS
                    ══════════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {[
                            { icon: CalendarDays, label: 'Total Events', value: filteredStats.total_events, color: 'bg-primary-600/20 text-primary-400' },
                            { icon: CalendarDays, label: 'Published', value: filteredStats.published_events, color: 'bg-emerald-500/20 text-emerald-400' },
                            { icon: Ticket, label: 'Tickets Sold', value: filteredStats.total_tickets_sold, color: 'bg-purple-500/20 text-purple-400' },
                            { icon: DollarSign, label: 'Gross Revenue', value: `£${filteredStats.total_revenue_gbp.toLocaleString()}`, color: 'bg-amber-500/20 text-amber-400' },
                        ].map(({ icon: Icon, label, value, color }) => (
                            <div key={label} className="stat-card">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                                    <Icon size={18} />
                                </div>
                                <div>
                                    <p className="label">{label}</p>
                                    <p className="text-xl font-bold text-white">{value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Platform earnings highlight */}
                    <div className="card p-6 bg-gradient-to-r from-primary-600/20 to-transparent">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary-600 rounded-2xl shadow-lg shadow-primary-600/20">
                                <TrendingUp size={24} className="text-white" />
                            </div>
                            <div>
                                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">
                                    Estimated Net Revenue — {selectedMonth ? selectedMonth : 'All Time'}
                                </p>
                                <p className="text-3xl font-bold text-white tracking-tight">
                                    £{filteredStats.platform_earnings_gbp.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════
                        CHARTS GRID
                    ══════════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                        {/* Monthly Revenue Bar — always all-time, highlights selected */}
                        <div className="card p-6 border-primary-600/20 shadow-xl shadow-primary-600/5 xl:col-span-2">
                            <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
                                <BarChart3 size={16} className="text-primary-400" /> Monthly Revenue Performance
                            </h2>
                            <p className="text-xs text-white/30 mb-5">Click a bar or use the filter above to drill down</p>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart
                                    data={monthlyRevenueData}
                                    onClick={(data) => {
                                        if (data?.activeLabel) {
                                            setSelectedMonth(prev => prev === data.activeLabel ? null : data.activeLabel)
                                        }
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: '#ffffff40', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#ffffff40', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#ffffff05' }}
                                        contentStyle={{ background: '#141622', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
                                    />
                                    <Bar dataKey="revenue" radius={[6, 6, 6, 6]} name="Revenue (£)" barSize={40}>
                                        {monthlyRevenueData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={selectedMonth === entry.name ? '#10b981' : '#3b82f6'}
                                                fillOpacity={selectedMonth && selectedMonth !== entry.name ? 0.25 : 1}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Revenue per Event */}
                        <div className="card p-6">
                            <h2 className="text-base font-semibold text-white mb-6 flex items-center gap-2">
                                <DollarSign size={16} className="text-primary-400" /> Revenue per Event
                                {selectedMonth && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{selectedMonth}</span>}
                            </h2>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={eventChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: '#ffffff40', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#ffffff40', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#ffffff05' }} contentStyle={{ background: '#141622', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
                                    <Bar dataKey="revenue" radius={[6, 6, 6, 6]} name="Revenue (£)" barSize={32}>
                                        {eventChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Top 5 Tickets Sold */}
                        <div className="card p-6">
                            <h2 className="text-base font-semibold text-white mb-6 flex items-center gap-2">
                                <Ticket size={16} className="text-purple-400" /> Top 5 Events (Tickets Sold)
                                {selectedMonth && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{selectedMonth}</span>}
                            </h2>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={topTicketsData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: '#ffffff40', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="name" tick={{ fill: '#ffffff40', fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
                                    <Tooltip cursor={{ fill: '#ffffff05' }} contentStyle={{ background: '#141622', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
                                    <Bar dataKey="sold" radius={[0, 6, 6, 0]} name="Tickets Sold" barSize={20}>
                                        {topTicketsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Earnings Contribution Pie */}
                        <div className="card p-6">
                            <h2 className="text-base font-semibold text-white mb-6 flex items-center gap-2">
                                <PieChart size={16} className="text-primary-400" /> Earnings Contribution
                                {selectedMonth && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{selectedMonth}</span>}
                            </h2>
                            <ResponsiveContainer width="100%" height={240}>
                                <RechartsPie>
                                    <Pie data={topEarningsData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="earnings" nameKey="name" label>
                                        {topEarningsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#141622', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, paddingTop: 20 }} />
                                </RechartsPie>
                            </ResponsiveContainer>
                        </div>

                        {/* Event Status Breakdown */}
                        <div className="card p-6">
                            <h2 className="text-base font-semibold text-white mb-6 flex items-center gap-2">
                                <PieChart size={16} className="text-amber-400" /> Event Status Breakdown
                                {selectedMonth && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{selectedMonth}</span>}
                            </h2>
                            <ResponsiveContainer width="100%" height={240}>
                                <RechartsPie>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" nameKey="name" label>
                                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#141622', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, paddingTop: 20 }} />
                                </RechartsPie>
                            </ResponsiveContainer>
                        </div>

                        {/* Growth Momentum */}
                        <div className="card p-6 xl:col-span-2">
                            <h2 className="text-base font-semibold text-white mb-6 flex items-center gap-2">
                                <TrendingUp size={16} className="text-emerald-400" />
                                Revenue Growth Momentum
                                {selectedMonth
                                    ? <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{selectedMonth}</span>
                                    : <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full">All Time – Cumulative</span>
                                }
                            </h2>
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={growthData}>
                                    <defs>
                                        <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <XAxis dataKey="index" tick={{ fill: '#ffffff40', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#ffffff40', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ background: '#141622', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
                                    <Area type="monotone" dataKey="cumulative" stroke="#10b981" fillOpacity={1} fill="url(#colorCum)" name="Revenue (£)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Pricing vs Volume Scatter */}
                        <div className="card p-6 xl:col-span-2">
                            <h2 className="text-base font-semibold text-white mb-6 flex items-center gap-2">
                                <DollarSign size={16} className="text-amber-400" /> Pricing vs. Volume Correlation
                                {selectedMonth && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{selectedMonth}</span>}
                            </h2>
                            <ResponsiveContainer width="100%" height={220}>
                                <ScatterChart>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                    <XAxis type="number" dataKey="x" name="Price" unit="£" tick={{ fill: '#ffffff40', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis type="number" dataKey="y" name="Volume" unit=" tix" tick={{ fill: '#ffffff40', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <ZAxis range={[60, 400]} />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#141622', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
                                    <Scatter name="Events" data={scatterData} fill="#f59e0b">
                                        {scatterData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>

                    </div>
                </div>
            )}

            {/* Empty state */}
            {!selectedClient && !loadingClients && (
                <div className="card py-24 text-center border-dashed border-white/10 bg-transparent">
                    <BarChart3 size={48} className="mx-auto mb-4 text-white/10" />
                    <p className="text-white/60 font-medium">No client selected</p>
                    <p className="text-white/30 text-sm mt-1">Select a client above to view detailed intelligence.</p>
                </div>
            )}
        </div>
    )
}
