import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Connection } from '../../types';
import { Sidebar } from './Sidebar';
import { ConnectionList } from './ConnectionList';
import { DatabaseSelectorModal } from './DatabaseSelectorModal';
import { ConnectionFormModal } from './ConnectionFormModal';
import { useConnectionStore } from '../../store/connectionStore';

export const ConnectionsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isdbSelectorOpen, setIsDbSelectorOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedDbType, setSelectedDbType] = useState<string>('postgres');
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const { connections, isLoading, error, fetchConnections, createConnection, updateConnection } = useConnectionStore();

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleFormSubmit = async (connectionData: Omit<Connection, 'id'>) => {
    if (editingConnection) {
      await updateConnection(editingConnection.id, connectionData);
      setEditingConnection(null);
      setIsFormModalOpen(false);
    } else {
      const newConnection = await createConnection({ ...connectionData, type: selectedDbType as Connection['type'] });
      if (newConnection) {
        setIsFormModalOpen(false);
        navigate(`/workspace/${newConnection.id}`);
      }
    }
  };

  const handleEdit = (connection: Connection) => {
    setEditingConnection(connection);
    setIsFormModalOpen(true);
  };

  if (isLoading && connections.length === 0) {
    return (
      <div className="flex h-screen w-full bg-[#1e1e1e] items-center justify-center">
        <div className="text-gray-400 font-mono animate-pulse">Loading connections...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex text-gray-200 font-sans selection:bg-blue-500/30 bg-[#1e1e1e] overflow-hidden">
      <Sidebar
        onBackup={() => console.log('Backup not implemented')}
        onRestore={() => console.log('Restore not implemented')}
        onCreate={() => setIsDbSelectorOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
        {/* Search Header Area (handled by ConnectionList mostly, but we can add a drag region) */}
        <div className="h-4 w-full bg-[#1e1e1e] draggable-region" />

        {/* Connection List */}
        <div className="flex-1 overflow-hidden p-2">
          {error && (
            <div className="mx-4 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
              {error}
            </div>
          )}
          <ConnectionList
            connections={connections}
            onAdd={() => setIsDbSelectorOpen(true)}
            onOpen={(id) => navigate(`/workspace/${id}`)}
            onEdit={handleEdit}
          />
        </div>
      </div>

      <ConnectionFormModal
        isOpen={isFormModalOpen}
        onClose={() => { setIsFormModalOpen(false); setEditingConnection(null); }}
        onSubmit={handleFormSubmit}
        initialValues={editingConnection || undefined}
      />

      <DatabaseSelectorModal
        isOpen={isdbSelectorOpen}
        onClose={() => setIsDbSelectorOpen(false)}
        onSelect={(type) => {
          setIsDbSelectorOpen(false);
          setSelectedDbType(type);
          setIsFormModalOpen(true);
        }}
      />
    </div>
  );
};
