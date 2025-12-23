import React, { createContext, useContext, useState } from 'react';

interface TabsContextType {
    activeTab: string;
    setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps {
    defaultValue: string;
    value?: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
    className?: string;
}

export function Tabs({ defaultValue, value, onValueChange, children, className = '' }: TabsProps) {
    const [stateValue, setStateValue] = useState(defaultValue);
    
    const activeTab = value !== undefined ? value : stateValue;
    const setActiveTab = (newValue: string) => {
        if (value === undefined) {
            setStateValue(newValue);
        }
        onValueChange?.(newValue);
    };

    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <div className={className}>
                {children}
            </div>
        </TabsContext.Provider>
    );
}

export function TabsList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`flex space-x-1 rounded-lg bg-bg-2 p-1 ${className}`}>
            {children}
        </div>
    );
}

export function TabsTrigger({ value, children, className = '' }: { value: string; children: React.ReactNode; className?: string }) {
    const context = useContext(TabsContext);
    if (!context) throw new Error('TabsTrigger must be used within Tabs');

    const isActive = context.activeTab === value;

    return (
        <button
            className={`
                px-3 py-1.5 text-sm font-medium rounded-md transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
                ${isActive 
                    ? 'bg-bg-0 text-text-primary shadow-sm' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-3'
                }
                ${className}
            `}
            onClick={() => context.setActiveTab(value)}
        >
            {children}
        </button>
    );
}

export function TabsContent({ value, children, className = '' }: { value: string; children: React.ReactNode; className?: string }) {
    const context = useContext(TabsContext);
    if (!context) throw new Error('TabsContent must be used within Tabs');

    if (context.activeTab !== value) return null;

    return (
        <div className={`mt-2 ${className}`}>
            {children}
        </div>
    );
}
