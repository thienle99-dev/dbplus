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
      <div className="flex h-screen w-full bg-[var(--color-bg-default)] items-center justify-center">
        <div className="text-text-secondary font-mono animate-pulse uppercase tracking-[0.2em] text-[10px]">Loading connections...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex text-text-primary font-sans bg-[var(--color-bg-default)] overflow-hidden" data-tauri-drag-region>
      <Sidebar
        onBackup={() => setDataToolsMode('backup')}
        onRestore={() => setDataToolsMode('restore')}
        onCreate={() => setIsDbSelectorOpen(true)}
        onSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden py-6 px-6">
        <header className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">Connections</h2>
        </header>

        {/* Connection List Container */}
        <div className="flex-1 overflow-hidden">
          {error && (
            <div className="mx-10 mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[var(--color-error)] text-sm font-black uppercase tracking-wide glass">
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
