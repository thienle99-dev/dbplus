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
        setProgress(30);
        
        // Test the connection using secure endpoint (no password exposure)
        const { data: testResult } = await api.post(`/api/connections/${connectionId}/test`);
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
        let errorMsg = 'Unable to connect to database.';
        let errorDetail = '';
        
        if (error.response?.data) {
          const data = error.response.data;
          const rawError = data?.message || (typeof data === 'string' ? data : '');
          
          // Parse and provide user-friendly error messages
          if (rawError.includes('connection refused') || rawError.includes('Connection refused')) {
            errorMsg = 'Cannot connect to database server';
            errorDetail = 'Please check:\n• Is the database server running?\n• Are the host and port correct?\n• Is the connection blocked by a firewall?';
          } else if (rawError.includes('password authentication failed') || rawError.includes('authentication failed')) {
            errorMsg = 'Authentication failed';
            errorDetail = 'The username or password is incorrect. Please verify your credentials.';
          } else if (rawError.includes('does not exist') || rawError.includes('database') && rawError.includes('not exist')) {
            errorMsg = 'Database does not exist';
            errorDetail = 'The specified database does not exist on the server. Please check the database name.';
          } else if (rawError.includes('timeout') || rawError.includes('timed out')) {
            errorMsg = 'Connection timeout';
            errorDetail = 'The database server did not respond in time. Please check your network connection or timeout settings.';
          } else if (rawError.includes('SSL') || rawError.includes('ssl')) {
            errorMsg = 'SSL/TLS error';
            errorDetail = 'There is an issue with the SSL connection. Please check your database SSL configuration.';
          } else if (rawError.includes('too many connections')) {
            errorMsg = 'Too many connections';
            errorDetail = 'The database has reached its connection limit. Please try again later or contact your administrator.';
          } else if (rawError.includes('host') || rawError.includes('hostname')) {
            errorMsg = 'Host not found';
            errorDetail = 'Unable to resolve the hostname. Please check the host address.';
          } else {
            errorMsg = 'Database connection error';
            errorDetail = rawError || 'An unknown error occurred while connecting.';
          }
        } else if (error.message) {
          errorMsg = 'Connection error';
          errorDetail = error.message;
        }
        
        setErrorMessage(errorDetail || errorMsg);
        onFailure(errorDetail || errorMsg);
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
            {status === 'error' && (
              <span className="block">
                <span className="block text-error font-medium mb-2">{errorMessage.split('\n')[0]}</span>
                {errorMessage.includes('\n') && (
                  <span className="block text-xs text-text-secondary whitespace-pre-line bg-bg-2/50 p-3 rounded border border-border/50 text-left">
                    {errorMessage.split('\n').slice(1).join('\n')}
                  </span>
                )}
              </span>
            )}
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
