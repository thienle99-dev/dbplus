import { useEffect, useState } from 'react';
import { Edit3, Save, X, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useSetTableComment, useTableComment } from '../../hooks/useDatabase';

interface TableCommentEditorProps {
  connectionId: string | undefined;
  schema: string;
  table: string;
}

export default function TableCommentEditor({ connectionId, schema, table }: TableCommentEditorProps) {
  const { showToast } = useToast();
  const commentQuery = useTableComment(connectionId, schema, table);
  const setComment = useSetTableComment(connectionId);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!editing) {
      setDraft(commentQuery.data?.comment || '');
    }
  }, [editing, commentQuery.data?.comment]);

  const canEdit = !!connectionId && !!schema && !!table;
  const busy = commentQuery.isLoading || setComment.isPending;

  const save = async () => {
    try {
      await setComment.mutateAsync({
        schema,
        table,
        comment: draft.trim().length ? draft : null,
      });
      showToast('Table comment saved', 'success');
      setEditing(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to save table comment';
      showToast(String(msg), 'error');
    }
  };

  const clear = async () => {
    setDraft('');
    try {
      await setComment.mutateAsync({ schema, table, comment: null });
      showToast('Table comment cleared', 'success');
      setEditing(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to clear table comment';
      showToast(String(msg), 'error');
    }
  };

  const current = commentQuery.data?.comment || '';

  return (
    <div className="p-3 rounded border border-border bg-bg-0">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">
          Comment
        </div>
        <div className="flex items-center gap-2">
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={!canEdit || busy}
              className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded border border-border disabled:opacity-50"
              title="Edit comment"
            >
              <Edit3 size={12} />
              Edit
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setDraft(current);
                  setEditing(false);
                }}
                disabled={busy}
                className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded border border-border disabled:opacity-50"
                title="Cancel"
              >
                <X size={12} />
                Cancel
              </button>
              <button
                type="button"
                onClick={clear}
                disabled={busy}
                className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded border border-red-500/30 disabled:opacity-50"
                title="Clear comment"
              >
                <Trash2 size={12} />
                Clear
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="flex items-center gap-1 px-2 py-1 text-[10px] md:text-xs bg-accent hover:bg-blue-600 text-white rounded border border-accent disabled:opacity-50"
                title="Save comment"
              >
                <Save size={12} />
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {!editing ? (
        <div className="text-xs text-text-primary whitespace-pre-wrap break-words min-h-[18px]">
          {commentQuery.isLoading ? (
            <span className="text-text-secondary">Loading…</span>
          ) : current ? (
            current
          ) : (
            <span className="text-text-secondary">No comment</span>
          )}
        </div>
      ) : (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full bg-bg-1 border border-border rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none min-h-[90px] resize-y"
          placeholder="Add a table comment…"
          disabled={busy}
        />
      )}
    </div>
  );
}

