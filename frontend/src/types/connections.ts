// DatabaseType removed to avoid conflict with database.ts
export interface DatabaseSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (dbType: string) => void;
}

export interface ConnectionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (connection: Omit<Connection, 'id'>) => Promise<void>;
  initialValues?: Omit<Connection, 'id'>;
}

export interface ConnectionListProps {
  connections: Connection[];
  onSelect: (connection: Connection) => void;
  onEdit: (connection: Connection) => void;
  onDelete: (connectionId: string) => void;
}

export interface Connection {
  id: string;
  name: string;
  type: string;
  host: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
}
