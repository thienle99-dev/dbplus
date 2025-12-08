import { useState, useEffect } from 'react';
import { Key, Plus, X, Save } from 'lucide-react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { TableColumn, IndexInfo } from '../../types';
import Select from '../ui/Select';

interface IndexesSectionProps {
  schema: string;
  table: string;
  columns: TableColumn[];
  indexes: IndexInfo[];
  onIndexCreated: (newIndex: IndexInfo) => void;
}

export default function IndexesSection({
  schema,
  table,
  columns,
  indexes,
  onIndexCreated,
}: IndexesSectionProps) {
  const params = useParams();
  const connectionId = params.connectionId;
  const { showToast } = useToast();
  const [showNewIndex, setShowNewIndex] = useState(false);
  const [newIndexName, setNewIndexName] = useState('');
  const [newIndexColumns, setNewIndexColumns] = useState<string[]>([]);
  const [newIndexUnique, setNewIndexUnique] = useState(false);
  const [newIndexAlgorithm, setNewIndexAlgorithm] = useState('BTREE');
  const [newIndexCondition, setNewIndexCondition] = useState('');
  const [newIndexInclude, setNewIndexInclude] = useState<string[]>([]);
  const [newIndexComment, setNewIndexComment] = useState('');
  const [creating, setCreating] = useState(false);

  const toggleColumn = (columnName: string) => {
    if (newIndexColumns.includes(columnName)) {
      setNewIndexColumns(newIndexColumns.filter(c => c !== columnName));
    } else {
      setNewIndexColumns([...newIndexColumns, columnName]);
    }
  };

  useEffect(() => {
    if (newIndexColumns.length > 0 && !newIndexName) {
      const columnPart = newIndexColumns.join('_');
      const generatedName = `idx_${columnPart}`;
      setNewIndexName(generatedName);
    }
  }, [newIndexColumns, newIndexName]);

  const handleCreateIndex = async () => {
    if (!newIndexName.trim() || newIndexColumns.length === 0) {
      showToast('Please provide index name and select at least one column', 'error');
      return;
    }

    setCreating(true);
    try {
      const indexType = newIndexUnique ? 'UNIQUE INDEX' : 'INDEX';
      const columnList = newIndexColumns.map(col => `"${col}"`).join(', ');

      let sql = `CREATE ${indexType} "${newIndexName}" ON "${schema}"."${table}"`;

      if (newIndexAlgorithm && newIndexAlgorithm !== 'BTREE') {
        sql += ` USING ${newIndexAlgorithm}`;
      }

      sql += ` (${columnList})`;

      if (newIndexInclude.length > 0) {
        const includeList = newIndexInclude.map(col => `"${col}"`).join(', ');
        sql += ` INCLUDE (${includeList})`;
      }

      if (newIndexCondition.trim()) {
        sql += ` WHERE ${newIndexCondition}`;
      }

      sql += ';';

      if (newIndexComment.trim()) {
        sql += `\nCOMMENT ON INDEX "${newIndexName}" IS '${newIndexComment.replace(/'/g, "''")}';`;
      }

      await api.post(`/api/connections/${connectionId}/query`, {
        query: sql,
      });

      showToast('Index created successfully', 'success');

      const newIndex: IndexInfo = {
        name: newIndexName,
        columns: newIndexColumns,
        is_unique: newIndexUnique,
        is_primary: false,
        algorithm: newIndexAlgorithm,
        condition: newIndexCondition || undefined,
        include: newIndexInclude.length > 0 ? newIndexInclude : undefined,
        comment: newIndexComment || undefined,
      };
      onIndexCreated(newIndex);

      setShowNewIndex(false);
      setNewIndexName('');
      setNewIndexColumns([]);
      setNewIndexUnique(false);
      setNewIndexAlgorithm('BTREE');
      setNewIndexCondition('');
      setNewIndexInclude([]);
      setNewIndexComment('');
    } catch (err: any) {
      console.error('Failed to create index:', err);
      showToast(err.response?.data?.error || 'Failed to create index', 'error');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setShowNewIndex(false);
    setNewIndexName('');
    setNewIndexColumns([]);
    setNewIndexUnique(false);
    setNewIndexAlgorithm('BTREE');
    setNewIndexCondition('');
    setNewIndexInclude([]);
    setNewIndexComment('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Key size={12} className="md:w-3.5 md:h-3.5 text-text-secondary" />
          <h4 className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">Indexes</h4>
        </div>
        <button
          onClick={() => setShowNewIndex(!showNewIndex)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs bg-accent hover:bg-blue-600 text-white rounded transition-colors"
          title="Add new index"
        >
          <Plus size={12} />
          Index
        </button>
      </div>

      {showNewIndex && (
        <div className="mb-3 p-2 md:p-3 bg-bg-2 border border-accent/30 rounded space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="text-[10px] md:text-xs font-medium text-accent">Create New Index</h5>
            <button
              onClick={resetForm}
              className="p-0.5 hover:bg-bg-3 rounded text-text-secondary"
            >
              <X size={12} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] md:text-xs text-text-secondary block mb-1">
                Columns <span className="text-accent">*</span>
              </label>

              <div className="min-h-[32px] bg-bg-0 border border-border rounded px-2 py-1 mb-2 flex flex-wrap gap-1 items-center">
                {newIndexColumns.length > 0 ? (
                  newIndexColumns.map((colName) => (
                    <span
                      key={colName}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] md:text-[10px] bg-accent text-white rounded"
                    >
                      {colName}
                      <button
                        onClick={() => toggleColumn(colName)}
                        className="hover:bg-white/20 rounded"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-text-secondary text-[10px] md:text-xs">Select columns...</span>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {columns
                  .filter(col => !newIndexColumns.includes(col.name))
                  .map((col) => (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => toggleColumn(col.name)}
                      className="px-2 py-0.5 text-[9px] md:text-[10px] bg-bg-2 text-text-secondary hover:bg-bg-3 hover:text-text-primary rounded transition-colors border border-border"
                    >
                      + {col.name}
                    </button>
                  ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] md:text-xs text-text-secondary block mb-1">
                Index Name <span className="text-accent">*</span>
                <span className="text-text-secondary/50 ml-1">(auto-generated)</span>
              </label>
              <input
                type="text"
                value={newIndexName}
                onChange={(e) => setNewIndexName(e.target.value)}
                placeholder="idx_column_name"
                className="w-full bg-bg-0 border border-border rounded px-2 py-1 text-[10px] md:text-xs text-text-primary font-mono focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] md:text-xs text-text-secondary block mb-1">Index Algorithm</label>
              <Select
                value={newIndexAlgorithm}
                onChange={(val) => setNewIndexAlgorithm(val)}
                options={[
                  { value: 'BTREE', label: 'BTREE' },
                  { value: 'HASH', label: 'HASH' },
                  { value: 'GIST', label: 'GIST' },
                  { value: 'GIN', label: 'GIN' },
                  { value: 'BRIN', label: 'BRIN' },
                ]}
                size="sm"
              />
            </div>

            <div>
              <label className="text-[10px] md:text-xs text-text-secondary block mb-1">
                Include Columns <span className="text-text-secondary/50">(optional, for covering index)</span>
              </label>

              <div className="min-h-[28px] bg-bg-0 border border-border rounded px-2 py-1 mb-1 flex flex-wrap gap-1 items-center">
                {newIndexInclude.length > 0 ? (
                  newIndexInclude.map((colName) => (
                    <span
                      key={colName}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] md:text-[10px] bg-blue-500/20 text-blue-400 rounded"
                    >
                      {colName}
                      <button
                        onClick={() => setNewIndexInclude(newIndexInclude.filter(c => c !== colName))}
                        className="hover:bg-white/20 rounded"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-text-secondary/50 text-[10px]">No include columns</span>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {columns
                  .filter(col => !newIndexColumns.includes(col.name) && !newIndexInclude.includes(col.name))
                  .map((col) => (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => setNewIndexInclude([...newIndexInclude, col.name])}
                      className="px-2 py-0.5 text-[9px] md:text-[10px] bg-bg-2 text-text-secondary hover:bg-blue-500/10 hover:text-blue-400 rounded transition-colors border border-border"
                    >
                      + {col.name}
                    </button>
                  ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] md:text-xs text-text-secondary block mb-1">
                Condition <span className="text-text-secondary/50">(optional, for partial index)</span>
              </label>
              <input
                type="text"
                value={newIndexCondition}
                onChange={(e) => setNewIndexCondition(e.target.value)}
                placeholder="e.g., status = 'active'"
                className="w-full bg-bg-0 border border-border rounded px-2 py-1 text-[10px] md:text-xs text-text-primary font-mono focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] md:text-xs text-text-secondary block mb-1">
                Comment <span className="text-text-secondary/50">(optional)</span>
              </label>
              <input
                type="text"
                value={newIndexComment}
                onChange={(e) => setNewIndexComment(e.target.value)}
                placeholder="Index description..."
                className="w-full bg-bg-0 border border-border rounded px-2 py-1 text-[10px] md:text-xs text-text-primary focus:border-accent focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="unique-index"
                checked={newIndexUnique}
                onChange={(e) => setNewIndexUnique(e.target.checked)}
                className="w-3 h-3"
              />
              <label htmlFor="unique-index" className="text-[10px] md:text-xs text-text-secondary">
                Unique Index
              </label>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreateIndex}
                disabled={creating || !newIndexName.trim() || newIndexColumns.length === 0}
                className="flex items-center gap-1 px-3 py-1 bg-accent hover:bg-blue-600 text-white rounded text-[10px] md:text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={11} />
                Create
              </button>
              <button
                onClick={resetForm}
                className="px-3 py-1 bg-bg-3 hover:bg-bg-1 text-text-secondary rounded text-[10px] md:text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {indexes.length > 0 ? (
        <div className="bg-bg-0 border border-border rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] md:text-xs">
              <thead className="bg-bg-1">
                <tr>
                  <th className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap">Name</th>
                  <th className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap">Algorithm</th>
                  <th className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap">Unique</th>
                  <th className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap">Columns</th>
                  <th className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap">Condition</th>
                  <th className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap">Include</th>
                  <th className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-left font-medium text-text-secondary whitespace-nowrap">Comment</th>
                </tr>
              </thead>
              <tbody>
                {indexes.map((index) => (
                  <tr key={index.name} className="hover:bg-bg-1/50">
                    <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-text-primary font-mono break-all">{index.name}</td>
                    <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-text-primary">
                      <span className="text-[9px] md:text-xs bg-bg-2 text-text-secondary px-1.5 md:px-2 py-0.5 rounded whitespace-nowrap inline-block">
                        {index.algorithm || 'BTREE'}
                      </span>
                    </td>
                    <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2">
                      {index.is_primary ? (
                        <span className="text-[9px] md:text-xs bg-accent/20 text-accent px-1.5 md:px-2 py-0.5 rounded whitespace-nowrap inline-block">PRIMARY</span>
                      ) : index.is_unique ? (
                        <span className="text-[9px] md:text-xs bg-blue-500/20 text-blue-400 px-1.5 md:px-2 py-0.5 rounded whitespace-nowrap inline-block">TRUE</span>
                      ) : (
                        <span className="text-[9px] md:text-xs bg-bg-2 text-text-secondary px-1.5 md:px-2 py-0.5 rounded whitespace-nowrap inline-block">FALSE</span>
                      )}
                    </td>
                    <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-text-primary font-mono text-[9px] md:text-xs">{index.columns.join(', ')}</td>
                    <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-text-secondary text-[9px] md:text-xs font-mono">{index.condition || 'EMPTY'}</td>
                    <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-text-secondary text-[9px] md:text-xs font-mono">{index.include?.join(', ') || 'EMPTY'}</td>
                    <td className="border-b border-border px-2 md:px-3 py-1.5 md:py-2 text-text-secondary text-[9px] md:text-xs">{index.comment || 'NULL'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-text-secondary text-xs">
          No indexes found
        </div>
      )}
    </div>
  );
}
