
export function tryGetDateFromTimestamp(value: unknown): string | null {
    if (value === null || value === undefined) return null;

    const num = Number(value);
    if (isNaN(num)) return null;

    // Filter out small numbers/IDs that definitely aren't timestamps 
    // (e.g., ID: 1, 100, 2023)
    // Timestamp for 2000-01-01 is ~946684800
    // Timestamp for 2100-01-01 is ~4102444800
    
    // Check seconds (10 digits)
    if (num > 946684800 && num < 4102444800) {
        try {
            const date = new Date(num * 1000);
            return date.toLocaleString();
        } catch {
            return null;
        }
    }

    // Check milliseconds (13 digits)
    // 2000-01-01 ms: 946684800000
    // 2100-01-01 ms: 4102444800000
    if (num > 946684800000 && num < 4102444800000) {
        try {
            const date = new Date(num);
            return date.toLocaleString();
        } catch {
            return null;
        }
    }

    return null;
}
