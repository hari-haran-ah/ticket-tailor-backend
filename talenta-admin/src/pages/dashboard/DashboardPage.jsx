import { useState, useEffect } from 'react'
import { analysisApi } from '../../api/analysis'
import {
    Users, CalendarDays, Ticket, DollarSign, RefreshCw,
    AlertCircle, TrendingUp, ChevronRight, ArrowUpRight
} from 'lucide-react'
import Skeleton from '../../components/ui/Skeleton'
import { useTheme } from '../../context/ThemeContext'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell
} from 'recharts'

// Static COLORS removed in favor of dynamic activeColors

function StatCard({ icon: Icon, label, value, sub }) {
    return (
        <div className="stat-card">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-white/10 text-black dark:text-white border border-gray-300 dark:border-white/10">
                <Icon size={22} strokeWidth={2} />
            </div>
            <div>
                <p className="label">{label}</p>
                <p className="text-2xl font-bold text-black dark:text-white">{value}</p>
                {sub && <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">{sub}</p>}
            </div>
        </div>
    )
}

export default function DashboardPage() {
    const { resolvedTheme } = useTheme()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const load = async () => {
        setLoading(true); setError('')
        try {
            const { data: res } = await analysisApi.getDashboard()
            setData(res)
        } catch (e) {
            setError(e.response?.data?.detail || 'Failed to load dashboard')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    if (loading) return (
        <div className="p-8 space-y-8 animate-fade-in">
            {/* Header Skeleton */}
            <div className="flex items-end justify-between border-b border-gray-300 dark:border-white/5 pb-6">
                <div className="space-y-2">
                    <Skeleton className="w-32 h-3" />
                    <Skeleton className="w-56 h-8" />
                </div>
                <Skeleton className="w-24 h-10" />
            </div>

            {/* Stats Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="stat-card">
                        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="w-16 h-3" />
                            <Skeleton className="w-24 h-8" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Skeleton className="h-[360px] rounded-2xl" />
                <Skeleton className="h-[360px] rounded-2xl" />
            </div>

            {/* Table Skeleton */}
            <div className="card">
                <div className="p-6 border-b border-gray-300 dark:border-white/5">
                    <Skeleton className="w-40 h-6" />
                </div>
                <div className="p-6 space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex justify-between gap-4">
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )

    if (error) return (
        <div className="p-10">
            <div className="bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 p-5 rounded-xl flex items-center gap-3 text-black dark:text-white text-sm">
                <AlertCircle size={18} /> {error}
            </div>
        </div>
    )

    const { summary, clients } = data
    const chartData = clients.map(c => ({ name: c.name, revenue: c.revenue_gbp, tickets: c.tickets_sold }))

    const activeColors = resolvedTheme === 'dark'
        ? ['#ffffff', '#cccccc', '#999999', '#666666', '#444444']
        : ['#000000', '#333333', '#666666', '#999999', '#cccccc']

    const chartColors = resolvedTheme === 'dark'
        ? {
            grid: '#ffffff1a',
            text: '#ffffff40',
            tooltipBg: '#212121',
            tooltipBorder: 'rgba(255,255,255,0.1)',
            cursor: '#ffffff05',
            barFill: '#ffffff'
        }
        : {
            grid: '#d1d5db',
            text: '#6b7280',
            tooltipBg: '#ffffff',
            tooltipBorder: '#d1d5db',
            cursor: '#e5e7eb',
            barFill: '#000000'
        }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-end justify-between border-b border-gray-300 dark:border-white/10 pb-6">
                <div>
                    <p className="text-gray-600 dark:text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Platform Overview</p>
                    <h1 className="text-2xl font-bold text-black dark:text-white tracking-tight">Analytics Dashboard</h1>
                </div>
                <button onClick={load} className="btn-secondary group flex items-center gap-2">
                    <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                    <span>Refresh</span>
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Clients" value={summary.total_clients} />
                <StatCard icon={CalendarDays} label="Active Events" value={summary.total_events} />
                <StatCard icon={Ticket} label="Tickets Sold" value={summary.total_tickets_sold} />
                <StatCard icon={DollarSign} label="Platform Earnings" value={`£${summary.total_platform_earnings_gbp.toFixed(2)}`}
                    sub={`Gross: £${summary.total_revenue_gbp.toLocaleString()}`} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Revenue by Client */}
                <div className="card p-6">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-base font-semibold text-black dark:text-white flex items-center gap-2">
                            <TrendingUp size={16} className="text-black dark:text-white" /> Revenue by Client
                        </h2>
                        <ArrowUpRight size={16} className="text-gray-300 dark:text-white/20" />
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: chartColors.text, fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: chartColors.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                cursor={{ fill: chartColors.cursor }}
                                contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 12 }}
                                itemStyle={{ fontWeight: 600, color: resolvedTheme === 'dark' ? '#fff' : '#000', fontSize: 12 }}
                                labelStyle={{ fontWeight: 600, color: resolvedTheme === 'dark' ? '#fff' : '#000', marginBottom: 4 }}
                            />
                            <Bar dataKey="revenue" radius={[6, 6, 6, 6]} name="Revenue (£)" barSize={36}>
                                {chartData.map((_, i) => <Cell key={i} fill={activeColors[i % activeColors.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Tickets by Client */}
                <div className="card p-6">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-base font-semibold text-black dark:text-white flex items-center gap-2">
                            <Ticket size={16} className="text-black dark:text-white" /> Ticket Sales
                        </h2>
                        <ArrowUpRight size={16} className="text-gray-300 dark:text-white/20" />
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: chartColors.text, fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: chartColors.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                cursor={{ fill: chartColors.cursor }}
                                contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 12 }}
                                itemStyle={{ fontWeight: 600, color: resolvedTheme === 'dark' ? '#fff' : '#000', fontSize: 12 }}
                                labelStyle={{ fontWeight: 600, color: resolvedTheme === 'dark' ? '#fff' : '#000', marginBottom: 4 }}
                            />
                            <Bar dataKey="tickets" radius={[6, 6, 6, 6]} name="Tickets" barSize={36}>
                                {chartData.map((_, i) => <Cell key={i} fill={activeColors[i % activeColors.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Clients table */}
            <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-300 dark:border-white/10 flex items-center justify-between">
                    <h2 className="font-semibold text-black dark:text-white text-base">Client Overview</h2>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-gray-600 dark:bg-white/60 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-gray-500 dark:text-white/50">Live</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-500 dark:text-white/40 text-xs font-medium uppercase tracking-wider border-b border-gray-300 dark:border-white/10">
                                <th className="px-6 py-3 text-left">Client</th>
                                <th className="px-6 py-3 text-left">Domain</th>
                                <th className="px-6 py-3 text-right">Events</th>
                                <th className="px-6 py-3 text-right">Tickets Sold</th>
                                <th className="px-6 py-3 text-right">Revenue</th>
                                <th className="px-6 py-3 text-right">Fee</th>
                                <th className="px-6 py-3 text-right">Platform Yield</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                            {clients.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-black dark:text-white">{c.name}</td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-white/50 font-mono text-xs">{c.domain_name}</td>
                                    <td className="px-6 py-4 text-right text-gray-700 dark:text-white/70">{c.events}</td>
                                    <td className="px-6 py-4 text-right text-gray-700 dark:text-white/70">{c.tickets_sold}</td>
                                    <td className="px-6 py-4 text-right font-semibold text-black dark:text-white">£{c.revenue_gbp.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="px-2 py-0.5 bg-gray-200 dark:bg-white/10 rounded-md text-xs text-gray-700 dark:text-white/60">{c.platform_fee}%</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-semibold text-black dark:text-white">
                                        £{c.platform_earnings_gbp.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
