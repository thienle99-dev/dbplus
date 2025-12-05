export interface Connection {
  id: string;
  name: string;
  type: "postgres" | "mysql" | "mongo" | "redis";
  host: string;
  database: string;
}
