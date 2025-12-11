export interface QuerySnippet {
    id: string;
    name: string;
    description: string | null;
    sql: string;
    tags: string[] | null;
    created_at: string;
    updated_at: string;
}

export interface CreateSnippetParams {
    name: string;
    description?: string;
    sql: string;
    tags?: string[];
}

export interface UpdateSnippetParams {
    name?: string;
    description?: string;
    sql?: string;
    tags?: string[];
}
