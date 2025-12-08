import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showCloseButton?: boolean;
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    showCloseButton = true,
}: ModalProps) {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <div
            className="fixed inset-0 z-[var(--z-modal-backdrop)] flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[var(--modal-backdrop)] backdrop-blur-sm"
                aria-hidden="true"
            />

            {/* Modal */}
            <div
                className={`
          relative
          w-full
          ${sizeClasses[size]}
          bg-[var(--modal-bg)]
          rounded-[var(--modal-radius)]
          shadow-[var(--modal-shadow)]
          flex flex-col
          max-h-[90vh]
          animate-in fade-in slide-in-from-top-2 duration-200
        `}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-divider)]">
                        {title && (
                            <h2 className="text-[var(--font-size-lg)] font-semibold text-[var(--color-text)]">
                                {title}
                            </h2>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="
                  p-1.5
                  rounded-[var(--radius-sm)]
                  text-[var(--color-text-muted)]
                  hover:text-[var(--color-text)]
                  hover:bg-[var(--color-hover)]
                  transition-colors
                "
                                aria-label="Close modal"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-divider)]">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
