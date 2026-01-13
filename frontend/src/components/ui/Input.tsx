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
                        className={`w-full rounded-xl bg-bg-2 border border-border-strong px-3 py-2 text-sm text-text-primary placeholder:text-text-muted shadow-inner focus:outline-none focus:bg-bg-0 focus:border-accent/50 focus:ring-4 focus:ring-accent/10 hover:bg-bg-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${error ? 'bg-error/10 border-error/50 focus:border-error focus:ring-error/20' : ''} ${className}`}
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
