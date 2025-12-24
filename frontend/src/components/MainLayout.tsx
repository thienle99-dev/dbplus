import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Connection } from '../types';
import { Sidebar } from './connections/Sidebar';
import { DatabaseSelectorModal } from './connections/DatabaseSelectorModal';
import { ConnectionFormModal } from './connections/ConnectionFormModal';
import { useConnectionStore } from '../store/connectionStore';
import DataToolsModal from './DataToolsModal';
import SettingsModal from './SettingsModal';

export const MainLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isdbSelectorOpen, setIsDbSelectorOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [dataToolsMode, setDataToolsMode] = useState<null | 'backup' | 'restore'>(null);
    const [selectedDbType, setSelectedDbType] = useState<string>('postgres');
    const [editingConnection, setEditingConnection] = useState<Connection | null>(null);

    // We need connections for the DataToolsModal and to pass to Outlet context if needed,
    // but mostly the child pages will fetch their own or use the store.
    const { connections, createConnection, updateConnection } = useConnectionStore();

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

    // Determine active tab based on path
    const getActiveTab = () => {
        if (location.pathname === '/' || location.pathname === '/dashboard') return 'dashboard';
        if (location.pathname === '/connections') return 'connections';
        if (location.pathname === '/queries') return 'queries';
        return 'dashboard';
    };

    return (
        <div className="h-screen flex text-text-primary font-sans bg-[var(--color-bg-default)] overflow-hidden" data-tauri-drag-region>
            <Sidebar
                activeTab={getActiveTab()}
                onBackup={() => setDataToolsMode('backup')}
                onRestore={() => setDataToolsMode('restore')}
                onCreate={() => setIsDbSelectorOpen(true)}
                onSettings={() => setIsSettingsOpen(true)}
                onNavigate={(tab) => {
                    if (tab === 'dashboard') navigate('/');
                    if (tab === 'connections') navigate('/connections');
                    if (tab === 'queries') navigate('/queries');
                }}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden py-6 px-6">
                <Outlet context={{
                    openNewConnection: () => setIsDbSelectorOpen(true),
                    editConnection: (conn: Connection) => {
                        setEditingConnection(conn);
                        setIsFormModalOpen(true);
                    }
                }} />
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
                    key={`main-layout:${dataToolsMode}`}
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
