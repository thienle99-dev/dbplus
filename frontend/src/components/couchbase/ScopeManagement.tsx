import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { connectionApi } from '../../services/connectionApi';
import ManagementPage from '../layouts/ManagementPage';
import { Plus, Trash2, Search, Library } from 'lucide-react';
import Button from '../ui/Button';
import CreateCouchbaseScopeModal from './CreateCouchbaseScopeModal';
import { useDialog } from '../../context/DialogContext';
import { useToast } from '../../context/ToastContext';
import { useActiveDatabaseOverride } from '../../hooks/useActiveDatabaseOverride';
import { useDatabases } from '../../hooks/useDatabase';
import Select from '../ui/Select';
import { Database } from 'lucide-react';
import { extractApiErrorDetails } from '../../utils/apiError';

export default function ScopeManagement() {
  const { connectionId } = useParams();
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const { showToast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<string>('');
  
  const dbOverride = useActiveDatabaseOverride(connectionId);
  const { data: buckets = [] } = useDatabases(connectionId);

  // Sync selected bucket with global override or default to first bucket
  useEffect(() => {
    if (dbOverride) {
      setSelectedBucket(dbOverride);
    } else if (!selectedBucket && buckets.length > 0) {
      setSelectedBucket(buckets[0]);
    }
  }, [dbOverride, buckets, selectedBucket]);

  const activeBucket = selectedBucket || dbOverride;

  const { data: scopes = [], isLoading } = useQuery({
    queryKey: ['schemas', connectionId, activeBucket],
    queryFn: () => connectionApi.getSchemas(connectionId!, activeBucket ? { database: activeBucket } : undefined),
    enabled: !!connectionId && !!activeBucket,
  });

  const filteredScopes = scopes.filter((scope: string) => 
    scope !== '_default' && scope !== '_system' && scope.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const handleDropScope = async (scopeName: string) => {
    const confirmed = await dialog.confirm({
      title: 'Drop Scope',
      message: `Are you sure you want to drop the scope "${scopeName}"? This action cannot be undone and will delete all collections within it.`,
      variant: 'destructive',
      confirmLabel: 'Drop Scope',
    });

    if (!confirmed) return;

    try {
      await connectionApi.dropSchema(connectionId!, scopeName, activeBucket ? { database: activeBucket } : undefined);
      showToast(`Scope '${scopeName}' dropped successfully`, 'success');
      queryClient.invalidateQueries({ queryKey: ['schemas', connectionId] });
    } catch (error: any) {
      const { message } = extractApiErrorDetails(error);
      showToast(message || 'Failed to drop scope', 'error');
    }
  };

  const handleCreateScope = async (name: string, bucketName: string) => {
      try {
        const result = await connectionApi.createSchema(connectionId!, name, { database: bucketName });
        showToast(result.message || `Scope '${name}' created successfully`, result.success ? 'success' : 'error');
        queryClient.invalidateQueries({ queryKey: ['schemas', connectionId] });
        setIsCreateModalOpen(false);
      } catch (error: any) {
        const { message } = extractApiErrorDetails(error);
        showToast(message || 'Failed to create scope', 'error');
      }
  };


  return (
    <ManagementPage
      title="Scopes"
      primaryAction={{
        label: 'Add Scope',
        icon: <Plus size={16} />,
        onClick: () => setIsCreateModalOpen(true),
      }}
      toolbar={
        <div className="flex items-center gap-2 w-full max-w-lg">
           <div className="w-48">
             <Select
                value={activeBucket || ''}
                onChange={setSelectedBucket}
                options={buckets.map(b => ({ label: b, value: b, icon: <Database size={14} /> }))}
                placeholder="Select Bucket"
                size="sm"
                searchable
             />
           </div>
           <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search scopes..." 
              className="w-full pl-8 pr-3 py-1.5 bg-bg-2 border border-border rounded text-sm focus:outline-none focus:border-accent transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
           </div>
        </div>
      }
    >
      {isLoading ? (
        <div className="text-center py-10 text-text-secondary">Loading scopes...</div>
      ) : filteredScopes.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg bg-bg-1">
          <Library size={48} className="mx-auto text-text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary mb-1">No Scopes Found</h3>
          <p className="text-sm text-text-secondary mb-4">Scopes categorize collections. Create one to get started.</p>
          <Button variant="outline" onClick={() => setIsCreateModalOpen(true)}>
            Create Scope
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-bg-1 shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-2 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium text-right w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {filteredScopes.map((scope: string) => (
                <tr key={scope} className="group hover:bg-bg-0 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary flex items-center gap-3">
                    <Library size={16} className="text-accent opacity-80" />
                    {scope}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDropScope(scope)}
                      className="p-1.5 text-text-muted hover:text-error hover:bg-error-bg rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Drop Scope"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateCouchbaseScopeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateScope}
        connectionId={connectionId!}
        defaultBucket={activeBucket || undefined}
      />
    </ManagementPage>
  );
}
