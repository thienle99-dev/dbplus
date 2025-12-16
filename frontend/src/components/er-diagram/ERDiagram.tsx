import { useCallback, useMemo, useState } from 'react';
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

    // Generate nodes and edges from data
    const { initialNodes, initialEdges } = useMemo(() => {
        if (tables.length === 0) {
            return { initialNodes: [], initialEdges: [] };
        }

        // Create nodes for each table
        const nodes: Node[] = tables.map((table) => ({
            id: table.name,
            type: 'table',
            position: { x: 0, y: 0 }, // Will be set by layout
            data: {
                label: table.name,
                tableName: table.name,
                schema: schema,
                columns: [], // Will be populated if needed
                primaryKeys: [],
            },
        }));

        // Create edges from foreign keys
        const edges: Edge[] = foreignKeys.map((fk, idx) => ({
            id: `${fk.constraintName}-${idx}`,
            source: fk.tableName,
            target: fk.referencedTableName,
            sourceHandle: `${fk.tableName}-${fk.columnName}-source`,
            targetHandle: `${fk.referencedTableName}-${fk.referencedColumnName}-target`,
            label: `${fk.columnName}`,
            animated: true,
            type: ConnectionLineType.SmoothStep,
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: 'var(--color-accent)',
            },
            style: {
                stroke: 'var(--color-accent)',
                strokeWidth: 2,
            },
            data: {
                constraintName: fk.constraintName,
                columnName: fk.columnName,
                referencedColumnName: fk.referencedColumnName,
                onDelete: fk.onDelete,
                onUpdate: fk.onUpdate,
            },
        }));

        // Apply layout
        const layouted = getLayoutedElements(nodes, edges, layoutType);

        return {
            initialNodes: layouted.nodes,
            initialEdges: layouted.edges,
        };
    }, [tables, foreignKeys, schema, layoutType]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Update nodes when data changes
    useMemo(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    const onNodeClick = useCallback(
        (event: React.MouseEvent, node: Node) => {
            if (onTableClick) {
                onTableClick(node.data.tableName, node.data.schema);
            }
        },
        [onTableClick]
    );

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
                    nodeColor={(node) => {
                        return 'var(--color-accent)';
                    }}
                    maskColor="rgba(0, 0, 0, 0.1)"
                />
            </ReactFlow>
        </div>
    );
}
