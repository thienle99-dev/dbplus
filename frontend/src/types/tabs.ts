export type SplitMode = 'none' | 'vertical' | 'horizontal';

export interface Tab {
  id: string;
  title: string;
  type: 'query' | 'table';
  sql?: string;
  schema?: string;
  table?: string;
  metadata?: Record<string, any>;
  isDraft?: boolean;
  savedQueryId?: string;
  lastModified?: number;
  isDirty?: boolean;
  pinned?: boolean;
  splitMode?: SplitMode;
}
