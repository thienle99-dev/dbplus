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
    Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTabContext } from '../context/TabContext';
import { useToast } from '../context/ToastContext';
import { useDialog } from '../context/DialogContext';

interface TableContextMenuProps {
    table: string;
    schema: string;
    connectionId: string;
    position: { x: number; y: number };
    onClose: () => void;
    isPinned: boolean;
    onTogglePin: () => void;
    onOpenExport: (format: 'csv' | 'json' | 'sql') => void;
    onOpenImport: (format: 'csv' | 'json' | 'sql') => void;
    onExportDdl: () => void;
    onOpenMockData: () => void;
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
    onOpenExport,
    onOpenImport,
    onExportDdl,
    onOpenMockData,
}: TableContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const submenuRef = useRef<HTMLDivElement>(null);
    const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);
    const [submenuPosition, setSubmenuPosition] = useState<{ top: number; left: number } | null>(null);
    const hoverTimeoutRef = useRef<number | null>(null);
    const navigate = useNavigate();
    const { showToast } = useToast();
    const dialog = useDialog();

    let tabContext;
    try {
        tabContext = useTabContext();
    } catch {
        tabContext = null;
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedInMenu = menuRef.current?.contains(target);
            const clickedInSubmenu = submenuRef.current?.contains(target);

            if (!clickedInMenu && !clickedInSubmenu) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (submenuOpen) {
                    setSubmenuOpen(null);
                } else {
                    onClose();
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, [onClose, submenuOpen]);

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

    const handleCopyCreateTable = async () => {
        try {
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

    const handleTruncate = async () => {
        const confirmed = await dialog.confirm({
            title: 'Truncate Table',
            message: `Are you sure you want to truncate table "${table}"? This will delete all rows and cannot be undone.`,
            confirmLabel: 'Truncate',
            variant: 'destructive'
        });

        if (confirmed) {
            showToast('Truncate functionality coming soon', 'info');
        }
        onClose();
    };

    const handleDelete = async () => {
        const userInput = await dialog.prompt({
            title: 'Delete Table',
            message: `To delete table "${table}", please type the table name to confirm:`,
            placeholder: table,
            confirmLabel: 'Delete'
        });

        if (userInput === table) {
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
            label: 'Mock Data Studio',
            icon: <Sparkles size={14} />,
            onClick: () => {
                onOpenMockData();
                onClose();
            },
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
            label: 'Export Data',
            icon: <FileDown size={14} />,
            submenu: [
                { label: 'Export as CSV', icon: <FileDown size={14} />, onClick: () => { onOpenExport('csv'); onClose(); } },
                { label: 'Export as JSON', icon: <FileDown size={14} />, onClick: () => { onOpenExport('json'); onClose(); } },
                { label: 'Export as SQL', icon: <FileDown size={14} />, onClick: () => { onOpenExport('sql'); onClose(); } },
            ],
        },
        {
            label: 'Export DDL...',
            icon: <FileDown size={14} />,
            onClick: () => {
                onExportDdl();
                onClose();
            },
        },
        {
            label: 'Import',
            icon: <FileUp size={14} />,
            submenu: [
                { label: 'Import from CSV', icon: <FileUp size={14} />, onClick: () => { onOpenImport('csv'); onClose(); } },
                { label: 'Import from JSON', icon: <FileUp size={14} />, onClick: () => { onOpenImport('json'); onClose(); } },
                { label: 'Import from SQL', icon: <FileUp size={14} />, onClick: () => { onOpenImport('sql'); onClose(); } },
            ],
            divider: true,
        },
        {
            label: 'New',
            icon: <Plus size={14} />,
            submenu: [
                { label: 'New Column', icon: <Plus size={14} />, onClick: () => { showToast('New Column coming soon', 'info'); onClose(); } },
                { label: 'New Index', icon: <Plus size={14} />, onClick: () => { showToast('New Index coming soon', 'info'); onClose(); } },
                { label: 'New Trigger', icon: <Plus size={14} />, onClick: () => { showToast('New Trigger coming soon', 'info'); onClose(); } },
                { label: 'New Constraint', icon: <Plus size={14} />, onClick: () => { showToast('New Constraint coming soon', 'info'); onClose(); } },
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

    const handleSubmenuHover = (item: MenuItem, event: React.MouseEvent<HTMLDivElement>) => {
        if (!item.submenu) return;

        console.log('Hovering over submenu item:', item.label);

        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }

        // Capture rect immediately before setTimeout
        const rect = event.currentTarget.getBoundingClientRect();
        const submenuTop = rect.top;
        const submenuLeft = rect.right + 4;

        hoverTimeoutRef.current = window.setTimeout(() => {
            console.log('Opening submenu:', item.label, { top: submenuTop, left: submenuLeft });
            setSubmenuPosition({ top: submenuTop, left: submenuLeft });
            setSubmenuOpen(item.label);
        }, 100);
    };

    const renderMenuItem = (item: MenuItem, index: number) => {
        const hasSubmenu = item.submenu && item.submenu.length > 0;

        return (
            <div key={index}>
                <div
                    className={`
            flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-all duration-150
            ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-bg-2'}
            ${item.danger ? 'text-red-500 hover:bg-red-500/10' : 'text-text-primary'}
          `}
                    onClick={() => {
                        if (item.disabled) return;
                        if (!hasSubmenu && item.onClick) {
                            item.onClick();
                        }
                    }}
                    onMouseEnter={(e) => {
                        if (hasSubmenu) {
                            handleSubmenuHover(item, e);
                        } else {
                            // Close submenu when hovering over non-submenu items
                            if (hoverTimeoutRef.current) {
                                clearTimeout(hoverTimeoutRef.current);
                            }
                            setSubmenuOpen(null);
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

                {item.divider && <div className="h-px bg-border-light my-1" />}
            </div>
        );
    };

    return (
        <>
            <div
                ref={menuRef}
                className="fixed z-50 min-w-[220px] bg-bg-1 border border-border-light rounded-lg shadow-xl py-1 opacity-0 scale-95 transition-all duration-150"
                style={{
                    left: position.x,
                    top: position.y,
                    opacity: 1,
                    transform: 'scale(1)',
                }}
            >
                {menuItems.map((item, index) => renderMenuItem(item, index))}
            </div>

            {submenuOpen && submenuPosition && (() => {
                console.log('Rendering submenu:', submenuOpen, submenuPosition);
                const submenuItems = menuItems.find((item) => item.label === submenuOpen)?.submenu;
                console.log('Submenu items:', submenuItems);

                return (
                    <div
                        ref={submenuRef}
                        className="fixed z-[60] min-w-[200px] bg-bg-1 border border-border-light rounded-lg shadow-xl py-1 opacity-0 scale-95 transition-all duration-150"
                        style={{
                            left: submenuPosition.left,
                            top: submenuPosition.top,
                            maxHeight: '400px',
                            overflowY: 'auto',
                            opacity: 1,
                            transform: 'scale(1)',
                        }}
                        onMouseEnter={() => {
                            if (hoverTimeoutRef.current) {
                                clearTimeout(hoverTimeoutRef.current);
                            }
                        }}
                        onMouseLeave={() => {
                            setSubmenuOpen(null);
                        }}
                    >
                        {submenuItems?.map((subItem, subIndex) => (
                            <div
                                key={subIndex}
                                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-bg-2 text-text-primary transition-colors duration-150"
                                onClick={() => {
                                    if (subItem.onClick) {
                                        subItem.onClick();
                                    }
                                }}
                            >
                                <span className="flex-shrink-0">{subItem.icon}</span>
                                <span>{subItem.label}</span>
                            </div>
                        ))}
                    </div>
                );
            })()}
        </>
    );
}
