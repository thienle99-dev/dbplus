import Modal from './ui/Modal';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { useSettingsStore } from '../store/settingsStore';
import { useViewDefinition, useFunctionDefinition } from '../hooks/useDatabase';
import { Copy, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ObjectDefinitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  schema: string;
  objectName: string;
  type: 'view' | 'function';
}

export default function ObjectDefinitionModal({
  isOpen,
  onClose,
  connectionId,
  schema,
  objectName,
  type
}: ObjectDefinitionModalProps) {
  const { theme } = useSettingsStore();
  const { showToast } = useToast();

  const isView = type === 'view';

  // Only fetch if isOpen to avoid unnecessary requests when hidden
  const { data: viewDef, isLoading: loadingView } = useViewDefinition(
    connectionId,
    schema,
    (isOpen && isView) ? objectName : undefined
  );
  const { data: funcDef, isLoading: loadingFunc } = useFunctionDefinition(
    connectionId,
    schema,
    (isOpen && !isView) ? objectName : undefined
  );

  const definition = isView ? viewDef?.definition : funcDef?.definition;
  const isLoading = isView ? loadingView : loadingFunc;
  const owner = isView ? viewDef?.owner : funcDef?.owner;

  const handleCopy = () => {
    if (definition) {
      navigator.clipboard.writeText(definition);
      showToast('Copied to clipboard', 'success');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${type === 'view' ? 'View' : 'Function'}: ${objectName}`}
      size="xl"
    >
      <div className="flex flex-col h-[60vh] -mx-6 -my-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-accent" size={24} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
              <div className="text-sm text-text-secondary">
                Owner: <span className="text-text-primary font-medium">{owner || '-'}</span>
                {!isView && funcDef && (
                  <span className="ml-4">
                    Language: <span className="text-text-primary font-medium">{funcDef.language || '-'}</span>
                    <span className="ml-4 text-text-tertiary">|</span>
                    <span className="ml-4">
                      Returns: <span className="text-text-primary font-medium">{funcDef.return_type || '-'}</span>
                    </span>
                  </span>
                )}
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2 py-1 hover:bg-bg-3 rounded text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                <Copy size={12} />
                Copy
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CodeMirror
                value={definition || '-- No definition found'}
                height="100%"
                theme={theme === 'dark' ? 'dark' : 'light'}
                extensions={[sql()]}
                editable={false}
                className="h-full text-sm"
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
