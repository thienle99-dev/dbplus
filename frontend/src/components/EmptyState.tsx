import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

export default function EmptyState() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-48 h-48 mb-4 opacity-80">
                <img
                    src="/workspace_welcome.png"
                    alt="Welcome to Workspace"
                    className="w-full h-full object-contain"
                />
            </div>
            <h1 className="text-xl font-semibold mb-2 text-text-primary">Welcome to Workspace</h1>
            <p className="text-text-secondary max-w-sm mb-6 text-sm">
                Select a table from the sidebar to explore your data, or start writing a new SQL query.
            </p>

            <div className="flex gap-4">
                <button
                    onClick={() => navigate('query')}
                    className="flex items-center gap-2 px-5 py-2 bg-[var(--color-primary-default)] hover:bg-[var(--color-primary-active)] text-white rounded-lg font-black uppercase tracking-widest text-xs transition-all shadow-lg hover:shadow-[var(--color-primary-transparent)]/50 transition-all active:scale-95"
                >
                    <Plus size={16} strokeWidth={3} />
                    New Query
                </button>
            </div>
        </div>
    );
}
