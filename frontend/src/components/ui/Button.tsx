import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, loading, leftIcon, icon, rightIcon, children, ...props }, ref) => {
        const isButtonLoading = isLoading || loading;
        const startIcon = leftIcon || icon;

        const baseStyles = 'inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

        const variants = {
            primary: 'rounded-md bg-accent text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_1px_2px_rgba(0,0,0,0.4)] hover:shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_4px_8px_rgba(0,0,0,0.3)] hover:brightness-110 border border-transparent',
            secondary: 'rounded-md border border-border-default bg-bg-elevated text-text-primary shadow-sm hover:bg-bg-hover hover:border-border-strong',
            ghost: 'rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
            danger: 'rounded-md bg-error text-white shadow-sm hover:bg-error/90 border border-transparent',
            outline: 'rounded-md border border-border-subtle bg-transparent text-text-primary hover:bg-bg-sunken hover:border-border-strong'
        };

        const sizes = {
            sm: 'px-2.5 py-1 text-xs',
            md: 'px-3.5 py-1.5 text-sm leading-5',
            lg: 'px-5 py-2.5 text-base'
        };

        // Ghost buttons usually have less padding in the new system (e.g. h-7 px-2)
        // We can override size for ghost if needed, or rely on usage to pass className overrides.
        // For now, standardizing sizes for all.

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className || ''}`}
                {...props}
            >
                {isButtonLoading && <span className="animate-spin mr-1">⟳</span>}
                {!isButtonLoading && startIcon && <span className="flex items-center text-current opacity-90">{startIcon}</span>}
                {children}
                {!isButtonLoading && rightIcon && <span className="flex items-center text-current opacity-90">{rightIcon}</span>}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
