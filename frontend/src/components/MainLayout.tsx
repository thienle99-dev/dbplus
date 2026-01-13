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
        <div className="h-screen flex text-text-primary font-sans bg-bg-0 overflow-hidden relative" data-tauri-drag-region>
            {/* Background Effects */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

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
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative z-10 py-6 pr-6">
                <main className="flex-1 overflow-auto custom-scrollbar">
                    <Outlet context={{
                        openNewConnection: () => setIsDbSelectorOpen(true),
                        editConnection: (conn: Connection) => {
                            setEditingConnection(conn);
                            setIsFormModalOpen(true);
                        }
                    }} />
                </main>
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
