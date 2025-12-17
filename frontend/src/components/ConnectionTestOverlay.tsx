import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import api from '../services/api';

interface ConnectionTestOverlayProps {
  connectionId: string;
  onSuccess: () => void;
  onFailure: (error: string) => void;
}

export default function ConnectionTestOverlay({ connectionId, onSuccess, onFailure }: ConnectionTestOverlayProps) {
  const [status, setStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const testConnection = async () => {
      try {
        setProgress(20);
        
        // Get connection details
        const { data: connection } = await api.get(`/api/connections/${connectionId}`);
        setProgress(40);

        // Test the connection - map fields to match test endpoint expectations
        const testPayload = {
          name: connection.name,
          type: connection.type, // Backend expects 'type', not 'db_type'
          host: connection.host,
          port: connection.port,
          database: connection.database,
          username: connection.username,
          password: connection.password,
          ssl: connection.ssl,
        };

        setProgress(60);
        const { data: testResult } = await api.post('/api/connections/test', testPayload);
        setProgress(80);

        if (testResult.success) {
          setStatus('success');
          setProgress(100);
          // Wait a bit to show success state
          setTimeout(() => {
            onSuccess();
          }, 800);
        } else {
          throw new Error(testResult.message || 'Connection test failed');
        }
      } catch (error: any) {
        setStatus('error');
        let errorMsg = 'Failed to connect to database.';
        
        if (error.response?.data) {
          const data = error.response.data;
          if (data?.message) {
            errorMsg = data.message;
          } else if (typeof data === 'string') {
            errorMsg = data;
          }
        } else if (error.message) {
          errorMsg = error.message;
        }
        
        setErrorMessage(errorMsg);
        onFailure(errorMsg);
      }
    };

    testConnection();
  }, [connectionId, onSuccess, onFailure]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="bg-bg-1 border border-border rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="mb-6">
            {status === 'testing' && (
              <div className="relative">
                <Loader2 size={64} className="text-accent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-accent/20 animate-pulse" />
                </div>
              </div>
            )}
            {status === 'success' && (
              <div className="relative">
                <CheckCircle size={64} className="text-green-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 animate-ping" />
                </div>
              </div>
            )}
            {status === 'error' && (
              <XCircle size={64} className="text-error" />
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            {status === 'testing' && 'Đang kết nối...'}
            {status === 'success' && 'Kết nối thành công'}
            {status === 'error' && 'Kết nối thất bại'}
          </h2>

          {/* Message */}
          <p className="text-sm text-text-secondary mb-6">
            {status === 'testing' && 'Vui lòng đợi trong khi hệ thống kiểm tra kết nối database...'}
            {status === 'success' && 'Database đã sẵn sàng. Đang tải workspace...'}
            {status === 'error' && errorMessage}
          </p>

          {/* Progress Bar */}
          {status === 'testing' && (
            <div className="w-full bg-bg-2 rounded-full h-2.5 mb-6 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-accent to-blue-400 h-full transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Error Actions */}
          {status === 'error' && (
            <div className="flex gap-3 w-full">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2.5 bg-accent hover:bg-blue-600 text-white rounded-lg font-medium transition-all hover:shadow-lg hover:scale-105"
              >
                Thử lại
              </button>
              <button
                onClick={() => window.history.back()}
                className="flex-1 px-4 py-2.5 bg-bg-2 hover:bg-bg-3 text-text-primary rounded-lg font-medium transition-all border border-border hover:border-accent/50"
              >
                Quay lại
              </button>
            </div>
          )}

          {/* Info */}
          {status === 'testing' && (
            <div className="flex items-start gap-2 mt-4 p-3 bg-accent/5 rounded-lg border border-accent/20 text-left w-full">
              <AlertCircle size={16} className="text-accent mt-0.5 flex-shrink-0" />
              <p className="text-xs text-text-secondary">
                Đảm bảo database có thể truy cập trước khi tải workspace.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
