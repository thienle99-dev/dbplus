export interface SnippetVariable {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    default?: any;
    required: boolean;
    description?: string;
}

export interface QuerySnippet {
    id: string;
    name: string;
    description: string | null;
    sql: string;
    tags: string[] | null;
    variables?: SnippetVariable[] | null;
    created_at: string;
    updated_at: string;
}

export interface CreateSnippetParams {
    name: string;
    description?: string;
    sql: string;
    tags?: string[];
    variables?: SnippetVariable[];
}

export interface UpdateSnippetParams {
    name?: string;
    description?: string;
    sql?: string;
    tags?: string[];
    variables?: SnippetVariable[];
}
