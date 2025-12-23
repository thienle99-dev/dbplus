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
  initialType?: Connection['type'];
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
  status_color?: string;
  tags?: string;
  environment?: string;
  safe_mode_level?: number;
  ssh_enabled?: boolean;
  ssh_host?: string;
  ssh_port?: number;
  ssh_user?: string;
  ssh_auth_type?: string;
  ssh_password?: string;
  ssh_key_file?: string;
  ssh_key_passphrase?: string;
  is_read_only?: boolean;
}
