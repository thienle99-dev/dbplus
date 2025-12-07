import { createContext, useContext, useState, ReactNode } from 'react';

interface SelectedRow {
  rowIndex: number;
  rowData: unknown[];
  columns: string[];
}

interface SelectedRowContextType {
  selectedRow: SelectedRow | null;
  setSelectedRow: (row: SelectedRow | null) => void;
  selectedRows: Set<number>;
  toggleRowSelection: (index: number) => void;
  clearSelection: () => void;
  editingRowIndex: number | null;
  setEditingRowIndex: (index: number | null) => void;
}

const SelectedRowContext = createContext<SelectedRowContextType | undefined>(undefined);

export function SelectedRowProvider({ children }: { children: ReactNode }) {
  const [selectedRow, setSelectedRow] = useState<SelectedRow | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);

  const toggleRowSelection = (index: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  return (
    <SelectedRowContext.Provider value={{ 
      selectedRow, 
      setSelectedRow,
      selectedRows,
      toggleRowSelection,
      clearSelection,
      editingRowIndex,
      setEditingRowIndex,
    }}>
      {children}
    </SelectedRowContext.Provider>
  );
}

export function useSelectedRow() {
  const context = useContext(SelectedRowContext);
  if (context === undefined) {
    throw new Error('useSelectedRow must be used within a SelectedRowProvider');
  }
  return context;
}

