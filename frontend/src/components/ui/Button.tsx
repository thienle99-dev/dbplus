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

        const baseStyles = 'inline-flex items-center justify-center gap-1.5 font-medium transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-px';

        const variants = {
            primary: 'rounded-full bg-accent text-bg-0 shadow-sm hover:bg-accent/90 hover:shadow-md transition-all',
            secondary: 'rounded-full border border-border-subtle bg-bg-2 backdrop-blur-sm text-text-secondary hover:bg-bg-3 hover:text-text-primary',
            ghost: 'rounded-full text-text-secondary hover:bg-bg-2 hover:text-text-primary',
            danger: 'rounded-full bg-error text-bg-0 hover:bg-error/90',
            outline: 'rounded-full border border-border-subtle text-text-primary hover:bg-bg-2 backdrop-blur-sm'
        };

        const sizes = {
            sm: 'px-3 py-1 text-xs',
            md: 'px-4 py-1.5 text-sm',
            lg: 'px-5 py-2 text-base'
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
