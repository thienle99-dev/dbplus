import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, Database, Table } from 'lucide-react';
import api from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import * as Collapsible from '@radix-ui/react-collapsible';

interface TableInfo {
  schema: string;
  name: string;
  table_type: string;
}

interface SchemaNodeProps {
  schemaName: string;
  connectionId: string;
}

function SchemaNode({ schemaName, connectionId }: SchemaNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchTables = async () => {
    if (tables.length > 0) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/connections/${connectionId}/tables?schema=${schemaName}`);
      setTables(response.data);
    } catch (error) {
      console.error(`Failed to fetch tables for schema ${schemaName}:`, error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Collapsible.Root open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) fetchTables();
    }}>
      <Collapsible.Trigger className="flex items-center gap-1 w-full p-1 hover:bg-bg-2 rounded text-sm text-text-primary group">
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Database size={14} className="text-accent" />
        <span className="truncate">{schemaName}</span>
      </Collapsible.Trigger>

      <Collapsible.Content className="pl-4 border-l border-border ml-2 mt-1 space-y-0.5 CollapsibleContent">
        {loading ? (
          <div className="text-xs text-text-secondary p-1">Loading...</div>
        ) : (
          tables.map((table) => (
            <div
              key={table.name}
              onClick={() => navigate(`/workspace/${connectionId}/tables/${schemaName}/${table.name}`)}
              className="flex items-center gap-2 p-1 hover:bg-bg-2 rounded text-sm text-text-secondary hover:text-text-primary cursor-pointer"
            >
              <Table size={14} />
              <span className="truncate">{table.name}</span>
            </div>
          ))
        )}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

export default function SchemaTree() {
  const { connectionId } = useParams();
  const [schemas, setSchemas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (connectionId) {
      fetchSchemas();
    }
  }, [connectionId]);

  const fetchSchemas = async () => {
    try {
      const response = await api.get(`/api/connections/${connectionId}/schemas`);
      setSchemas(response.data);
    } catch (error) {
      console.error('Failed to fetch schemas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-sm text-text-secondary">Loading schemas...</div>;

  return (
    <div className="flex flex-col gap-1 p-2">
      {schemas.map((schema) => (
        <SchemaNode key={schema} schemaName={schema} connectionId={connectionId!} />
      ))}
    </div>
  );
}
