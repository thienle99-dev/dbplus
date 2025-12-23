import { useNavigate } from 'react-router-dom';
import { Plus, Database, Trash, Search, X } from 'lucide-react';
import { useConnections, useDeleteConnection } from '../hooks/useConnections';
import { useState } from 'react';

import ConnectionForm from './ConnectionForm';
import { useDialog } from '../context/DialogContext';

export default function ConnectionList() {
  const { data: connections = [], isLoading: loading, error } = useConnections();
  const deleteConnection = useDeleteConnection();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const navigate = useNavigate();
  const dialog = useDialog();
  const [searchTerm, setSearchTerm] = useState('');

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await dialog.confirm(
      'Delete Connection',
      'Are you sure you want to delete this connection?',
      { variant: 'danger' }
    );
    if (confirmed) {
      try {
        await deleteConnection.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete connection:', error);
      }
    }
  };

  if (error) {
    return <div className="p-8 text-center text-error">Failed to load connections</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Connections</h1>
          <p className="text-text-secondary mt-1">Manage your database connections</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
            <input
              type="text"
              placeholder="Search connections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 py-2 bg-bg-1 border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent w-64 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-md transition-colors font-medium h-[38px]"
          >
            <Plus size={18} />
            New Connection
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-text-secondary">Loading connections...</div>
      ) : connections.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border-light rounded-lg bg-bg-1">
          <Database size={48} className="mx-auto text-text-secondary mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No connections yet</h3>
          <p className="text-text-secondary mb-6">Create your first database connection to get started</p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-md transition-colors font-medium"
          >
            Create Connection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.host.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.database.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.type.toLowerCase().includes(searchTerm.toLowerCase())
          ).map((conn) => (
            <div
              key={conn.id}
              onClick={() => navigate(`/workspace/${conn.id}`)}
              className="group bg-bg-1 border border-border-light rounded-lg p-4 hover:border-accent transition-colors cursor-pointer relative"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-bg-2 rounded-md">
                  <Database size={20} className="text-accent" />
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleDelete(conn.id, e)}
                    className="p-1.5 hover:bg-bg-2 rounded text-text-secondary hover:text-error transition-colors"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>

              <h3 className="font-medium text-text-primary mb-1">{conn.name}</h3>
              <div className="text-sm text-text-secondary flex flex-col gap-0.5">
                <span>{conn.type} • {conn.host}</span>
                <span>{conn.database}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConnectionForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={() => {/* Query invalidation handles refresh */ }}
      />
    </div>
  );
}
