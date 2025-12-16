import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant = 'default', children, ...props }, ref) => {
        const variants = {
            default: 'bg-bg-3 text-text-secondary',
            success: 'bg-green-500/10 text-green-400',
            danger: 'bg-red-500/10 text-red-400',
            warning: 'bg-yellow-500/10 text-yellow-400',
            info: 'bg-blue-500/10 text-blue-400',
            outline: 'border border-border text-text-secondary',
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
