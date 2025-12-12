import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
    helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, helperText, leftIcon, rightIcon, fullWidth, ...props }, ref) => {
        return (
            <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
                {label && <label className="text-sm font-medium text-text-secondary">{label}</label>}
                <div className="relative">
                    {leftIcon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">{leftIcon}</div>}
                    <input
                        ref={ref}
                        className={`w-full bg-bg-2 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent disabled:opacity-50 ${leftIcon ? 'pl-9' : ''} ${rightIcon ? 'pr-9' : ''} ${error ? 'border-error' : ''} ${className}`}
                        {...props}
                    />
                    {rightIcon && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">{rightIcon}</div>}
                </div>
                {error && <span className="text-xs text-error">{error}</span>}
                {helperText && !error && <span className="text-xs text-text-secondary">{helperText}</span>}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
