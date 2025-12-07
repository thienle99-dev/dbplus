import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Database, FileText, Clock, Settings, LogOut, Plus } from 'lucide-react';
import SchemaTree from './SchemaTree';
import SavedQueriesList from './SavedQueriesList';
import QueryHistory from './QueryHistory';
import { SettingsModal } from './settings/SettingsModal';
import { CommandPalette } from './CommandPalette';

export default function Sidebar() {
  const navigate = useNavigate();
  const { connectionId } = useParams();
  const [activeTab, setActiveTab] = useState<'items' | 'queries' | 'history'>('items');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mock handler for selecting a query from history/saved
  const handleSelectQuery = (sql: string) => {
    navigate(`/workspace/${connectionId}/query`, { state: { sql } });
  };

  return (
    <div className="w-64 bg-bg-1 pb-[30px] border-r border-border flex flex-col h-screen flex-shrink-0">

      {/* Search Header */}
      <div className="p-3 border-b border-border space-y-3">
        {/* Global Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-2.5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg-2 border border-border rounded pl-8 pr-3 py-1.5 text-sm text-text-primary focus:border-accent outline-none"
            />
          </div>
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="px-2 py-1.5 bg-bg-2 border border-border rounded text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
            title="Switch Database (Cmd+K)"
          >
            <Database size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-bg-2 p-0.5 rounded border border-border">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex-1 flex items-center justify-center py-1 rounded text-xs font-medium transition-all ${activeTab === 'items' ? 'bg-bg-1 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            title="Items"
          >
            <Database size={14} />
          </button>
          <button
            onClick={() => setActiveTab('queries')}
            className={`flex-1 flex items-center justify-center py-1 rounded text-xs font-medium transition-all ${activeTab === 'queries' ? 'bg-bg-1 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            title="Saved Queries"
          >
            <FileText size={14} />
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center py-1 rounded text-xs font-medium transition-all ${activeTab === 'history' ? 'bg-bg-1 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            title="History"
          >
            <Clock size={14} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'items' && (
          <div className="flex flex-col">
            <div className="px-3 py-2 flex justify-between items-center text-xs font-semibold text-text-secondary uppercase tracking-wider">
              <span>Explorer</span>
              <button
                onClick={() => navigate(`/workspace/${connectionId}/query`)}
                className="p-1 hover:bg-bg-2 rounded text-accent hover:text-accent-hover"
                title="New Query"
              >
                <Plus size={14} />
              </button>
            </div>
            <SchemaTree searchTerm={searchTerm} />
          </div>
        )}

        {activeTab === 'queries' && (
          <SavedQueriesList
            onSelectQuery={handleSelectQuery}
            embedded={true}
            searchTerm={searchTerm}
          />
        )}

        {activeTab === 'history' && (
          <QueryHistory
            onSelectQuery={handleSelectQuery}
            embedded={true}
            searchTerm={searchTerm}
          />
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border space-y-1 bg-bg-1 z-10">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-full flex items-center gap-2 p-2 hover:bg-bg-2 rounded text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <Settings size={16} />
          Settings
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-2 p-2 hover:bg-bg-2 rounded text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <LogOut size={16} />
          Disconnect
        </button>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}
