import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ConnectionList } from './ConnectionList';
import { ConnectionFormModal } from './ConnectionFormModal';
import { useConnectionStore } from '../../store/connectionStore';

export const ConnectionsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    connections,
    isLoading,
    fetchConnections,
    setActiveConnection,
    createConnection
  } = useConnectionStore();

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleAddConnection = () => {
    setIsModalOpen(true);
  };

  const handleCreateConnection = async (connectionData: Omit<import('../../types').Connection, 'id'>) => {
    await createConnection(connectionData);
  };

  const handleOpenConnection = (id: string) => {
    setActiveConnection(id);
    navigate(`/workspace/${id}`);
  };

  const handleBackup = () => {
    // TODO: Implement backup functionality
    console.log('Backup clicked');
  };

  const handleRestore = () => {
    // TODO: Implement restore functionality
    console.log('Restore clicked');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-[#111] text-white items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading connections...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen w-full bg-[#111] text-white font-sans overflow-hidden antialiased selection:bg-blue-500 selection:text-white">
        <Sidebar
          onBackup={handleBackup}
          onRestore={handleRestore}
          onCreate={handleAddConnection}
        />
        <div className="flex-1 flex flex-col h-full bg-[#141414] shadow-2xl relative z-10">
          <ConnectionList
            connections={connections}
            onAdd={handleAddConnection}
            onOpen={handleOpenConnection}
          />
        </div>
      </div>

      <ConnectionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateConnection}
      />
    </>
  );
};
