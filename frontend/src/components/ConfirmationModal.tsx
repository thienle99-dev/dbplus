import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ConfirmationModalProps } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  requireTyping,
}: ConfirmationModalProps) {
  const [typedValue, setTypedValue] = useState('');

  useEffect(() => {
    if (isOpen) setTypedValue('');
  }, [isOpen]);

  const isConfirmed = !requireTyping || typedValue === requireTyping;

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
        disabled={!isConfirmed}
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
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">{message}</p>
        
        {requireTyping && (
          <div>
            <p className="text-xs text-text-secondary mb-2">
              Type <span className="font-mono font-bold text-text-primary select-all">{requireTyping}</span> to confirm:
            </p>
            <Input
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={requireTyping}
              className="w-full font-mono text-sm"
              autoFocus
              onPaste={(e) => e.preventDefault()} // Force typing? User requested "typing a keyword". Maybe allowing paste is fine. I'll allow paste for now unless strict.
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
