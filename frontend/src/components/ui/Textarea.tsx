import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, error, ...props }, ref) => {
        return (
            <textarea
                ref={ref}
                className={`
          w-full
          rounded-xl
          bg-bg-1/80
          border border-border/60
          px-3 py-2
          text-sm text-text-primary
          placeholder:text-text-muted
          focus:outline-none
          focus:ring-2 focus:ring-accent/70 focus:border-accent/60
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          ${error ? 'border-red-500/80 focus:ring-red-500/60' : ''}
          ${className}
        `}
                {...props}
            />
        );
    }
);

Textarea.displayName = 'Textarea';

export default Textarea;
