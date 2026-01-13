export interface WorkerRequest {
    type: 'format' | 'filter' | 'sort';
    data: any;
    requestId: number;
}

export interface FormatRequest {
    type: 'format';
    data: {
        rows: any[][];
        columns: string[];
        types: string[];
    };
    requestId: number;
}

export interface FormatResponse {
    formattedRows: any[][];
    processTime: number;
}

// Worker message handler
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
    const startTime = performance.now();
    const { requestId } = e.data;

    try {
        switch (e.data.type) {
            case 'format': {
                const { rows, columns, types } = (e.data as FormatRequest).data;
                const formattedRows = formatRows(rows, columns, types || []);

                const response: FormatResponse = {
                    formattedRows,
                    processTime: performance.now() - startTime,
                };

                self.postMessage({ requestId, success: true, data: response });
                break;
            }

            case 'filter': {
                // TODO: Implement filtering
                self.postMessage({ requestId, success: true, data: { message: 'Filtering not implemented' } });
                break;
            }

            case 'sort': {
                // TODO: Implement sorting
                self.postMessage({ requestId, success: true, data: { message: 'Sorting not implemented' } });
                break;
            }

            default:
                throw new Error(`Unknown request type: ${(e.data as any).type}`);
        }
    } catch (error) {
        self.postMessage({
            requestId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * Format rows with proper type conversion
 */
function formatRows(
    rows: any[][],
    _columns: string[],
    types: string[]
): any[][] {
    return rows.map(row => {
        return row.map((cell, index) => {
            if (cell === null || cell === undefined) {
                return null;
            }

            const type = types[index];

            // Type-specific formatting
            switch (type) {
                case 'timestamp':
                case 'timestamptz':
                case 'date':
                    return formatDate(cell);

                case 'numeric':
                case 'decimal':
                    return formatNumber(cell);

                case 'json':
                case 'jsonb':
                    return formatJSON(cell);

                case 'uuid':
                    return typeof cell === 'string' ? cell.toLowerCase() : String(cell);

                case 'bytea':
                    return formatBinary(cell);

                default:
                    return typeof cell === 'object' ? JSON.stringify(cell) : String(cell);
            }
        });
    });
}

function formatDate(value: any): string {
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    return String(value);
}

function formatNumber(value: any): string {
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string') return value;
    return String(value);
}

function formatJSON(value: any): string {
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
}

function formatBinary(value: any): string {
    if (value instanceof ArrayBuffer) {
        return `<${value.byteLength} bytes>`;
    }
    return String(value);
}
