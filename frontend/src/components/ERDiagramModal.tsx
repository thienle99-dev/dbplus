import Modal from './ui/Modal';
import ERDiagram from './er-diagram/ERDiagram';
import { Network } from 'lucide-react';

interface ERDiagramModalProps {
    isOpen: boolean;
    onClose: () => void;
    connectionId: string;
    schema: string;
    onTableClick?: (tableName: string, schema: string) => void;
}

export default function ERDiagramModal({
    isOpen,
    onClose,
    connectionId,
    schema,
    onTableClick,
}: ERDiagramModalProps) {
    const handleTableClick = (tableName: string, tableSchema: string) => {
        if (onTableClick) {
            onTableClick(tableName, tableSchema);
        }
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Network size={18} className="text-accent" />
                    <span>ER Diagram - {schema}</span>
                </div>
            }
            size="xl"
            footer={null}
        >
            <div className="h-[85vh] w-full">
                <ERDiagram
                    connectionId={connectionId}
                    schema={schema}
                    onTableClick={handleTableClick}
                />
            </div>
        </Modal>
    );
}
