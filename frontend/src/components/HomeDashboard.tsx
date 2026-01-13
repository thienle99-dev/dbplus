import React, { useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
    Activity,
    Database,
    Plus,
    Clock,
    ArrowRight,
    BarChart3,
    Zap,
    ShieldCheck,
    Cpu,
    Globe
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { useConnectionStore } from '../store/connectionStore';

interface MainLayoutContext {
    openNewConnection: () => void;
}

const mockActivityData = [
    { name: '00:00', requests: 400, latency: 24 },
    { name: '04:00', requests: 300, latency: 18 },
    { name: '08:00', requests: 900, latency: 45 },
    { name: '12:00', requests: 1200, latency: 32 },
    { name: '16:00', requests: 1500, latency: 28 },
    { name: '20:00', requests: 800, latency: 22 },
    { name: '23:59', requests: 500, latency: 19 },
];

export const HomeDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { connections } = useConnectionStore();
    const { openNewConnection } = useOutletContext<MainLayoutContext>();

    const totalConnections = connections.length;
    const recentConnections = useMemo(() => connections.slice(0, 4), [connections]);

    const StatCard = ({ icon: Icon, label, value, trend, colorKey }: any) => (
        <div className="premium-card rounded-2xl p-6 group cursor-default">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl bg-${colorKey}/10 flex items-center justify-center text-${colorKey} ring-1 ring-${colorKey}/20 group-hover:scale-110 transition-all duration-500`}>
                    <Icon size={24} />
                </div>
                {trend && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-success/10 text-success border border-success/20">
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <p className="text-text-secondary text-xs uppercase tracking-widest font-bold mb-1">{label}</p>
                <p className="text-3xl font-black text-white glow-text">{value}</p>
            </div>
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 bg-${colorKey}/5 rounded-full blur-3xl group-hover:bg-${colorKey}/10 transition-all duration-700`} />
        </div>
    );

    return (
        <div className="flex flex-col h-full overflow-y-auto space-y-10 pb-10">
            {/* Hero Section */}
            <section className="relative py-10 rounded-3xl overflow-hidden px-8 border border-white/5 bg-gradient-to-br from-bg-1 to-transparent">
                <div className="relative z-10 max-w-2xl">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        <span className="text-xs font-semibold text-accent tracking-wide uppercase leading-relaxed">Enterprise Workspace</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-gradient mb-4">
                        Modern Database <br />
                        <span className="text-gradient-accent">Orchestration.</span>
                    </h1>
                    <p className="text-text-secondary text-lg leading-relaxed mb-8 max-w-md">
                        Manage, analyze, and optimize your global data infrastructure from a single premium interface.
                    </p>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={openNewConnection}
                            className="px-8 py-3.5 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold transition-all hover:scale-[1.02] shadow-xl shadow-accent/20 flex items-center gap-2 active:scale-95 group"
                        >
                            <Plus size={18} strokeWidth={3} />
                            Create Instance
                            <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button className="px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/10 hover:border-white/20">
                            Documentation
                        </button>
                    </div>
                </div>

                <div className="absolute top-0 right-0 w-1/2 h-full bg-grid-pattern opacity-10" />
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-10 right-20 flex gap-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
                    <Database size={120} className="text-white/10" />
                    <Globe size={100} className="text-white/10 mt-10" />
                </div>
            </section>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={Database} label="Resources Managed" value={totalConnections} trend="+12%" colorKey="info" />
                <StatCard icon={Activity} label="Health Score" value="98.4%" trend="Optimal" colorKey="success" />
                <StatCard icon={Zap} label="Requests / sec" value="1.2k" trend="+5.2%" colorKey="primary" />
                <StatCard icon={ShieldCheck} label="Security Audit" value="Secure" colorKey="warning" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Performance Chart */}
                <div className="xl:col-span-2 premium-card rounded-3xl p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-text-primary flex items-center gap-3">
                                <BarChart3 size={22} className="text-accent" />
                                Real-time Analytics
                            </h3>
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
                            <button className="px-3 py-1 text-xs font-bold bg-accent text-white rounded-md shadow-sm">24h</button>
                            <button className="px-3 py-1 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors">7d</button>
                            <button className="px-3 py-1 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors">30d</button>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={mockActivityData}>
                                <defs>
                                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-primary-default)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--color-primary-default)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-default)" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--color-bg-panel)',
                                        borderRadius: '16px',
                                        border: '1px solid var(--color-border-default)',
                                        backdropFilter: 'blur(10px)',
                                        boxShadow: 'var(--shadow-xl)'
                                    }}
                                    itemStyle={{ color: 'var(--color-text-primary)', fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="requests"
                                    stroke="var(--color-primary-default)"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorRequests)"
                                    animationDuration={2000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-8">
                    <div>
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-sm font-bold text-text-secondary tracking-widest uppercase flex items-center gap-2">
                                <Clock size={16} />
                                Recent Nodes
                            </h3>
                            <button
                                onClick={() => navigate('/connections')}
                                className="text-xs font-bold text-accent hover:underline"
                            >
                                All
                            </button>
                        </div>
                        <div className="space-y-3">
                            {recentConnections.map(conn => (
                                <div
                                    key={conn.id}
                                    onClick={() => navigate(`/workspace/${conn.id}`)}
                                    className="premium-card p-4 rounded-2xl flex items-center gap-4 cursor-pointer group hover:bg-bg-2"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center text-text-secondary group-hover:bg-accent group-hover:text-white transition-all duration-300">
                                        <Database size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-text-primary truncate group-hover:text-accent transition-colors">{conn.name}</h4>
                                        <p className="text-[10px] text-text-secondary mt-0.5 truncate uppercase tracking-tighter">{conn.type} • {conn.host}</p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                        <ArrowRight size={16} className="text-accent" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="premium-card p-6 rounded-3xl bg-gradient-to-br from-bg-1 to-bg-0 border-accent/20">
                        <h4 className="text-sm font-black text-text-primary mb-4 flex items-center gap-2">
                            <Cpu size={16} className="text-accent" />
                            Cluster Health
                        </h4>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-bold text-text-secondary uppercase">
                                    <span>CPU Usage</span>
                                    <span>42%</span>
                                </div>
                                <div className="h-1.5 w-full bg-bg-2 rounded-full overflow-hidden">
                                    <div className="h-full bg-accent rounded-full w-[42%]" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-bold text-text-secondary uppercase">
                                    <span>Memory Allocation</span>
                                    <span>65%</span>
                                </div>
                                <div className="h-1.5 w-full bg-bg-2 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full w-[65%]" />
                                </div>
                            </div>
                        </div>
                        <button className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 text-text-primary text-xs font-bold rounded-xl border border-white/10 transition-all">
                            Full Diagnostics Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
