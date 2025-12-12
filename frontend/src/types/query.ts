export interface SavedQuery {
    id: string;
    name: string;
    sql: string;
    description?: string;
    created_at: string;
    folder_id?: string;
    tags?: string[];
    metadata?: Record<string, any>;
}

export interface QuerySnippet {
    id: string;
    trigger: string;
    description: string;
    snippet: string;
}
