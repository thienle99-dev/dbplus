import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Node,
    ConnectionLineType,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useForeignKeys, useTables } from '../../hooks/useDatabase';
import TableNode from './TableNode';
import { getLayoutedElements } from './layout';
import { Loader2, Maximize2, Minimize2 } from 'lucide-react';

const nodeTypes = {
    table: TableNode,
};

interface ERDiagramProps {
    connectionId: string;
    schema: string;
    onTableClick?: (tableName: string, schema: string) => void;
}

export default function ERDiagram({ connectionId, schema }: ERDiagramProps) {
    const { data: foreignKeys = [], isLoading: fkLoading } = useForeignKeys(connectionId, schema);
    const { data: tables = [], isLoading: tablesLoading } = useTables(connectionId, schema);
    const [layoutType, setLayoutType] = useState<'grid' | 'smart'>('smart');
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Lazy column loading
    const [tableColumns, setTableColumns] = useState<Map<string, any[]>>(new Map());
    const [loadingColumns, setLoadingColumns] = useState<Set<string>>(new Set());
    const fetchedTablesRef = useRef<Set<string>>(new Set());

    // Fetch all columns immediately when tables are loaded
    const [allColumnsLoaded, setAllColumnsLoaded] = useState(false);
    
    useEffect(() => {
        if (tables.length === 0) {
            setAllColumnsLoaded(false);
            return;
        }

        setAllColumnsLoaded(false);
        
        const fetchAllColumns = async () => {
            const fetchPromises = tables.map(async (table) => {
                if (fetchedTablesRef.current.has(table.name)) return;

                setLoadingColumns(prev => new Set(prev).add(table.name));

                try {
                    const response = await fetch(
                        `/api/connections/${connectionId}/columns?schema=${schema}&table=${table.name}`
                    );
                    if (response.ok) {
                        const cols = await response.json();
                        setTableColumns(prev => {
                            const newMap = new Map(prev);
                            newMap.set(table.name, cols);
                            return newMap;
                        });
                        fetchedTablesRef.current.add(table.name);
                    }
                } catch (error) {
                    console.error(`Failed to fetch columns for ${table.name}:`, error);
                } finally {
                    setLoadingColumns(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(table.name);
                        return newSet;
                    });
                }
            });

            await Promise.all(fetchPromises);
            setAllColumnsLoaded(true);
        };

        fetchAllColumns();
    }, [tables, connectionId, schema]);

    // Lazy fetch columns for a specific table (kept for manual refresh if needed)
    const fetchColumnsForTable = useCallback(async (tableName: string) => {
        // Skip if already fetched or currently loading
        if (fetchedTablesRef.current.has(tableName) || loadingColumns.has(tableName)) {
            return;
        }

        setLoadingColumns(prev => new Set(prev).add(tableName));

        try {
            const response = await fetch(
                `/api/connections/${connectionId}/columns?schema=${schema}&table=${tableName}`
            );
            if (response.ok) {
                const cols = await response.json();
                setTableColumns(prev => {
                    const newMap = new Map(prev);
                    newMap.set(tableName, cols);
                    return newMap;
                });
                fetchedTablesRef.current.add(tableName);
            }
        } catch (error) {
            console.error(`Failed to fetch columns for ${tableName}:`, error);
        } finally {
            setLoadingColumns(prev => {
                const newSet = new Set(prev);
                newSet.delete(tableName);
                return newSet;
            });
        }
    }, [connectionId, schema, loadingColumns]);

    // Generate nodes from data (independent of hover state)
    const initialNodes = useMemo(() => {
        if (tables.length === 0) {
            return [];
        }

        // Build FK lookup for quick checks
        const fkLookup = new Set<string>();
        foreignKeys.forEach(fk => {
            fkLookup.add(`${fk.tableName}.${fk.columnName}`);
        });

        // Create nodes for each table
        const nodes: Node[] = tables.map((table) => {
            // Get fetched columns if available
            const fetchedCols = tableColumns.get(table.name) || [];

            // Get FK-related columns (always available)
            const fkColumns = foreignKeys
                .filter(fk => fk.tableName === table.name || fk.referencedTableName === table.name)
                .reduce((cols, fk) => {
                    // Add source column (FK)
                    if (fk.tableName === table.name && !cols.some(c => c.name === fk.columnName)) {
                        cols.push({
                            name: fk.columnName,
                            type: 'FK',
                            isPrimaryKey: false,
                            isForeignKey: true,
                            isNullable: true,
                        });
                    }
                    // Add target column (usually PK)
                    if (fk.referencedTableName === table.name && !cols.some(c => c.name === fk.referencedColumnName)) {
                        cols.push({
                            name: fk.referencedColumnName,
                            type: 'PK',
                            isPrimaryKey: true,
                            isForeignKey: false,
                            isNullable: false,
                        });
                    }
                    return cols;
                }, [] as Array<{ name: string; type: string; isPrimaryKey: boolean; isForeignKey: boolean; isNullable: boolean }>);

            // Use fetched columns if available, otherwise use FK columns
            let columns;
            if (fetchedCols.length > 0) {
                // Map fetched columns to ColumnInfo format
                columns = fetchedCols.map((col: any) => ({
                    name: col.column_name || col.name,
                    type: col.data_type || col.type || 'unknown',
                    isPrimaryKey: col.is_primary_key || false,
                    isForeignKey: fkLookup.has(`${table.name}.${col.column_name || col.name}`),
                    isNullable: col.is_nullable === 'YES' || col.is_nullable === true,
                }));
            } else {
                // Use FK columns as fallback
                columns = fkColumns;
            }

            return {
                id: table.name,
                type: 'table',
                position: { x: 0, y: 0 }, // Will be set by layout
                data: {
                    label: table.name,
                    tableName: table.name,
                    schema: schema,
                    columns: columns,
                    primaryKeys: columns.filter(c => c.isPrimaryKey).map(c => c.name),
                    isLoadingColumns: loadingColumns.has(table.name),
                },
            };
        });

        // Apply layout
        const layouted = getLayoutedElements(nodes, [], layoutType);
        return layouted.nodes;
    }, [tables, foreignKeys, schema, layoutType, tableColumns, loadingColumns]);

    // Generate edges from foreign keys (depends on hover state for highlighting)
    const initialEdges = useMemo(() => {
        if (foreignKeys.length === 0) {
            return [];
        }

        return foreignKeys.map((fk, idx) => {
            const isHighlighted = hoveredNode === fk.tableName || hoveredNode === fk.referencedTableName;

            return {
                id: `${fk.constraintName}-${idx}`,
                source: fk.tableName,
                target: fk.referencedTableName,
                // Use default handles for now
                sourceHandle: `${fk.tableName}-default-source`,
                targetHandle: `${fk.referencedTableName}-default-target`,
                label: `${fk.columnName} → ${fk.referencedColumnName}`,
                labelStyle: {
                    fontSize: 11,
                    fill: isHighlighted ? '#6366f1' : '#9ca3af',
                    fontWeight: isHighlighted ? 600 : 400,
                },
                labelBgStyle: {
                    fill: '#1f2937',
                    fillOpacity: 0.95,
                },
                labelBgPadding: [6, 4] as [number, number],
                labelBgBorderRadius: 4,
                animated: isHighlighted,
                type: ConnectionLineType.SmoothStep,
                markerEnd: {
                    type: MarkerType.Arrow,
                    color: isHighlighted ? '#6366f1' : '#6b7280',
                    width: 20,
                    height: 20,
                    strokeWidth: 2,
                },
                style: {
                    stroke: isHighlighted ? '#6366f1' : '#6b7280',
                    strokeWidth: isHighlighted ? 3 : 2,
                    opacity: hoveredNode && !isHighlighted ? 0.2 : 1,
                },
                data: {
                    constraintName: fk.constraintName,
                    columnName: fk.columnName,
                    referencedColumnName: fk.referencedColumnName,
                    onDelete: fk.onDelete,
                    onUpdate: fk.onUpdate,
                },
            };
        });
    }, [foreignKeys, hoveredNode]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Update nodes when tables, layout, or columns change
    const prevTablesRef = useRef<string>('');
    const prevLayoutRef = useRef<string>(layoutType);
    const prevColumnsCountRef = useRef<number>(0);

    useEffect(() => {
        const tablesKey = tables.map(t => t.name).join(',');
        const layoutChanged = prevLayoutRef.current !== layoutType;
        const tablesChanged = prevTablesRef.current !== tablesKey;
        const columnsCountChanged = prevColumnsCountRef.current !== tableColumns.size;

        if (tablesChanged || layoutChanged || columnsCountChanged) {
            setNodes(initialNodes);
            prevTablesRef.current = tablesKey;
            prevLayoutRef.current = layoutType;
            prevColumnsCountRef.current = tableColumns.size;
        }
    }, [initialNodes, layoutType, tables, tableColumns, setNodes]);

    // Always update edges (for highlighting)
    useEffect(() => {
        setEdges(initialEdges);
    }, [initialEdges, setEdges]);

    // Disabled to prevent navigation errors
    // const onNodeClick = useCallback(
    //     (_event: React.MouseEvent, node: Node) => {
    //         if (onTableClick) {
    //             onTableClick(node.data.tableName, node.data.schema);
    //         }
    //     },
    //     [onTableClick]
    // );

    const onNodeMouseEnter = useCallback((_event: React.MouseEvent, node: Node) => {
        setHoveredNode(node.id);
        // Lazy fetch columns for this table
        fetchColumnsForTable(node.id);
    }, [fetchColumnsForTable]);

    const onNodeMouseLeave = useCallback(() => {
        setHoveredNode(null);
    }, []);

    // Fullscreen handlers
    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch((err) => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen().then(() => {
                setIsFullscreen(false);
            });
        }
    }, []);

    // Listen for fullscreen changes (e.g., ESC key)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Toggle layout: L key
            if (e.key === 'l' || e.key === 'L') {
                setLayoutType(prev => prev === 'smart' ? 'grid' : 'smart');
            }
            // Toggle fullscreen: F key
            if (e.key === 'f' || e.key === 'F') {
                toggleFullscreen();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [toggleFullscreen]);

    if (tablesLoading || fkLoading || !allColumnsLoaded) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-bg-0">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-accent" size={32} />
                    <div className="text-sm text-text-secondary">
                        {tablesLoading || fkLoading ? 'Loading ER Diagram...' : 'Loading columns...'}
                    </div>
                </div>
            </div>
        );
    }

    if (tables.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-bg-0">
                <div className="text-center">
                    <div className="text-text-secondary mb-2">No tables found in schema "{schema}"</div>
                    <div className="text-xs text-text-tertiary">Create some tables to see the ER diagram</div>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full h-full relative bg-bg-0">
            {/* Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-bg-1 border border-border rounded-lg shadow-lg px-3 py-2">
                <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Layout:
                </div>
                <button
                    onClick={() => setLayoutType('smart')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${layoutType === 'smart'
                        ? 'bg-accent text-white'
                        : 'bg-bg-2 text-text-secondary hover:bg-bg-3'
                        }`}
                >
                    Smart
                </button>
                <button
                    onClick={() => setLayoutType('grid')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${layoutType === 'grid'
                        ? 'bg-accent text-white'
                        : 'bg-bg-2 text-text-secondary hover:bg-bg-3'
                        }`}
                >
                    Grid
                </button>
                <div className="ml-2 pl-2 border-l border-border">
                    <div className="text-[10px] text-text-tertiary">
                        Press <kbd className="px-1 py-0.5 bg-bg-2 border border-border rounded text-text-secondary">L</kbd> to toggle
                    </div>
                </div>
            </div>

            {/* Fullscreen Button */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                <button
                    onClick={toggleFullscreen}
                    className="flex items-center gap-2 px-3 py-2 bg-bg-1 border border-border rounded-lg shadow-lg hover:bg-bg-2 transition-colors"
                    title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
                >
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    <span className="text-xs text-text-secondary">
                        {isFullscreen ? 'Exit' : 'Fullscreen'}
                    </span>
                    <kbd className="px-1 py-0.5 bg-bg-2 border border-border rounded text-[10px] text-text-tertiary">F</kbd>
                </button>
            </div>

            {/* Stats */}
            <div className="absolute top-4 right-4 z-10 bg-bg-1 border border-border rounded-lg shadow-lg px-3 py-2">
                <div className="flex items-center gap-4 text-xs">
                    <div>
                        <span className="text-text-tertiary">Tables:</span>{' '}
                        <span className="font-semibold text-accent">{tables.length}</span>
                    </div>
                    <div>
                        <span className="text-text-tertiary">Relations:</span>{' '}
                        <span className="font-semibold text-accent">{foreignKeys.length}</span>
                    </div>
                </div>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.1}
                maxZoom={2}
                defaultEdgeOptions={{
                    type: ConnectionLineType.SmoothStep,
                    animated: true,
                }}
            >
                <Background gap={16} size={1} color="var(--color-border)" />
                <Controls
                    className="!bg-bg-1 !border-border"
                    showInteractive={false}
                />
                <MiniMap
                    className="!bg-bg-1 !border-border"
                    nodeColor={(_node) => {
                        return 'var(--color-accent)';
                    }}
                    maskColor="rgba(0, 0, 0, 0.1)"
                />
            </ReactFlow>
        </div>
    );
}
