import { useState, useEffect } from 'react';
import ReactJson from 'react-json-view';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { Copy, Check, X, FileJson, AlignLeft, RefreshCw } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import Button from './Button';
import { useToast } from '../../context/ToastContext';

interface JsonEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (value: string) => void;
    initialValue: string | object | null;
    readOnly?: boolean;
    title?: string;
}

export default function JsonEditorModal({
    isOpen,
    onClose,
    onSave,
    initialValue,
    readOnly = false,
    title = 'JSON Editor'
}: JsonEditorModalProps) {
    const { theme } = useSettingsStore();
    const { showToast } = useToast();
    const [mode, setMode] = useState<'text' | 'tree'>('tree');
    const [textValue, setTextValue] = useState('');
    const [jsonValue, setJsonValue] = useState<object>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        let initial = initialValue;
        if (typeof initial === 'string') {
            setTextValue(initial);
            try {
                const parsed = JSON.parse(initial);
                setJsonValue(parsed);
                setMode('tree');
            } catch (e) {
                setMode('text'); // Fallback to text if invalid JSON
                setJsonValue({});
            }
        } else if (typeof initial === 'object' && initial !== null) {
            setJsonValue(initial);
            setTextValue(JSON.stringify(initial, null, 2));
            setMode('tree');
        } else {
            setTextValue('');
            setJsonValue({});
            setMode('text');
        }
        setError(null);
    }, [isOpen, initialValue]);

    const handleTextChange = (val: string) => {
        setTextValue(val);
        try {
            const parsed = JSON.parse(val);
            setJsonValue(parsed);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleJsonChange = (edit: any) => {
        setJsonValue(edit.updated_src);
        setTextValue(JSON.stringify(edit.updated_src, null, 2));
        setError(null);
    };

    const handleFormat = () => {
        try {
            const parsed = JSON.parse(textValue);
            setTextValue(JSON.stringify(parsed, null, 2));
            setJsonValue(parsed);
            setError(null);
        } catch (e) {
            showToast('Invalid JSON, cannot format', 'error');
        }
    };

    const handleMinify = () => {
        try {
            const parsed = JSON.parse(textValue);
            setTextValue(JSON.stringify(parsed));
            setJsonValue(parsed);
            setError(null);
        } catch (e) {
            showToast('Invalid JSON, cannot minify', 'error');
        }
    };

    const handleSave = () => {
        if (error) {
            showToast('Cannot save invalid JSON', 'error');
            return;
        }
        onSave(textValue);
        onClose();
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(textValue);
            showToast('Copied to clipboard', 'success');
        } catch (err) {
            showToast('Failed to copy', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-bg-1 w-full max-w-4xl h-[80vh] rounded-lg shadow-2xl flex flex-col border border-border-light overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-light bg-bg-2">
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                        <FileJson size={16} className="text-accent" />
                        {title}
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-bg-1 rounded-lg p-0.5 border border-border-subtle">
                            <button
                                onClick={() => setMode('tree')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mode === 'tree' ? 'bg-bg-active text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                                    }`}
                            >
                                Tree
                            </button>
                            <button
                                onClick={() => setMode('text')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mode === 'text' ? 'bg-bg-active text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                                    }`}
                            >
                                Text
                            </button>
                        </div>
                        {!readOnly && (
                            <Button variant="ghost" size="sm" onClick={onClose} icon={<X size={16} />} />
                        )}
                    </div>
                </div>

                {/* Toolbar (Text Mode Only) */}
                {mode === 'text' && (
                    <div className="px-4 py-2 border-b border-border-light bg-bg-1 flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={handleFormat} icon={<AlignLeft size={14} />}>Format</Button>
                        <Button variant="secondary" size="sm" onClick={handleMinify} icon={<RefreshCw size={14} />}>Minify</Button>
                        <Button variant="secondary" size="sm" onClick={handleCopy} icon={<Copy size={14} />}>Copy</Button>
                        {error && <span className="text-xs text-error ml-2">{error}</span>}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-auto bg-bg-0">
                    {mode === 'tree' ? (
                        <div className="p-4 h-full overflow-auto custom-scrollbar">
                            <ReactJson
                                src={jsonValue}
                                theme={theme === 'dark' ? 'ocean' : 'rjv-default'}
                                style={{ backgroundColor: 'transparent', fontSize: '13px' }}
                                onEdit={readOnly ? false : handleJsonChange}
                                onAdd={readOnly ? false : handleJsonChange}
                                onDelete={readOnly ? false : handleJsonChange}
                                displayDataTypes={false}
                                displayObjectSize={true}
                                enableClipboard={true}
                                collapsed={2}
                            />
                        </div>
                    ) : (
                        <CodeMirror
                            value={textValue}
                            height="100%"
                            theme={theme === 'dark' ? oneDark : 'light'}
                            onChange={readOnly ? undefined : handleTextChange}
                            editable={!readOnly}
                            className="text-sm font-mono h-full"
                            basicSetup={{
                                lineNumbers: true,
                                bracketMatching: true,
                                closeBrackets: true,
                                autocompletion: true,
                            }}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-border-light bg-bg-2 flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>
                        {readOnly ? 'Close' : 'Cancel'}
                    </Button>
                    {!readOnly && (
                        <Button variant="primary" onClick={handleSave} icon={<Check size={16} />} disabled={!!error}>
                            Apply Changes
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
