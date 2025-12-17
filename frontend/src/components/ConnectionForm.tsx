import { useState } from 'react';
import { X, Shield, Lock, Terminal, Database } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    name: '',
    db_type: 'postgres',
    host: 'localhost',
    port: 5432,
    database: '',
    username: '',
    password: '',
    // SSH
    ssh_enabled: false,
    ssh_host: '',
    ssh_port: 22,
    ssh_user: '',
    ssh_auth_type: 'password', // 'password' or 'key'
    ssh_password: '',
    ssh_key_file: '',
    ssh_key_passphrase: '',
    // SSL
    ssl: false,
    ssl_mode: 'disable',
    ssl_ca_file: '',
    ssl_cert_file: '',
    ssl_key_file: '',
    // Advanced
    is_read_only: false,
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
        ssh_enabled: false,
        ssh_host: '',
        ssh_port: 22,
        ssh_user: '',
        ssh_auth_type: 'password',
        ssh_password: '',
        ssh_key_file: '',
        ssh_key_passphrase: '',
        ssl: false,
        ssl_mode: 'disable',
        ssl_ca_file: '',
        ssl_cert_file: '',
        ssl_key_file: '',
        is_read_only: false,
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
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[90vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-[var(--radius-lg)] bg-bg-1 p-0 shadow-2xl focus:outline-none data-[state=open]:animate-contentShow border border-border flex flex-col overflow-hidden">
          <div className="flex justify-between items-center p-5 border-b border-border bg-bg-2/30">
            <Dialog.Title className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Database size={18} className="text-accent" />
              New Connection
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-text-secondary hover:text-text-primary transition-colors p-1 hover:bg-bg-3 rounded-md" aria-label="Close">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-5 pt-4 bg-bg-1">
                <div className="flex border-b border-border">
                  <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                      activeTab === 'general'
                        ? 'text-accent border-accent'
                        : 'text-text-secondary border-transparent hover:text-text-primary'
                    }`}
                  >
                    General
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ssh')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                      activeTab === 'ssh'
                        ? 'text-accent border-accent'
                        : 'text-text-secondary border-transparent hover:text-text-primary'
                    }`}
                  >
                    <Terminal size={14} />
                    SSH Tunnel
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ssl')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                      activeTab === 'ssl'
                        ? 'text-accent border-accent'
                        : 'text-text-secondary border-transparent hover:text-text-primary'
                    }`}
                  >
                    <Shield size={14} />
                    SSL / TLS
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('advanced')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                      activeTab === 'advanced'
                        ? 'text-accent border-accent'
                        : 'text-text-secondary border-transparent hover:text-text-primary'
                    }`}
                  >
                    <Lock size={14} />
                    Advanced
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                  
                  {activeTab === 'general' && (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-text-secondary">Name</label>
                        <input
                          className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none transition-colors"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="My Database"
                          autoFocus
                          required
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 grid gap-2">
                          <label className="text-sm font-medium text-text-secondary">Host</label>
                          <input
                            className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none transition-colors"
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
                            className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none transition-colors"
                            value={formData.port}
                            onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-text-secondary">Database</label>
                        <input
                          className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none transition-colors"
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
                            className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none transition-colors"
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
                            className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none transition-colors"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                          />
                          <div className="text-[10px] text-text-secondary/70 flex items-center gap-1">
                            <Lock size={10} /> Saved securely in Keychain
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'ssh' && (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 mb-2 p-3 bg-bg-2/30 rounded border border-border/50">
                        <input
                          type="checkbox"
                          id="ssh_enabled"
                          className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                          checked={formData.ssh_enabled}
                          onChange={(e) => setFormData({ ...formData, ssh_enabled: e.target.checked })}
                        />
                        <label htmlFor="ssh_enabled" className="text-sm font-medium text-text-primary select-none cursor-pointer">
                          Use SSH Tunnel
                        </label>
                      </div>

                      {formData.ssh_enabled && (
                        <div className="flex flex-col gap-4 animate-in slide-in-from-top-2">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 grid gap-2">
                              <label className="text-sm font-medium text-text-secondary">SSH Host</label>
                              <input
                                className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                                value={formData.ssh_host}
                                onChange={(e) => setFormData({ ...formData, ssh_host: e.target.value })}
                                placeholder="ssh.example.com"
                              />
                            </div>
                            <div className="grid gap-2">
                              <label className="text-sm font-medium text-text-secondary">Port</label>
                              <input
                                type="number"
                                className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                                value={formData.ssh_port}
                                onChange={(e) => setFormData({ ...formData, ssh_port: parseInt(e.target.value) })}
                                placeholder="22"
                              />
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <label className="text-sm font-medium text-text-secondary">SSH User</label>
                            <input
                              className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                              value={formData.ssh_user}
                              onChange={(e) => setFormData({ ...formData, ssh_user: e.target.value })}
                              placeholder="root"
                            />
                          </div>

                          <div className="grid gap-2">
                             <label className="text-sm font-medium text-text-secondary">Authentication Type</label>
                             <select 
                                className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                                value={formData.ssh_auth_type}
                                onChange={(e) => setFormData({...formData, ssh_auth_type: e.target.value})}
                             >
                                <option value="password">Password</option>
                                <option value="key">Private Key</option>
                                <option value="agent" disabled>SSH Agent (Coming soon)</option>
                             </select>
                          </div>

                          {formData.ssh_auth_type === 'password' ? (
                            <div className="grid gap-2">
                              <label className="text-sm font-medium text-text-secondary">SSH Password</label>
                              <input
                                type="password"
                                className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                                value={formData.ssh_password}
                                onChange={(e) => setFormData({ ...formData, ssh_password: e.target.value })}
                                placeholder="••••••••"
                              />
                            </div>
                          ) : (
                            <div className="grid gap-2">
                              <label className="text-sm font-medium text-text-secondary">Private Key File</label>
                              <div className="flex gap-2">
                                 <input
                                    className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none flex-1"
                                    value={formData.ssh_key_file}
                                    onChange={(e) => setFormData({ ...formData, ssh_key_file: e.target.value })}
                                    placeholder="/path/to/id_rsa"
                                 />
                                 <button type="button" className="px-3 py-2 bg-bg-2 border border-border rounded hover:bg-bg-3 text-text-secondary">Browse</button>
                              </div>
                              
                              <label className="text-sm font-medium text-text-secondary mt-2">Passphrase (Optional)</label>
                              <input
                                type="password"
                                className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                                value={formData.ssh_key_passphrase}
                                onChange={(e) => setFormData({ ...formData, ssh_key_passphrase: e.target.value })}
                                placeholder="Key passphrase"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'ssl' && (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-text-secondary">SSL Mode</label>
                            <select 
                            className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none"
                            value={formData.ssl_mode}
                            onChange={(e) => setFormData({...formData, ssl_mode: e.target.value})}
                            >
                                <option value="disable">Disable</option>
                                <option value="require">Require</option>
                                <option value="verify-ca">Verify CA</option>
                                <option value="verify-full">Verify Full</option>
                            </select>
                        </div>

                        {formData.ssl_mode !== 'disable' && (
                            <div className="flex flex-col gap-4 animate-in slide-in-from-top-2">
                                 <div className="grid gap-2">
                                    <label className="text-sm font-medium text-text-secondary">CA Certificate (Root)</label>
                                    <textarea
                                      className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none font-mono text-xs h-20"
                                      value={formData.ssl_ca_file}
                                      onChange={(e) => setFormData({ ...formData, ssl_ca_file: e.target.value })}
                                      placeholder="-----BEGIN CERTIFICATE-----..."
                                    />
                                 </div>
                                 <div className="grid gap-2">
                                    <label className="text-sm font-medium text-text-secondary">Client Key</label>
                                    <textarea
                                      className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none font-mono text-xs h-20"
                                      value={formData.ssl_key_file}
                                      onChange={(e) => setFormData({ ...formData, ssl_key_file: e.target.value })}
                                      placeholder="-----BEGIN PRIVATE KEY-----..."
                                    />
                                 </div>
                                 <div className="grid gap-2">
                                    <label className="text-sm font-medium text-text-secondary">Client Certificate</label>
                                    <textarea
                                      className="bg-bg-0 border border-border rounded px-3 py-2 text-text-primary focus:border-accent focus:outline-none font-mono text-xs h-20"
                                      value={formData.ssl_cert_file}
                                      onChange={(e) => setFormData({ ...formData, ssl_cert_file: e.target.value })}
                                      placeholder="-----BEGIN CERTIFICATE-----..."
                                    />
                                 </div>
                            </div>
                        )}
                    </div>
                  )}

                  {activeTab === 'advanced' && (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                       <div className="flex items-center gap-3 p-4 bg-bg-2/30 rounded border border-border/50">
                            <Shield className="text-accent" size={20} />
                            <div className="flex-1">
                                <h4 className="text-sm font-medium text-text-primary">Read-Only Connection</h4>
                                <p className="text-xs text-text-secondary mt-0.5">Prevent accidental writes. This connection will reject INSERT, UPDATE, DELETE queries.</p>
                            </div>
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded border-border text-accent focus:ring-accent"
                                checked={formData.is_read_only}
                                onChange={(e) => setFormData({ ...formData, is_read_only: e.target.checked })}
                            />
                       </div>
                       
                       <div className="p-4 bg-bg-2/30 rounded border border-border/50">
                            <h4 className="text-sm font-medium text-text-primary mb-2">Connection Color</h4>
                            <div className="flex gap-2">
                                 <div className="w-6 h-6 rounded-full bg-blue-500 cursor-pointer ring-2 ring-offset-2 ring-offset-bg-1 ring-blue-500"></div>
                                 <div className="w-6 h-6 rounded-full bg-green-500 cursor-pointer opacity-50 hover:opacity-100"></div>
                                 <div className="w-6 h-6 rounded-full bg-yellow-500 cursor-pointer opacity-50 hover:opacity-100"></div>
                                 <div className="w-6 h-6 rounded-full bg-red-500 cursor-pointer opacity-50 hover:opacity-100"></div>
                                 <div className="w-6 h-6 rounded-full bg-purple-500 cursor-pointer opacity-50 hover:opacity-100"></div>
                            </div>
                       </div>
                    </div>
                  )}

                </div>

                <div className="flex justify-end gap-3 p-5 border-t border-border bg-bg-1">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing || loading}
                    className="mr-auto text-text-secondary hover:text-text-primary px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 text-sm"
                  >
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                  <Dialog.Close asChild>
                    <button className="bg-bg-2 hover:bg-bg-3 text-text-primary px-4 py-2 rounded font-medium transition-colors text-sm">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={loading || testing}
                    className="bg-accent hover:opacity-90 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 shadow-lg shadow-accent/20 text-sm"
                  >
                    {loading ? 'Creating...' : 'Create Connection'}
                  </button>
                </div>
              </form>
            </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
