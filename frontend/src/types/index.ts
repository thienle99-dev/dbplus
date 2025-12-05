export interface Connection {
  id: string;
  name: string;
  type: "postgres" | "mysql" | "mongo" | "redis";
  host: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
}
