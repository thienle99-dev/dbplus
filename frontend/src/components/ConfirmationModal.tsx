import { AlertTriangle } from 'lucide-react';
import { ConfirmationModalProps } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
}: ConfirmationModalProps) {

  const footer = (
    <div className="flex w-full justify-end gap-2">
      <Button variant="secondary" onClick={onClose}>
        {cancelText}
      </Button>
      <Button
        variant={isDangerous ? 'danger' : 'primary'}
        onClick={() => {
          onConfirm();
          onClose();
        }}
      >
        {confirmText}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {isDangerous && <AlertTriangle size={18} className="text-red-500" />}
          {title}
        </div>
      }
      size="sm"
      footer={footer}
    >
      <p className="text-sm text-text-secondary">{message}</p>
    </Modal>
  );
}
