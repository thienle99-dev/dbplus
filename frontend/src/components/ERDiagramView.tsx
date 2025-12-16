import React, { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
  ConnectionLineType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { useParams } from 'react-router-dom';
import { useTables, useSchemaForeignKeys } from '../hooks/useDatabase';
import { TableInfo, SchemaForeignKey } from '../types';

const nodeWidth = 180;
const nodeHeight = 50;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: 'LR' });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    // adjust for center point
    // node.position = {
    //   x: nodeWithPosition.x - nodeWidth / 2,
    //   y: nodeWithPosition.y - nodeHeight / 2,
    // };
    // actually dagre returns top-left usually? No, dagre returns center.
    // ReactFlow expects top-left.
    
    return {
      ...node,
      position: {
          x: nodeWithPosition.x - nodeWidth / 2,
          y: nodeWithPosition.y - nodeHeight / 2,
      },
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
    };
  });

  return { nodes: layoutedNodes, edges };
};

export default function ERDiagramView() {
  const { connectionId, schema: routeSchema } = useParams();
  // If embedded, schema might be passed in differently, but for now strict route usage.
  const schema = routeSchema || 'public';

  const { data: tables = [], isLoading: tablesLoading } = useTables(connectionId, schema);
  const { data: foreignKeys = [], isLoading: fksLoading } = useSchemaForeignKeys(connectionId, schema);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!tables.length && !foreignKeys.length) return;

    // Create Nodes
    const newNodes: Node[] = tables.map((table: TableInfo) => ({
      id: table.name,
      data: { label: table.name }, // Simple default node for now
      position: { x: 0, y: 0 },
      style: { 
          border: '1px solid #777', 
          padding: '10px', 
          borderRadius: '4px', 
          background: 'var(--color-bg-1)',
          color: 'var(--color-text-primary)' 
      },
    }));

    // Create Edges
    const newEdges: Edge[] = foreignKeys.map((fk: SchemaForeignKey, index) => ({
      id: `e-${index}`,
      source: fk.source_table,
      target: fk.target_table,
      type: ConnectionLineType.SmoothStep,
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      style: { stroke: '#888' },
      label: fk.source_column // Optional: show column name on edge
    }));

    // Layout
    const layout = getLayoutedElements(newNodes, newEdges);
    setNodes(layout.nodes);
    setEdges(layout.edges);

  }, [tables, foreignKeys, setNodes, setEdges]);
  
  if (tablesLoading || fksLoading) {
      return <div className="p-4 text-text-secondary">Loading diagram...</div>;
  }

  return (
    <div className="h-full w-full bg-bg-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Controls />
        <MiniMap nodeStrokeColor="#aaa" nodeColor="#333" maskColor="rgba(0,0,0,0.2)" />
        <Background gap={16} />
      </ReactFlow>
    </div>
  );
}
