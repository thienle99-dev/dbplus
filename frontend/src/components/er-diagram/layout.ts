import { Node, Edge } from 'reactflow';
import { ERNode, EREdge } from '../../types/foreignKey';

/**
 * Simple grid layout for ER diagram nodes
 */
export function calculateGridPosition(index: number, total: number): { x: number; y: number } {
    const cols = Math.ceil(Math.sqrt(total));
    const row = Math.floor(index / cols);
    const col = index % cols;

    return {
        x: col * 350 + 50,
        y: row * 450 + 50,
    };
}

/**
 * Calculate positions for nodes based on their relationships
 * Tables with more connections are placed more centrally
 */
export function calculateSmartLayout(
    tables: string[],
    foreignKeys: Array<{ tableName: string; referencedTableName: string }>
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    // Calculate connection count for each table
    const connectionCount = new Map<string, number>();
    tables.forEach(table => connectionCount.set(table, 0));

    foreignKeys.forEach(fk => {
        connectionCount.set(fk.tableName, (connectionCount.get(fk.tableName) || 0) + 1);
        connectionCount.set(fk.referencedTableName, (connectionCount.get(fk.referencedTableName) || 0) + 1);
    });

    // Sort tables by connection count (most connected first)
    const sortedTables = [...tables].sort((a, b) => {
        const countA = connectionCount.get(a) || 0;
        const countB = connectionCount.get(b) || 0;
        return countB - countA;
    });

    // Place most connected table in center
    const centerX = 400;
    const centerY = 300;
    const radius = 300;

    sortedTables.forEach((table, index) => {
        if (index === 0) {
            // Most connected table in center
            positions.set(table, { x: centerX, y: centerY });
        } else {
            // Arrange others in a circle
            const angle = (2 * Math.PI * (index - 1)) / (sortedTables.length - 1);
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            positions.set(table, { x, y });
        }
    });

    return positions;
}

/**
 * Get layout with automatic positioning
 */
export function getLayoutedElements(
    nodes: Node<any>[],
    edges: Edge<any>[],
    layoutType: 'grid' | 'smart' = 'smart'
): { nodes: Node<any>[]; edges: Edge<any>[] } {
    if (layoutType === 'grid') {
        return {
            nodes: nodes.map((node, index) => ({
                ...node,
                position: calculateGridPosition(index, nodes.length),
            })),
            edges,
        };
    }

    // Smart layout based on relationships
    const foreignKeys = edges.map(edge => ({
        tableName: edge.source,
        referencedTableName: edge.target,
    }));

    const positions = calculateSmartLayout(
        nodes.map(n => n.id),
        foreignKeys
    );

    return {
        nodes: nodes.map(node => ({
            ...node,
            position: positions.get(node.id) || { x: 0, y: 0 },
        })),
        edges,
    };
}
