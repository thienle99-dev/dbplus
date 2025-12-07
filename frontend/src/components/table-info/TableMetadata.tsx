import { Database } from 'lucide-react';

interface TableMetadataProps {
  schema: string;
  table: string;
}

export default function TableMetadata({ schema, table }: TableMetadataProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Database size={12} className="md:w-3.5 md:h-3.5 text-text-secondary" />
        <h4 className="text-[10px] md:text-xs font-medium text-text-secondary uppercase">Table Metadata</h4>
      </div>
      <div className="bg-bg-0 border border-border rounded p-2 md:p-3 space-y-1.5 md:space-y-2 text-[10px] md:text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-text-secondary whitespace-nowrap">Schema:</span>
          <span className="text-text-primary font-mono break-all text-right">{schema}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-text-secondary whitespace-nowrap">Table:</span>
          <span className="text-text-primary font-mono break-all text-right">{table}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-text-secondary whitespace-nowrap">Full Name:</span>
          <span className="text-text-primary font-mono break-all text-right">{schema}.{table}</span>
        </div>
      </div>
    </div>
  );
}
