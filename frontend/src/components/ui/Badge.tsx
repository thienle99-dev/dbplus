import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant = 'default', children, ...props }, ref) => {
        const variants = {
            default: 'bg-background-sunken text-text-secondary border border-border-subtle',
            success: 'bg-success/15 text-success',
            danger: 'bg-error/15 text-error',
            warning: 'bg-warning/15 text-warning',
            info: 'bg-info/15 text-info',
            outline: 'border border-border-default text-text-secondary',
        };

        return (
            <span
                ref={ref}
                className={`
          inline-flex items-center
          rounded-full
          px-2.5 py-0.5
          text-[10px] font-medium
          tracking-wide
          ${variants[variant]}
          ${className}
        `}
                {...props}
            >
                {children}
            </span>
        );
    }
);

Badge.displayName = 'Badge';

export default Badge;
