import { useNavigate, useParams } from 'react-router-dom';

import SchemaTree from './SchemaTree';
import { Settings, LogOut } from 'lucide-react';

export default function Sidebar() {
  const navigate = useNavigate();
  const { connectionId } = useParams();

  return (
    <div className="w-64 bg-bg-1 border-r border-border flex flex-col h-screen">
      <div className="p-2 border-b border-border flex flex-col gap-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Explorer</span>
        </div>
        <button 
          onClick={() => navigate(`/workspace/${connectionId}/query`)}
          className="flex items-center gap-2 px-2 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded text-sm font-medium transition-colors"
        >
          <code className="text-xs">SQL</code>
          New Query
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <SchemaTree />
      </div>

      <div className="p-2 border-t border-border space-y-1">
        <button className="w-full flex items-center gap-2 p-2 hover:bg-bg-2 rounded text-sm text-text-secondary hover:text-text-primary transition-colors">
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
    </div>
  );
}
