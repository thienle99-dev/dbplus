import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

export default function EmptyState() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-64 h-64 mb-6 opacity-80">
                <img
                    src="/Users/thienle/.gemini/antigravity/brain/30a54432-4735-4474-b46b-e5302cdc1b96/empty_state_fishbowl_1764996610578.png"
                    alt="Welcome to Workspace"
                    className="w-full h-full object-contain"
                />
            </div>
            <h1 className="text-2xl font-semibold mb-2 text-text-primary">Welcome to Workspace</h1>
            <p className="text-text-secondary max-w-md mb-8">
                Select a table from the sidebar to explore your data, or start writing a new SQL query.
            </p>

            <div className="flex gap-4">
                <button
                    onClick={() => navigate('query')}
                    className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded font-medium transition-colors"
                >
                    <Plus size={18} />
                    New Query
                </button>
            </div>
        </div>
    );
}
