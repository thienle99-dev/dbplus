import { createContext, useContext, ReactNode } from 'react';

interface TabContextType {
    openTableInTab: (schema: string, table: string, newTab?: boolean, database?: string) => void;
}

const TabContext = createContext<TabContextType | null>(null);

export const useTabContext = () => {
    const context = useContext(TabContext);
    if (!context) {
        throw new Error('useTabContext must be used within TabProvider');
    }
    return context;
};

interface TabProviderProps {
    children: ReactNode;
    openTableInTab: (schema: string, table: string, newTab?: boolean, database?: string) => void;
}

export function TabProvider({ children, openTableInTab }: TabProviderProps) {
    return (
        <TabContext.Provider value={{ openTableInTab }}>
            {children}
        </TabContext.Provider>
    );
}
