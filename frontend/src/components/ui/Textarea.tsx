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
          rounded-lg
          bg-bg-2
          border border-border-subtle
          px-3 py-2
          text-sm text-text-primary
          placeholder:text-text-muted/70
          shadow-sm
          focus:outline-none
          focus:bg-bg-0
          focus:border-accent/40
          focus:ring-4 focus:ring-accent/10
          hover:bg-bg-3
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          ${error ? 'bg-error/5 border-error/50 focus:border-error focus:ring-error/20' : ''}
          ${className}
        `}
                {...props}
            />
        );
    }
);

Textarea.displayName = 'Textarea';

export default Textarea;
