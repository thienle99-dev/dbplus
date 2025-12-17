/**
 * Format a cell value for display in the table
 * Handles JSON, arrays, objects, and other complex types
 */
export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Handle objects and arrays (JSONB, JSON, arrays, etc.)
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  // Handle numbers
  if (typeof value === 'number') {
    return String(value);
  }

  // Handle strings and everything else
  return String(value);
}

/**
 * Check if a value is a complex type (JSON, array, object)
 */
export function isComplexType(value: unknown): boolean {
  return value !== null && typeof value === 'object';
}

/**
 * Parse a string value back to its original type
 * Used when editing cells
 */
export function parseCellValue(value: string, originalValue: unknown): unknown {
  // If original was null/undefined, return the string as-is
  if (originalValue === null || originalValue === undefined) {
    return value === '' ? null : value;
  }

  // If original was a complex type, try to parse as JSON
  if (isComplexType(originalValue)) {
    try {
      return JSON.parse(value);
    } catch {
      // If parse fails, return as string
      return value;
    }
  }

  // If original was a boolean
  if (typeof originalValue === 'boolean') {
    return value.toLowerCase() === 'true';
  }

  // If original was a number
  if (typeof originalValue === 'number') {
    const parsed = Number(value);
    return isNaN(parsed) ? value : parsed;
  }

  // Default: return as string
  return value;
}
