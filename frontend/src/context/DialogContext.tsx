import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'destructive' | 'danger';
}

interface PromptOptions {
    title: string;
    message: string;
    placeholder?: string;
    initialValue?: string;
    confirmLabel?: string;
    cancelLabel?: string;
}

interface DialogContextType {
    confirm: {
        (options: ConfirmOptions): Promise<boolean>;
        (title: string, message: string, options?: Partial<ConfirmOptions>): Promise<boolean>;
    };
    prompt: {
        (options: PromptOptions): Promise<string | null>;
        (title: string, message: string, options?: Partial<PromptOptions>): Promise<string | null>;
    };
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: React.ReactNode }) {
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        options: ConfirmOptions;
    } | null>(null);

    const [promptState, setPromptState] = useState<{
        isOpen: boolean;
        options: PromptOptions;
        value: string;
    } | null>(null);

    const confirmResolver = useRef<((value: boolean) => void) | null>(null);
    const promptResolver = useRef<((value: string | null) => void) | null>(null);

    const confirm = useCallback((titleOrOptions: string | ConfirmOptions, message?: string, options?: Partial<ConfirmOptions>) => {
        let finalOptions: ConfirmOptions;
        if (typeof titleOrOptions === 'string') {
            finalOptions = {
                title: titleOrOptions,
                message: message || '',
                ...options
            };
        } else {
            finalOptions = titleOrOptions;
        }

        return new Promise<boolean>((resolve) => {
            confirmResolver.current = resolve;
            setConfirmState({ isOpen: true, options: finalOptions });
        });
    }, []);

    const prompt = useCallback((titleOrOptions: string | PromptOptions, message?: string, options?: Partial<PromptOptions>) => {
        let finalOptions: PromptOptions;
        if (typeof titleOrOptions === 'string') {
            finalOptions = {
                title: titleOrOptions,
                message: message || '',
                ...options
            };
        } else {
            finalOptions = titleOrOptions;
        }

        return new Promise<string | null>((resolve) => {
            promptResolver.current = resolve;
            setPromptState({ 
                isOpen: true, 
                options: finalOptions, 
                value: finalOptions.initialValue || '' 
            });
        });
    }, []);

    const handleConfirmClose = (value: boolean) => {
        setConfirmState(prev => prev ? { ...prev, isOpen: false } : null);
        setTimeout(() => {
            if (confirmResolver.current) {
                confirmResolver.current(value);
                confirmResolver.current = null;
            }
            setConfirmState(null);
        }, 200);
    };

    const handlePromptClose = (value: string | null) => {
        setPromptState(prev => prev ? { ...prev, isOpen: false } : null);
        setTimeout(() => {
            if (promptResolver.current) {
                promptResolver.current(value);
                promptResolver.current = null;
            }
            setPromptState(null);
        }, 200);
    };

    return (
        <DialogContext.Provider value={{ confirm, prompt }}>
            {children}

            {/* Confirmation Dialog */}
            {confirmState && (
                <Modal
                    isOpen={confirmState.isOpen}
                    onClose={() => handleConfirmClose(false)}
                    title={confirmState.options.title}
                    size="sm"
                    footer={
                        <>
                            <Button
                                variant="secondary"
                                onClick={() => handleConfirmClose(false)}
                            >
                                {confirmState.options.cancelLabel || 'Cancel'}
                            </Button>
                            <Button
                                variant={confirmState.options.variant === 'destructive' || confirmState.options.variant === 'danger' ? 'danger' : 'primary'}
                                onClick={() => handleConfirmClose(true)}
                                autoFocus
                            >
                                {confirmState.options.confirmLabel || 'Confirm'}
                            </Button>
                        </>
                    }
                >
                    <p className="text-sm text-text-secondary leading-relaxed">
                        {confirmState.options.message}
                    </p>
                </Modal>
            )}

            {/* Prompt Dialog */}
            {promptState && (
                <Modal
                    isOpen={promptState.isOpen}
                    onClose={() => handlePromptClose(null)}
                    title={promptState.options.title}
                    size="sm"
                    footer={
                        <>
                            <Button
                                variant="secondary"
                                onClick={() => handlePromptClose(null)}
                            >
                                {promptState.options.cancelLabel || 'Cancel'}
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => handlePromptClose(promptState.value)}
                            >
                                {promptState.options.confirmLabel || 'OK'}
                            </Button>
                        </>
                    }
                >
                    <div className="space-y-3">
                        <p className="text-sm text-text-secondary">
                            {promptState.options.message}
                        </p>
                        <Input
                            autoFocus
                            value={promptState.value}
                            onChange={(e) => setPromptState(prev => prev ? { ...prev, value: e.target.value } : null)}
                            placeholder={promptState.options.placeholder}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handlePromptClose(promptState.value);
                                }
                            }}
                        />
                    </div>
                </Modal>
            )}
        </DialogContext.Provider>
    );
}

export function useDialog() {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
}
