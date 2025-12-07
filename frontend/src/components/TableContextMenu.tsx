import { useState, useEffect, useRef } from 'react';
import {
    ExternalLink,
    Database,
    Info,
    Copy,
    Pin,
    PinOff,
    FileDown,
    FileUp,
    Plus,
    Code,
    Copy as CopyIcon,
    Trash2,
    Scissors,
    ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTabContext } from '../context/TabContext';
import { useToast } from '../context/ToastContext';

interface TableContextMenuProps {
    table: string;
    schema: string;
    connectionId: string;
    position: { x: number; y: number };
    onClose: () => void;
    isPinned: boolean;
    onTogglePin: () => void;
}

interface MenuItem {
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
    submenu?: MenuItem[];
    divider?: boolean;
    disabled?: boolean;
    shortcut?: string;
    danger?: boolean;
}

export default function TableContextMenu({
    table,
    schema,
    connectionId,
    position,
    onClose,
    isPinned,
    onTogglePin,
}: TableContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);
    const navigate = useNavigate();
    const { showToast } = useToast();

    let tabContext;
    try {
        tabContext = useTabContext();
    } catch {
        tabContext = null;
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Adjust position to keep menu in viewport
    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let adjustedX = position.x;
            let adjustedY = position.y;

            if (rect.right > viewportWidth) {
                adjustedX = viewportWidth - rect.width - 10;
            }

            if (rect.bottom > viewportHeight) {
                adjustedY = viewportHeight - rect.height - 10;
            }

            menuRef.current.style.left = `${adjustedX}px`;
            menuRef.current.style.top = `${adjustedY}px`;
        }
    }, [position]);

    const handleOpenInNewTab = () => {
        if (tabContext) {
            tabContext.openTableInTab(schema, table, true);
        } else {
            navigate(`/workspace/${connectionId}/query`, {
                state: { openTable: { schema, table } },
            });
        }
        onClose();
    };

    const handleOpenStructure = () => {
        if (tabContext) {
            const tabId = tabContext.openTableInTab(schema, table, false);
            // Switch to structure tab - this would need to be implemented in TableDataView
            window.dispatchEvent(new CustomEvent('switch-table-tab', { detail: { tabId, tab: 'structure' } }));
        } else {
            navigate(`/workspace/${connectionId}/query`, {
                state: { openTable: { schema, table, tab: 'structure' } },
            });
        }
        onClose();
    };

    const handleItemOverview = () => {
        if (tabContext) {
            const tabId = tabContext.openTableInTab(schema, table, false);
            window.dispatchEvent(new CustomEvent('switch-table-tab', { detail: { tabId, tab: 'info' } }));
        } else {
            navigate(`/workspace/${connectionId}/query`, {
                state: { openTable: { schema, table, tab: 'info' } },
            });
        }
        onClose();
    };

    const handleCopyName = () => {
        navigator.clipboard.writeText(table);
        showToast('Table name copied to clipboard', 'success');
        onClose();
    };

    const handleCopyFullName = () => {
        navigator.clipboard.writeText(`"${schema}"."${table}"`);
        showToast('Full table name copied to clipboard', 'success');
        onClose();
    };

    const handleCopyCreateTable = async () => {
        try {
            // This would need a backend endpoint to generate CREATE TABLE statement
            // For now, just copy a basic template
            const createStatement = `-- CREATE TABLE statement for ${schema}.${table}\n-- (Full DDL generation requires backend support)`;
            navigator.clipboard.writeText(createStatement);
            showToast('CREATE TABLE statement copied', 'success');
        } catch (error) {
            showToast('Failed to copy CREATE TABLE statement', 'error');
        }
        onClose();
    };

    const handleCopySelect = () => {
        const selectStatement = `SELECT * FROM "${schema}"."${table}";`;
        navigator.clipboard.writeText(selectStatement);
        showToast('SELECT statement copied', 'success');
        onClose();
    };

    const handleCopyInsert = () => {
        const insertStatement = `INSERT INTO "${schema}"."${table}" (column1, column2) VALUES (value1, value2);`;
        navigator.clipboard.writeText(insertStatement);
        showToast('INSERT template copied', 'success');
        onClose();
    };

    const handleCopyUpdate = () => {
        const updateStatement = `UPDATE "${schema}"."${table}" SET column1 = value1 WHERE condition;`;
        navigator.clipboard.writeText(updateStatement);
        showToast('UPDATE template copied', 'success');
        onClose();
    };

    const handleCopyDelete = () => {
        const deleteStatement = `DELETE FROM "${schema}"."${table}" WHERE condition;`;
        navigator.clipboard.writeText(deleteStatement);
        showToast('DELETE template copied', 'success');
        onClose();
    };

    const handleTruncate = () => {
        if (confirm(`Are you sure you want to truncate table "${table}"? This will delete all rows and cannot be undone.`)) {
            // Execute truncate - would need backend support
            showToast('Truncate functionality coming soon', 'info');
        }
        onClose();
    };

    const handleDelete = () => {
        const userInput = prompt(`To delete table "${table}", please type the table name to confirm:`);
        if (userInput === table) {
            // Execute drop table - would need backend support
            showToast('Delete functionality coming soon', 'info');
        } else if (userInput !== null) {
            showToast('Table name did not match', 'error');
        }
        onClose();
    };

    const menuItems: MenuItem[] = [
        {
            label: 'Open in new tab',
            icon: <ExternalLink size={14} />,
            onClick: handleOpenInNewTab,
        },
        {
            label: 'Open structure',
            icon: <Database size={14} />,
            onClick: handleOpenStructure,
        },
        {
            label: 'Item overview',
            icon: <Info size={14} />,
            onClick: handleItemOverview,
            divider: true,
        },
        {
            label: 'Copy name',
            icon: <Copy size={14} />,
            onClick: handleCopyName,
        },
        {
            label: isPinned ? 'Unpin from top' : 'Pin to top',
            icon: isPinned ? <PinOff size={14} /> : <Pin size={14} />,
            onClick: () => {
                onTogglePin();
                onClose();
            },
            divider: true,
        },
        {
            label: 'Export',
            icon: <FileDown size={14} />,
            submenu: [
                { label: 'Export as CSV', icon: <FileDown size={14} />, onClick: () => showToast('Export CSV coming soon', 'info') },
                { label: 'Export as JSON', icon: <FileDown size={14} />, onClick: () => showToast('Export JSON coming soon', 'info') },
                { label: 'Export as SQL', icon: <FileDown size={14} />, onClick: () => showToast('Export SQL coming soon', 'info') },
            ],
        },
        {
            label: 'Import',
            icon: <FileUp size={14} />,
            submenu: [
                { label: 'Import from CSV', icon: <FileUp size={14} />, onClick: () => showToast('Import CSV coming soon', 'info') },
                { label: 'Import from JSON', icon: <FileUp size={14} />, onClick: () => showToast('Import JSON coming soon', 'info') },
                { label: 'Import from SQL', icon: <FileUp size={14} />, onClick: () => showToast('Import SQL coming soon', 'info') },
            ],
            divider: true,
        },
        {
            label: 'New',
            icon: <Plus size={14} />,
            submenu: [
                { label: 'New Column', icon: <Plus size={14} />, onClick: () => showToast('New Column coming soon', 'info') },
                { label: 'New Index', icon: <Plus size={14} />, onClick: () => showToast('New Index coming soon', 'info') },
                { label: 'New Trigger', icon: <Plus size={14} />, onClick: () => showToast('New Trigger coming soon', 'info') },
                { label: 'New Constraint', icon: <Plus size={14} />, onClick: () => showToast('New Constraint coming soon', 'info') },
            ],
        },
        {
            label: 'Copy Script As',
            icon: <Code size={14} />,
            submenu: [
                { label: 'CREATE TABLE', icon: <CopyIcon size={14} />, onClick: handleCopyCreateTable },
                { label: 'SELECT Statement', icon: <CopyIcon size={14} />, onClick: handleCopySelect },
                { label: 'INSERT Statement', icon: <CopyIcon size={14} />, onClick: handleCopyInsert },
                { label: 'UPDATE Statement', icon: <CopyIcon size={14} />, onClick: handleCopyUpdate },
                { label: 'DELETE Statement', icon: <CopyIcon size={14} />, onClick: handleCopyDelete },
            ],
            divider: true,
        },
        {
            label: 'Clone...',
            icon: <CopyIcon size={14} />,
            onClick: () => {
                showToast('Clone table coming soon', 'info');
                onClose();
            },
        },
        {
            label: 'Truncate...',
            icon: <Scissors size={14} />,
            onClick: handleTruncate,
            shortcut: '⌘⌫',
        },
        {
            label: 'Delete...',
            icon: <Trash2 size={14} />,
            onClick: handleDelete,
            danger: true,
            shortcut: '⌘⌫',
        },
    ];

    const renderMenuItem = (item: MenuItem, index: number) => {
        const hasSubmenu = item.submenu && item.submenu.length > 0;
        const isSubmenuOpen = submenuOpen === item.label;

        return (
            <div key={index}>
                <div
                    className={`
            flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors
            ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-bg-2'}
            ${item.danger ? 'text-red-500 hover:bg-red-500/10' : 'text-text-primary'}
          `}
                    onClick={(e) => {
                        if (item.disabled) return;
                        if (hasSubmenu) {
                            e.stopPropagation();
                            setSubmenuOpen(isSubmenuOpen ? null : item.label);
                        } else if (item.onClick) {
                            item.onClick();
                        }
                    }}
                    onMouseEnter={() => {
                        if (hasSubmenu) {
                            setSubmenuOpen(item.label);
                        }
                    }}
                >
                    <div className="flex items-center gap-2">
                        <span className="flex-shrink-0">{item.icon}</span>
                        <span>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {item.shortcut && (
                            <span className="text-xs text-text-secondary">{item.shortcut}</span>
                        )}
                        {hasSubmenu && <ChevronRight size={14} className="text-text-secondary" />}
                    </div>
                </div>

                {hasSubmenu && isSubmenuOpen && (
                    <div className="ml-2 pl-2 border-l border-border">
                        {item.submenu!.map((subItem, subIndex) => (
                            <div
                                key={subIndex}
                                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-bg-2 text-text-primary transition-colors"
                                onClick={() => {
                                    if (subItem.onClick) {
                                        subItem.onClick();
                                        onClose();
                                    }
                                }}
                            >
                                <span className="flex-shrink-0">{subItem.icon}</span>
                                <span>{subItem.label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {item.divider && <div className="h-px bg-border my-1" />}
            </div>
        );
    };

    return (
        <div
            ref={menuRef}
            className="fixed z-50 min-w-[220px] bg-bg-1 border border-border rounded-lg shadow-xl py-1"
            style={{ left: position.x, top: position.y }}
        >
            {menuItems.map((item, index) => renderMenuItem(item, index))}
        </div>
    );
}
