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

        return (
            <button
                ref={ref}
                className={`flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
                {...props}
            >
                {isButtonLoading && <span className="mr-2">Loading...</span>}
                {startIcon && <span className="mr-2">{startIcon}</span>}
                {children}
                {rightIcon && <span className="ml-2">{rightIcon}</span>}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
