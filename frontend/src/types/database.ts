export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  affected_rows: number;
}

export type EditState = Record<string, Record<number, unknown>>;

export interface DatabaseType {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  isAvailable: boolean;
}
