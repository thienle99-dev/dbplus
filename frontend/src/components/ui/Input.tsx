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
                        className={`w-full rounded-xl bg-bg-1/80 border border-border/60 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/70 focus:border-accent/60 disabled:bg-bg-2/80 disabled:cursor-not-allowed transition-all ${leftIcon ? 'pl-9' : ''} ${rightIcon ? 'pr-9' : ''} ${error ? 'border-red-500/80 focus:ring-red-500/60' : ''} ${className}`}
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
