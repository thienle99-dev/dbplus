import { createContext, useContext, useState, ReactNode } from 'react';

interface TablePageContextType {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
}

const TablePageContext = createContext<TablePageContextType | undefined>(undefined);

export function TablePageProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 25;

  return (
    <TablePageContext.Provider value={{ currentPage, setCurrentPage, pageSize }}>
      {children}
    </TablePageContext.Provider>
  );
}

export function useTablePage() {
  const context = useContext(TablePageContext);
  if (context === undefined) {
    throw new Error('useTablePage must be used within a TablePageProvider');
  }
  return context;
}

