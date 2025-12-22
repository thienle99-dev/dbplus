import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { connectionApi } from '../../services/connectionApi';
import ManagementPage from '../layouts/ManagementPage';
import { Plus, Trash2, Search, Database } from 'lucide-react';
import Button from '../ui/Button';
import CreateCouchbaseBucketModal from '../connections/CreateCouchbaseBucketModal';
import { useDialog } from '../../context/DialogContext';
import { useToast } from '../../context/ToastContext';

export default function BucketManagement() {
  const { connectionId } = useParams();
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const { showToast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: buckets = [], isLoading } = useQuery({
    queryKey: ['databases', connectionId],
    queryFn: () => connectionApi.getDatabases(connectionId!),
    enabled: !!connectionId,
  });

  const filteredBuckets = buckets.filter((bucket: string) => 
    bucket.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDropBucket = async (bucketName: string) => {
    const confirmed = await dialog.confirm({
      title: 'Drop Bucket',
      message: `Are you sure you want to drop the bucket "${bucketName}"? This action cannot be undone.`,
      variant: 'destructive',
      confirmLabel: 'Drop Bucket',
    });

    if (!confirmed) return;

    try {
      await connectionApi.dropDatabase(connectionId!, bucketName);
      showToast(`Bucket '${bucketName}' dropped successfully`, 'success');
      queryClient.invalidateQueries({ queryKey: ['databases', connectionId] });
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to drop bucket', 'error');
    }
  };

  return (
    <ManagementPage
      title="Buckets"
      primaryAction={{
        label: 'Add Bucket',
        icon: <Plus size={16} />,
        onClick: () => setIsCreateModalOpen(true),
      }}
      toolbar={
        <div className="relative w-full max-w-sm">
           <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
           <input 
             type="text" 
             placeholder="Search buckets..." 
             className="w-full pl-8 pr-3 py-1.5 bg-bg-2 border border-border rounded text-sm focus:outline-none focus:border-accent transition-colors"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      }
    >
      {isLoading ? (
        <div className="text-center py-10 text-text-secondary">Loading buckets...</div>
      ) : filteredBuckets.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg bg-bg-1">
          <Database size={48} className="mx-auto text-text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary mb-1">No Buckets Found</h3>
          <p className="text-sm text-text-secondary mb-4">Get started by creating your first bucket.</p>
          <Button variant="outline" onClick={() => setIsCreateModalOpen(true)}>
            Create Bucket
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
              {filteredBuckets.map((bucket: string) => (
                <tr key={bucket} className="group hover:bg-bg-0 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary flex items-center gap-3">
                    <Database size={16} className="text-accent opacity-80" />
                    {bucket}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDropBucket(bucket)}
                      className="p-1.5 text-text-muted hover:text-error hover:bg-error-bg rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Drop Bucket"
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

      <CreateCouchbaseBucketModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        connectionId={connectionId!}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['databases', connectionId] })}
      />
    </ManagementPage>
  );
}
