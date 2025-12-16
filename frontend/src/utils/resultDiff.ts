
export interface ResultSnapshot {
  id: string;
  timestamp: number;
  query: string;
  data: any[];
  columns: any[];
}

export interface CellDiff {
  column: string;
  oldValue: any;
  newValue: any;
}

export interface RowDiff {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  rowIndex: number; // Index in the specific array (new for added/modified/unchanged, old for removed)
  data: any;
  changes?: CellDiff[];
}

export interface DiffResult {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
  rows: RowDiff[]; // Unified view or just differences? 
  // Let's produce a unified list for display: 
  // For 'modified', we show new data but highlight changed cells.
}

/**
 * Identify a likely primary key from columns
 */
function findPrimaryKey(columns: any[], data: any[]): string | null {
    // 1. Look for 'id' or '_id' or 'uuid'
    const pkCandidates = columns.map(c => c.name).filter(name => 
        /^(id|uuid|_id)$/i.test(name) || name.toLowerCase().endsWith('_id')
    );

    for (const key of pkCandidates) {
        // Check uniqueness
        const values = new Set();
        let unique = true;
        for (const row of data) {
            const val = row[key];
            if (val === null || val === undefined || values.has(val)) {
                unique = false;
                break;
            }
            values.add(val);
        }
        if (unique) return key;
    }
    return null;
}

export function computeResultDiff(oldData: any[], newData: any[], columns: any[]): DiffResult {
    const pk = findPrimaryKey(columns, oldData) || findPrimaryKey(columns, newData);
    
    const rows: RowDiff[] = [];
    let added = 0, removed = 0, modified = 0, unchanged = 0;

    if (pk) {
        // PK-based comparison
        const oldMap = new Map(oldData.map(r => [r[pk], r]));
        const newMap = new Map(newData.map(r => [r[pk], r]));
        const textEncoder = new TextEncoder(); // For value comparison if needed, or structuredClone

        // Iterate through new data to find added, modified, unchanged
        const processedKeys = new Set();

        for (let i = 0; i < newData.length; i++) {
            const newRow = newData[i];
            const key = newRow[pk];
            processedKeys.add(key);

            if (oldMap.has(key)) {
                const oldRow = oldMap.get(key);
                // Compare fields
                const changes: CellDiff[] = [];
                let hasChanges = false;

                for (const col of columns) {
                    const colName = col.name;
                    if (JSON.stringify(newRow[colName]) !== JSON.stringify(oldRow[colName])) {
                        hasChanges = true;
                        changes.push({
                            column: colName,
                            oldValue: oldRow[colName],
                            newValue: newRow[colName]
                        });
                    }
                }

                if (hasChanges) {
                    modified++;
                    rows.push({ type: 'modified', rowIndex: i, data: newRow, changes });
                } else {
                    unchanged++;
                    rows.push({ type: 'unchanged', rowIndex: i, data: newRow });
                }
            } else {
                added++;
                rows.push({ type: 'added', rowIndex: i, data: newRow });
            }
        }

        // Find removed
        for (const oldRow of oldData) {
            if (!processedKeys.has(oldRow[pk])) {
                removed++;
                rows.push({ type: 'removed', rowIndex: -1, data: oldRow }); // rowIndex -1 for removed from view, or handle differently
            }
        }

    } else {
        // Index-based comparison (fallback)
        const maxLen = Math.max(oldData.length, newData.length);
        
        for (let i = 0; i < maxLen; i++) {
            if (i < oldData.length && i < newData.length) {
                const oldRow = oldData[i];
                const newRow = newData[i];
                
                const changes: CellDiff[] = [];
                let hasChanges = false;
                
                 for (const col of columns) {
                    const colName = col.name;
                     if (JSON.stringify(newRow[colName]) !== JSON.stringify(oldRow[colName])) {
                        hasChanges = true;
                        changes.push({
                            column: colName,
                            oldValue: oldRow[colName],
                            newValue: newRow[colName]
                        });
                    }
                }
                
                if (hasChanges) {
                    modified++;
                    rows.push({ type: 'modified', rowIndex: i, data: newRow, changes });
                } else {
                    unchanged++;
                    rows.push({ type: 'unchanged', rowIndex: i, data: newRow });
                }

            } else if (i < newData.length) {
                added++;
                rows.push({ type: 'added', rowIndex: i, data: newData[i] });
            } else {
                // Was in old, not in new
                removed++;
                rows.push({ type: 'removed', rowIndex: i, data: oldData[i] });
            }
        }
    }

    return { added, removed, modified, unchanged, rows };
}
