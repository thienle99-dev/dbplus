import { createContext, useContext, useState, ReactNode } from 'react';

interface SelectedRow {
  rowIndex: number;
  rowData: unknown[];
  columns: string[];
}

interface SelectedRowContextType {
  selectedRow: SelectedRow | null;
  setSelectedRow: (row: SelectedRow | null) => void;
}

const SelectedRowContext = createContext<SelectedRowContextType | undefined>(undefined);

export function SelectedRowProvider({ children }: { children: ReactNode }) {
  const [selectedRow, setSelectedRow] = useState<SelectedRow | null>(null);

  return (
    <SelectedRowContext.Provider value={{ selectedRow, setSelectedRow }}>
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

