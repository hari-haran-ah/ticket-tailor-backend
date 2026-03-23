import { useState, useEffect } from 'react'
import { clientApi } from '../../api/client'
import { analysisApi } from '../../api/analysis'
import { eventApi } from '../../api/event'
import {
    BarChart3, AlertCircle, TrendingUp, Ticket,
    DollarSign, CalendarDays, PieChart, X, RefreshCw
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import Skeleton from '../../components/ui/Skeleton'
import ClientPillBar from '../../components/clients/ClientPillBar'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend,
    AreaChart, Area, ScatterChart, Scatter, ZAxis
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']

export default function AnalysisPage() {
    const { resolvedTheme } = useTheme()
    const [clients, setClients] = useState([])
    const [selectedClient, setSelectedClient] = useState('')
    const [analytics, setAnalytics] = useState(null)
    const [events, setEvents] = useState([])
    const [loadingClients, setLoadingClients] = useState(true)
    const [loadingAnalytics, setLoadingAnalytics] = useState(false)
    const [error, setError] = useState('')
    const [selectedMonth, setSelectedMonth] = useState(null) // null = All Time

    // Get currency symbol from analytics data
    const getCurrencySymbol = () => {
        const currency = analytics?.currency?.toUpperCase() || 'USD'
        const symbols = { USD: '$', GBP: '£', EUR: '€' }
        return symbols[currency] || currency
    }

    // Theme-aware chart styling
    const getTooltipStyle = () => {
        if (resolvedTheme === 'light') {
            const chartTheme = {
                grid: '#e5e7eb',
                text: '#6b7280',
                tooltipBg: '#ffffff',
                tooltipBorder: '#d1d5db',
                areaFill: '#e5e7eb',
                lineColor: '#000000'
            }
            return {
                contentStyle: {
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                },
                itemStyle: { color: '#3b82f6', fontWeight: 600, padding: 0 },
                labelStyle: { color: '#000000', fontWeight: 700, fontSize: '14px', marginBottom: '8px' }
            }
        }
        // Dark theme styles - Production-grade visibility
        return {
            contentStyle: {
                background: '#212121',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.8)'
            },
            itemStyle: { color: '#60a5fa', fontWeight: 600, padding: 0 },
            labelStyle: { color: '#ffffff', fontWeight: 700, fontSize: '14px', marginBottom: '8px' }
        }
    }

    const getAxisStyles = () => {
        return resolvedTheme === 'light'
            ? { fill: '#6b7280', fontSize: 10 }
            : { fill: '#9ca3af', fontSize: 10 }        // More visible gray for dark theme
    }

    const getGridStroke = () => {
        return resolvedTheme === 'light' ? '#d1d5db' : 'rgba(255,255,255,0.1)'  // More visible grid
    }

    const getCursorFill = () => {
        return resolvedTheme === 'light' ? '#e5e7eb' : 'rgba(255,255,255,0.08)'   // More visible cursor
    }

    useEffect(() => {
        clientApi.getAll().then(({ data }) => {
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
                analysisApi.getClientAnalytics(clientId),
                eventApi.getAll(clientId),
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
    const eventsByMonth = {} // Track unique events per month

    allEventChartData.forEach(ev => {
        Object.entries(ev.monthly_breakdown).forEach(([monthKey, stats]) => {
            if (!monthlyMap[monthKey]) {
                const [mon, yr] = monthKey.split(' ') // "Feb 2026"
                const monthIndex = new Date(`${mon} 1, 2000`).getMonth() + 1
                const sortKey = `${yr}-${monthIndex.toString().padStart(2, '0')}`

                monthlyMap[monthKey] = { name: monthKey, revenue: 0, tickets: 0, events: 0, sortKey }
                eventsByMonth[monthKey] = new Set()
            }
            monthlyMap[monthKey].revenue += stats.revenue
            monthlyMap[monthKey].tickets += stats.tickets
            eventsByMonth[monthKey].add(ev.id) // Track unique events
        })
    })

    // Set correct event counts
    Object.keys(monthlyMap).forEach(monthKey => {
        monthlyMap[monthKey].events = eventsByMonth[monthKey].size
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
    const topEarningsData = [...eventChartData]
        .filter(ev => ev.earnings > 0) // Only show events with actual earnings
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 5)
    const topTicketsData = [...eventChartData]
        .filter(ev => ev.sold > 0) // Only show events with ticket sales
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5)

    const filteredStats = {
        total_events: eventChartData.length,
        published_events: eventChartData.filter(ev => ev.status === 'published').length,
        total_tickets_sold: eventChartData.reduce((s, ev) => s + ev.sold, 0),
        total_revenue: +eventChartData.reduce((s, ev) => s + ev.revenue, 0).toFixed(2),
        platform_earnings: +eventChartData.reduce((s, ev) => s + ev.earnings, 0).toFixed(2),
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
            <div className="flex items-end justify-between border-b border-gray-300 dark:border-white/10 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-black dark:text-white tracking-tight">Intelligence Analysis</h1>
                    <p className="text-gray-600 dark:text-white/50 text-sm mt-1">Deep-dive performance metrics per client</p>
                </div>
                <button
                    onClick={() => {
                        setLoadingClients(true);
                        clientApi.getAll().then(({ data }) => {
                            setClients(data.filter(c => c.is_active));
                            setLoadingClients(false);
                            if (selectedClient) loadAnalytics(selectedClient);
                        });
                    }}
                    className="btn-secondary group flex items-center gap-2"
                >
                    <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                    <span className="hidden sm:inline">Refresh</span>
                </button>
            </div>

            {/* ── Client pill bar ── */}
            <div className="space-y-2">
                <p className="text-gray-500 dark:text-white/50 text-xs uppercase tracking-widest font-semibold">Select Client</p>
                <ClientPillBar
                    clients={clients}
                    selectedId={selectedClient}
                    onSelect={(id) => { setSelectedClient(id); loadAnalytics(id) }}
                    loading={loadingClients}
                />
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 text-black dark:text-white text-sm rounded-xl flex items-center gap-2">
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
                                <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-white/50 flex items-center gap-1.5">
                                    <CalendarDays size={13} /> Filter by Month
                                </span>
                                {selectedMonth && (
                                    <button
                                        onClick={() => setSelectedMonth(null)}
                                        className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
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
                                        ? 'bg-black dark:bg-white text-white dark:text-black border-gray-900 dark:border-white shadow-lg'
                                        : 'bg-gray-100 dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-600 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10'
                                        }`}
                                >
                                    All Time
                                </button>

                                {/* One pill per month — chronological */}
                                {monthlyRevenueData.map(m => (
                                    <button
                                        key={m.name}
                                        onClick={() => setSelectedMonth(prev => prev === m.name ? null : m.name)}
                                        title={`${m.events} events · ${m.tickets} tickets · ${getCurrencySymbol()}${m.revenue.toLocaleString()}`}
                                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border whitespace-nowrap ${selectedMonth === m.name
                                            ? 'bg-black dark:bg-white text-white dark:text-black border-gray-900 dark:border-white shadow-lg'
                                            : 'bg-gray-100 dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-600 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10'
                                            }`}
                                    >
                                        {m.name}
                                        <span className={`ml-1.5 text-[10px] ${selectedMonth === m.name ? 'text-white/100 dark:text-black/70' : 'text-gray-400 dark:text-white/30'}`}>
                                            {m.events}ev
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Active filter summary */}
                            {selectedMonth && (
                                <div className="mt-3 pt-3 border-t border-gray-300 dark:border-white/10 flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] text-gray-500 dark:text-white/50">Showing:</span>
                                    <span className="text-[11px] font-bold text-black dark:text-white bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-white/20 px-2 py-0.5 rounded-full">
                                        {selectedMonth}
                                    </span>
                                    <span className="text-[11px] text-gray-600 dark:text-white/40">
                                        {filteredStats.total_events} events · {filteredStats.total_tickets_sold} tickets · {getCurrencySymbol()}{filteredStats.total_revenue.toLocaleString()} revenue
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
                            { icon: CalendarDays, label: 'Total Events', value: filteredStats.total_events },
                            { icon: CalendarDays, label: 'Published', value: filteredStats.published_events },
                            { icon: Ticket, label: 'Tickets Sold', value: filteredStats.total_tickets_sold },
                            { icon: DollarSign, label: 'Gross Revenue', value: `${getCurrencySymbol()}${filteredStats.total_revenue.toLocaleString()}` },
                        ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="stat-card">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-white/10 text-black dark:text-white border border-gray-300 dark:border-white/10">
                                    <Icon size={18} />
                                </div>
                                <div>
                                    <p className="label">{label}</p>
                                    <p className="text-xl font-bold text-black dark:text-white">{value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Platform earnings highlight */}
                    <div className="card p-6 bg-gray-100 dark:bg-white/5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-black dark:bg-white rounded-2xl shadow-lg">
                                <TrendingUp size={24} className="text-white dark:text-black" />
                            </div>
                            <div>
                                <p className="text-gray-500 dark:text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">
                                    Estimated Net Revenue — {selectedMonth ? selectedMonth : 'All Time'}
                                </p>
                                <p className="text-3xl font-bold text-black dark:text-white tracking-tight">
                                    {getCurrencySymbol()}{filteredStats.platform_earnings.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════
                        CHARTS GRID
                    ══════════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                        {/* Monthly Revenue Bar — always all-time, highlights selected */}
                        <div className="card p-6 border-gray-300 dark:border-white/10 shadow-xl xl:col-span-2">
                            <h2 className="text-base font-semibold text-black dark:text-white mb-1 flex items-center gap-2">
                                <BarChart3 size={16} className="text-black dark:text-white" /> Monthly Revenue Performance
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-white/40 mb-5">Click a bar or use the filter above to drill down</p>
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
                                    <CartesianGrid strokeDasharray="3 3" stroke={getGridStroke()} vertical={false} />
                                    <XAxis dataKey="name" tick={getAxisStyles()} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ ...getAxisStyles(), fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: getCursorFill() }}
                                        {...getTooltipStyle()}
                                    />
                                    <Bar dataKey="revenue" radius={[6, 6, 6, 6]} name={`Revenue (${getCurrencySymbol()})`} barSize={40}>
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
                            <h2 className="text-base font-semibold text-black dark:text-white mb-6 flex items-center gap-2">
                                <DollarSign size={16} className="text-black dark:text-white" /> Revenue per Event
                                {selectedMonth && <span className="text-[10px] text-black dark:text-white bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded-full border border-gray-300 dark:border-white/20">{selectedMonth}</span>}
                            </h2>
                            {eventChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={eventChartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={getGridStroke()} vertical={false} />
                                        <XAxis dataKey="name" tick={getAxisStyles()} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ ...getAxisStyles(), fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: getCursorFill() }} {...getTooltipStyle()} />
                                        <Bar dataKey="revenue" radius={[6, 6, 6, 6]} name={`Revenue (${getCurrencySymbol()})`} barSize={32}>
                                            {eventChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[240px] text-white/40">
                                    <div className="text-center">
                                        <BarChart3 size={32} className="mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">No revenue data available</p>
                                        {selectedMonth && <p className="text-xs mt-1">for {selectedMonth}</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Top 5 Tickets Sold */}
                        <div className="card p-6">
                            <h2 className="text-base font-semibold text-black dark:text-white mb-6 flex items-center gap-2">
                                <Ticket size={16} className="text-black dark:text-white" /> Top 5 Events (Tickets Sold)
                                {selectedMonth && <span className="text-[10px] text-black dark:text-white bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded-full border border-gray-300 dark:border-white/20">{selectedMonth}</span>}
                            </h2>
                            {topTicketsData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={topTicketsData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke={getGridStroke()} horizontal={false} />
                                        <XAxis type="number" tick={getAxisStyles()} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="name" tick={getAxisStyles()} axisLine={false} tickLine={false} width={110} />
                                        <Tooltip cursor={{ fill: getCursorFill() }} {...getTooltipStyle()} />
                                        <Bar dataKey="sold" radius={[0, 6, 6, 0]} name="Tickets Sold" barSize={20}>
                                            {topTicketsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[240px] text-white/40">
                                    <div className="text-center">
                                        <Ticket size={32} className="mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">No ticket sales data available</p>
                                        {selectedMonth && <p className="text-xs mt-1">for {selectedMonth}</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Earnings Contribution Pie */}
                        <div className="card p-6">
                            <h2 className="text-base font-semibold text-black dark:text-white mb-6 flex items-center gap-2">
                                <PieChart size={16} className="text-black dark:text-white" /> Earnings Contribution
                                {selectedMonth && <span className="text-[10px] text-black dark:text-white bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded-full border border-gray-300 dark:border-white/20">{selectedMonth}</span>}
                            </h2>
                            {topEarningsData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={240}>
                                    <RechartsPie>
                                        <Pie data={topEarningsData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="earnings" nameKey="name" label>
                                            {topEarningsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip {...getTooltipStyle()} />
                                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, paddingTop: 20 }} />
                                    </RechartsPie>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[240px] text-white/40">
                                    <div className="text-center">
                                        <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">No earnings data available</p>
                                        {selectedMonth && <p className="text-xs mt-1">for {selectedMonth}</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Event Status Breakdown */}
                        <div className="card p-6">
                            <h2 className="text-base font-semibold text-black dark:text-white mb-6 flex items-center gap-2">
                                <PieChart size={16} className="text-black dark:text-white" /> Event Status Breakdown
                                {selectedMonth && <span className="text-[10px] text-black dark:text-white bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded-full border border-gray-300 dark:border-white/20">{selectedMonth}</span>}
                            </h2>
                            <ResponsiveContainer width="100%" height={240}>
                                <RechartsPie>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" nameKey="name" label>
                                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip {...getTooltipStyle()} />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, paddingTop: 20 }} />
                                </RechartsPie>
                            </ResponsiveContainer>
                        </div>

                        {/* Growth Momentum */}
                        <div className="card p-6 xl:col-span-2">
                            <h2 className="text-base font-semibold text-black dark:text-white mb-6 flex items-center gap-2">
                                <TrendingUp size={16} className="text-black dark:text-white" />
                                Revenue Growth Momentum
                                {selectedMonth
                                    ? <span className="text-[10px] text-black dark:text-white bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded-full border border-gray-300 dark:border-white/20">{selectedMonth}</span>
                                    : <span className="text-[10px] text-gray-600 dark:text-white/40 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">All Time – Cumulative</span>
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
                                    <CartesianGrid strokeDasharray="3 3" stroke={getGridStroke()} vertical={false} />
                                    <XAxis dataKey="index" tick={getAxisStyles()} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ ...getAxisStyles(), fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip {...getTooltipStyle()} />
                                    <Area type="monotone" dataKey="cumulative" stroke="#10b981" fillOpacity={1} fill="url(#colorCum)" name={`Revenue (${getCurrencySymbol()})`} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Pricing vs Volume Scatter */}
                        <div className="card p-6 xl:col-span-2">
                            <h2 className="text-base font-semibold text-black dark:text-white mb-6 flex items-center gap-2">
                                <DollarSign size={16} className="text-black dark:text-white" /> Pricing vs. Volume Correlation
                                {selectedMonth && <span className="text-[10px] text-black dark:text-white bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded-full border border-gray-300 dark:border-white/20">{selectedMonth}</span>}
                            </h2>
                            <ResponsiveContainer width="100%" height={220}>
                                <ScatterChart>
                                    <CartesianGrid strokeDasharray="3 3" stroke={getGridStroke()} />
                                    <XAxis type="number" dataKey="x" name="Price" unit={getCurrencySymbol()} tick={getAxisStyles()} axisLine={false} tickLine={false} />
                                    <YAxis type="number" dataKey="y" name="Volume" unit=" tix" tick={getAxisStyles()} axisLine={false} tickLine={false} />
                                    <ZAxis range={[60, 400]} />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} {...getTooltipStyle()} />
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
                <div className="card py-24 text-center border-dashed border-gray-300 dark:border-white/10 bg-transparent">
                    <BarChart3 size={48} className="mx-auto mb-4 text-gray-200 dark:text-white/10" />
                    <p className="text-gray-600 dark:text-white/60 font-medium">No client selected</p>
                    <p className="text-gray-400 dark:text-white/30 text-sm mt-1">Select a client above to view detailed intelligence.</p>
                </div>
            )}
        </div>
    )
}
