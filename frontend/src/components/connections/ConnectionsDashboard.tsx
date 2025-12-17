import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Connection } from '../../types';
import { Sidebar } from './Sidebar';
import { ConnectionList } from './ConnectionList';
import { DatabaseSelectorModal } from './DatabaseSelectorModal';
import { ConnectionFormModal } from './ConnectionFormModal';
import { useConnectionStore } from '../../store/connectionStore';
import DataToolsModal from '../DataToolsModal';
import SettingsModal from '../SettingsModal';

export const ConnectionsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isdbSelectorOpen, setIsDbSelectorOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dataToolsMode, setDataToolsMode] = useState<null | 'backup' | 'restore'>(null);
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
      <div className="flex h-screen w-full bg-bg-0 items-center justify-center">
        <div className="text-text-secondary font-mono animate-pulse">Loading connections...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex text-text-primary font-sans bg-bg-0 overflow-hidden">
      <Sidebar
        onBackup={() => setDataToolsMode('backup')}
        onRestore={() => setDataToolsMode('restore')}
        onCreate={() => setIsDbSelectorOpen(true)}
        onSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-bg-0">
        {/* Search Header Area (handled by ConnectionList mostly, but we can add a drag region) */}
        <div className="h-4 w-full bg-bg-0 draggable-region" />

        {/* Connection List */}
        <div className="flex-1 overflow-hidden p-4 md:p-6">
          <div className="h-full flex flex-col rounded-2xl bg-bg-1/95 shadow-[0_18px_40px_rgba(0,0,0,0.25)] overflow-hidden">
            {error && (
              <div className="m-4 mb-0 p-3 bg-error/10 border border-error/30 rounded text-error text-sm">
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
      </div>

      <ConnectionFormModal
        isOpen={isFormModalOpen}
        onClose={() => { setIsFormModalOpen(false); setEditingConnection(null); }}
        onSubmit={handleFormSubmit}
        initialValues={editingConnection || undefined}
        initialType={editingConnection ? editingConnection.type : (selectedDbType as Connection['type'])}
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

      {dataToolsMode && (
        <DataToolsModal
          key={`connections-dashboard:${dataToolsMode}`}
          isOpen
          onClose={() => setDataToolsMode(null)}
          initialMode={dataToolsMode}
          connections={connections}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
