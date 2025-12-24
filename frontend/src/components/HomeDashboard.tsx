import { useNavigate, useOutletContext } from 'react-router-dom';
import { Activity, Database, Plus, Clock, Server, ArrowRight } from 'lucide-react';
import { useConnectionStore } from '../store/connectionStore';

interface MainLayoutContext {
    openNewConnection: () => void;
}

export const HomeDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { connections } = useConnectionStore();
    const { openNewConnection } = useOutletContext<MainLayoutContext>();

    // Mock stats for now - in a real app these would come from an API or store
    const totalConnections = connections.length;
    const activeConnections = connections.filter(c => c.type === 'postgres' || c.type === 'mysql').length; // Mock logic
    const recentConnections = connections.slice(0, 3); // Just take first 3 for demo

    const StatCard = ({ icon: Icon, label, value, color }: any) => (
        <div className="bg-bg-1 border border-border-light rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden group hover:border-accent/50 transition-colors">
            <div className={`w-12 h-12 rounded-xl bg-${color}-500/10 flex items-center justify-center text-${color}-500 ring-1 ring-${color}-500/20 group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-text-secondary text-xs uppercase tracking-wider font-bold">{label}</p>
                <p className="text-2xl font-black text-text-primary mt-1">{value}</p>
            </div>
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-${color}-500/5 rounded-full blur-2xl group-hover:bg-${color}-500/10 transition-colors`} />
        </div>
    );

    return (
        <div className="flex flex-col h-full overflow-y-auto pr-2">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-text-primary tracking-tight mb-2">Welcome Back</h1>
                <p className="text-text-secondary">Here's what's happening in your database workspace.</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <StatCard icon={Database} label="Total Resources" value={totalConnections} color="blue" />
                <StatCard icon={Activity} label="Active Sessions" value={activeConnections} color="emerald" />
                <StatCard icon={Server} label="System Status" value="Healthy" color="indigo" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity / Connections */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                            <Clock size={18} className="text-accent" />
                            Recent Connections
                        </h3>
                        <button
                            onClick={() => navigate('/connections')}
                            className="text-sm font-medium text-text-secondary hover:text-accent transition-colors flex items-center gap-1"
                        >
                            View All <ArrowRight size={14} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {recentConnections.length > 0 ? (
                            recentConnections.map(conn => (
                                <div
                                    key={conn.id}
                                    onClick={() => navigate(`/workspace/${conn.id}`)}
                                    className="group flex items-center gap-4 p-4 bg-bg-1 border border-border-light rounded-2xl cursor-pointer hover:border-accent hover:shadow-lg hover:shadow-accent/5 transition-all"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-bg-2 flex items-center justify-center text-text-secondary group-hover:bg-accent group-hover:text-white transition-colors">
                                        <Database size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-text-primary group-hover:text-accent transition-colors">{conn.name}</h4>
                                        <p className="text-xs text-text-secondary mt-0.5">{conn.type} • {conn.host}</p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowRight size={18} className="text-accent" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center bg-bg-1 border border-border-dashed rounded-2xl text-text-secondary">
                                No recent connections found.
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-text-primary">Quick Actions</h3>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={openNewConnection}
                            className="flex items-center gap-3 p-4 bg-gradient-to-br from-accent to-blue-600 rounded-2xl text-white shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02] active:scale-95 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <Plus size={20} strokeWidth={3} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold">New Connection</p>
                                <p className="text-xs text-white/80">Add a database source</p>
                            </div>
                        </button>

                        <button className="flex items-center gap-3 p-4 bg-bg-1 border border-border-light rounded-2xl text-text-primary hover:border-accent/50 hover:bg-bg-2 transition-all text-left">
                            <div className="w-10 h-10 rounded-xl bg-bg-2 flex items-center justify-center text-emerald-500">
                                <Activity size={20} />
                            </div>
                            <div>
                                <p className="font-bold">System Health</p>
                                <p className="text-xs text-text-secondary">View resource usage</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
