import { useMemo } from 'react';
import { Code, Copy } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { useSettingsStore } from '../../store/settingsStore';
import { useToast } from '../../context/ToastContext';
import { TableColumn, IndexInfo, TableConstraints } from '../../types';

interface SqlDefinitionViewProps {
  schema: string;
  table: string;
  columns: TableColumn[];
  indexes: IndexInfo[];
  constraints: TableConstraints | null;
  sqlDefinition: string;
}

export default function SqlDefinitionView({
  schema: _schema,
  table: _table,
  columns: _columns,
  indexes: _indexes,
  constraints: _constraints,
  sqlDefinition,
}: SqlDefinitionViewProps) {
  const { showToast } = useToast();
  const { theme } = useSettingsStore();

  const codeMirrorTheme = useMemo(() => {
    let effectiveTheme = theme;
    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return effectiveTheme === 'dark' || effectiveTheme === 'midnight' ? oneDark : undefined;
  }, [theme]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Code size={12} className="md:w-3.5 md:h-3.5 text-text-secondary" />
          <h4 className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">SQL Definition</h4>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(sqlDefinition);
            showToast('SQL copied to clipboard', 'success');
          }}
          className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded transition-colors"
          title="Copy SQL to clipboard"
        >
          <Copy size={12} />
        </button>
      </div>
      <div className="bg-bg-0 border border-border rounded overflow-hidden">
        <CodeMirror
          value={sqlDefinition}
          height="auto"
          extensions={[
            sql(),
            EditorView.editable.of(false),
            ...(codeMirrorTheme ? [codeMirrorTheme] : [])
          ]}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLineGutter: false,
            highlightActiveLine: false,
          }}
          className="text-[10px] md:text-xs"
        />
      </div>
    </div>
  );
}
