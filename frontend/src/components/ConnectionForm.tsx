import { useState } from 'react';
import { X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import api from '../services/api';

interface ConnectionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ConnectionForm({ open, onOpenChange, onSuccess }: ConnectionFormProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    db_type: 'postgres',
    host: 'localhost',
    port: 5432,
    database: '',
    username: '',
    password: '',
    ssl: false,
  });

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await api.post('/api/connections/test', formData);
      const result = response.data;
      
      const message = result?.message || (result?.success ? 'Connection successful!' : 'Connection failed');
      alert(message);
    } catch (error: any) {
      console.error('Connection failed:', error);
      
      let errorMessage = 'Connection failed. Please check your connection details.';
      
      if (error.response?.data) {
        const data = error.response.data;
        if (data?.message) {
          errorMessage = data.message;
        } else if (typeof data === 'string') {
          errorMessage = data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Test connection first
      try {
        await api.post('/api/connections/test', formData);
      } catch (testError: any) {
        let testMsg = 'Connection failed during test.';
        if (testError.response?.data?.message) testMsg = testError.response.data.message;
        else if (typeof testError.response?.data === 'string') testMsg = testError.response.data;
        else if (testError.message) testMsg = testError.message;
        
        throw new Error(`Connection test failed: ${testMsg}`);
      }

      await api.post('/api/connections', formData);
      onSuccess();
      onOpenChange(false);
      setFormData({
        name: '',
        db_type: 'postgres',
        host: 'localhost',
        port: 5432,
        database: '',
        username: '',
        password: '',
        ssl: false,
      });
    } catch (error: any) {
      console.error('Failed to create connection:', error);
      let errorMessage = 'Failed to create connection.';
      
      if (error.response?.data) {
        const data = error.response.data;
        if (data?.message) {
          errorMessage = data.message;
        } else if (typeof data === 'string') {
          errorMessage = data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm data-[state=open]:animate-overlayShow" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-bg-1 p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow border border-border">
          <div className="flex justify-between items-center mb-5">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              New Connection
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-text-secondary hover:text-text-primary" aria-label="Close">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-text-secondary">Name</label>
              <input
                className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Database"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-text-secondary">Host</label>
                <input
                  className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-text-secondary">Port</label>
                <input
                  type="number"
                  className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-text-secondary">Database</label>
              <input
                className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                value={formData.database}
                onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-text-secondary">Username</label>
                <input
                  className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-text-secondary">Password</label>
                <input
                  type="password"
                  className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || loading}
                className="mr-auto text-text-secondary hover:text-text-primary px-4 py-2 rounded font-medium transition-colors disabled:opacity-50"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <Dialog.Close asChild>
                <button className="bg-bg-2 hover:bg-bg-0 text-text-primary px-4 py-2 rounded font-medium transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading || testing}
                className="bg-accent hover:bg-blue-600 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Connection'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
