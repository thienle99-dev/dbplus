import { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    ConnectionLineType,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useForeignKeys, useTables } from '../../hooks/useDatabase';
import TableNode from './TableNode';
import { getLayoutedElements } from './layout';
import { Loader2 } from 'lucide-react';

const nodeTypes = {
    table: TableNode,
};

interface ERDiagramProps {
    connectionId: string;
    schema: string;
    onTableClick?: (tableName: string, schema: string) => void;
}

export default function ERDiagram({ connectionId, schema, onTableClick }: ERDiagramProps) {
    const { data: foreignKeys = [], isLoading: fkLoading } = useForeignKeys(connectionId, schema);
    const { data: tables = [], isLoading: tablesLoading } = useTables(connectionId, schema);
    const [layoutType, setLayoutType] = useState<'grid' | 'smart'>('smart');
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [tableColumns, setTableColumns] = useState<Map<string, any[]>>(new Map());

    // Fetch columns for all tables
    useEffect(() => {
        const fetchColumns = async () => {
            const columnsMap = new Map<string, any[]>();

            for (const table of tables) {
                try {
                    const response = await fetch(
                        `/api/connections/${connectionId}/columns?schema=${schema}&table=${table.name}`
                    );
                    if (response.ok) {
                        const cols = await response.json();
                        columnsMap.set(table.name, cols);
                    }
                } catch (error) {
                    console.error(`Failed to fetch columns for ${table.name}:`, error);
                }
            }

            setTableColumns(columnsMap);
        };

        if (tables.length > 0) {
            fetchColumns();
        }
    }, [tables, connectionId, schema]);

    // Generate nodes and edges from data
    const { initialNodes, initialEdges } = useMemo(() => {
        if (tables.length === 0) {
            return { initialNodes: [], initialEdges: [] };
        }

        // Build FK lookup for quick checks
        const fkLookup = new Set<string>();

        foreignKeys.forEach(fk => {
            fkLookup.add(`${fk.tableName}.${fk.columnName}`);
        });

        // Create nodes for each table
        const nodes: Node[] = tables.map((table) => {
            // Get actual columns from fetched data
            const actualColumns = tableColumns.get(table.name) || [];

            // Map to ColumnInfo format
            const columns = actualColumns.map((col: any) => ({
                name: col.column_name || col.name,
                type: col.data_type || col.type || 'unknown',
                isPrimaryKey: col.is_primary_key || false,
                isForeignKey: fkLookup.has(`${table.name}.${col.column_name || col.name}`),
                isNullable: col.is_nullable === 'YES' || col.is_nullable === true,
            }));

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
                },
            };
        });

        // Create edges from foreign keys
        const edges: Edge[] = foreignKeys.map((fk, idx) => {
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
                    type: MarkerType.ArrowClosed,
                    color: isHighlighted ? '#6366f1' : '#6b7280',
                    width: 24,
                    height: 24,
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

        // Apply layout
        const layouted = getLayoutedElements(nodes, edges, layoutType);

        return {
            initialNodes: layouted.nodes,
            initialEdges: layouted.edges,
        };
    }, [tables, foreignKeys, schema, layoutType, hoveredNode, tableColumns]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Update nodes when data changes
    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    const onNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            if (onTableClick) {
                onTableClick(node.data.tableName, node.data.schema);
            }
        },
        [onTableClick]
    );

    const onNodeMouseEnter = useCallback((_event: React.MouseEvent, node: Node) => {
        setHoveredNode(node.id);
    }, []);

    const onNodeMouseLeave = useCallback(() => {
        setHoveredNode(null);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Toggle layout: L key
            if (e.key === 'l' || e.key === 'L') {
                setLayoutType(prev => prev === 'smart' ? 'grid' : 'smart');
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    if (tablesLoading || fkLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-bg-0">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-accent" size={32} />
                    <div className="text-sm text-text-secondary">Loading ER Diagram...</div>
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
        <div className="w-full h-full relative bg-bg-0">
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
                onNodeClick={onNodeClick}
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
