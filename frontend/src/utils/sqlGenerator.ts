import { TableColumn, IndexInfo, TableConstraints } from '../types';

export function generateSqlDefinition(
  schema: string,
  table: string,
  columns: TableColumn[],
  indexes: IndexInfo[],
  constraints: TableConstraints | null
): string {
  if (!schema || !table || columns.length === 0) {
    return '-- No table definition available';
  }

  let sql = `-- Table Definition for ${schema}.${table}\n`;

  const columnDefs = columns.map((col) => {
    let def = `  "${col.name}" ${col.data_type}`;
    if (!col.is_nullable) def += ' NOT NULL';
    if (col.default_value) def += ` DEFAULT ${col.default_value}`;
    return def;
  }).join(',\n');

  const pkColumns = columns
    .filter((col) => col.is_primary_key)
    .map((col) => `"${col.name}"`)
    .join(', ');

  sql += `CREATE TABLE "${schema}"."${table}" (\n${columnDefs}`;
  if (pkColumns) {
    sql += `,\n  PRIMARY KEY (${pkColumns})`;
  }
  sql += '\n);\n';

  if (constraints) {
    if (constraints.foreign_keys.length > 0) {
      sql += '\n-- Foreign Keys\n';
      constraints.foreign_keys.forEach(fk => {
        let fkSql = `ALTER TABLE "${schema}"."${table}" ADD CONSTRAINT "${fk.constraint_name}" FOREIGN KEY ("${fk.column_name}") REFERENCES "${fk.foreign_schema}"."${fk.foreign_table}" ("${fk.foreign_column}")`;
        if (fk.update_rule && fk.update_rule !== 'NO ACTION') fkSql += ` ON UPDATE ${fk.update_rule}`;
        if (fk.delete_rule && fk.delete_rule !== 'NO ACTION') fkSql += ` ON DELETE ${fk.delete_rule}`;
        fkSql += ';';
        sql += `${fkSql}\n`;
      });
    }

    if (constraints.check_constraints.length > 0) {
      sql += '\n-- Check Constraints\n';
      constraints.check_constraints.forEach(ck => {
        sql += `ALTER TABLE "${schema}"."${table}" ADD CONSTRAINT "${ck.constraint_name}" CHECK (${ck.check_clause});\n`;
      });
    }

    if (constraints.unique_constraints.length > 0) {
      sql += '\n-- Unique Constraints\n';
      constraints.unique_constraints.forEach(uq => {
        const cols = uq.columns.map(c => `"${c}"`).join(', ');
        sql += `ALTER TABLE "${schema}"."${table}" ADD CONSTRAINT "${uq.constraint_name}" UNIQUE (${cols});\n`;
      });
    }
  }

  const nonPkIndexes = indexes.filter(idx => !idx.is_primary);
  const visibleIndexes = nonPkIndexes.filter(idx => {
    if (idx.is_unique && constraints?.unique_constraints.some(uc => uc.constraint_name === idx.name)) {
      return false;
    }
    return true;
  });

  if (visibleIndexes.length > 0) {
    sql += '\n-- Indexes\n';
    visibleIndexes.forEach(idx => {
      const indexType = idx.is_unique ? 'UNIQUE INDEX' : 'INDEX';
      const colList = idx.columns.map(c => `"${c}"`).join(', ');
      let indexSql = `CREATE ${indexType} "${idx.name}" ON "${schema}"."${table}"`;

      if (idx.algorithm && idx.algorithm !== 'BTREE') {
        indexSql += ` USING ${idx.algorithm}`;
      }

      indexSql += ` (${colList})`;

      if (idx.include && idx.include.length > 0) {
        indexSql += ` INCLUDE (${idx.include.map(c => `"${c}"`).join(', ')})`;
      }

      if (idx.condition) {
        indexSql += ` WHERE ${idx.condition}`;
      }

      indexSql += ';';
      sql += `${indexSql}\n`;

      if (idx.comment) {
        sql += `COMMENT ON INDEX "${idx.name}" IS '${idx.comment.replace(/'/g, "''")}';\n`;
      }
    });
  }

  return sql;
}
