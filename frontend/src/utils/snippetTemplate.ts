export function extractTemplateVariables(sql: string): string[] {
  const vars = new Set<string>();
  const re = /{{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    vars.add(m[1]);
  }
  return Array.from(vars);
}

export function applyTemplateVariables(sql: string, values: Record<string, string>): string {
  return sql.replace(/{{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g, (_match, name: string) => {
    return Object.prototype.hasOwnProperty.call(values, name) ? values[name] : '';
  });
}

