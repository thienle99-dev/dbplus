import { Check } from 'lucide-react';

interface CheckboxProps {
    id?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    description?: string;
    disabled?: boolean;
    className?: string;
}

export default function Checkbox({
    id,
    checked,
    onChange,
    label,
    description,
    disabled = false,
    className = '',
}: CheckboxProps) {
    const handleClick = () => {
        if (!disabled) {
            onChange(!checked);
        }
    };

    return (
        <div className={`flex items-start gap-3 ${className}`}>
            <button
                type="button"
                id={id}
                role="checkbox"
                aria-checked={checked}
                disabled={disabled}
                onClick={handleClick}
                className={`
          flex items-center justify-center w-5 h-5 rounded-md border-2 transition-all flex-shrink-0 mt-0.5
          ${checked
                        ? 'bg-accent border-accent shadow-sm'
                        : 'bg-bg-2 border-border hover:border-accent/50'
                    }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-bg-0
        `}
            >
                {checked && (
                    <Check size={14} className="text-white" strokeWidth={3} />
                )}
            </button>
            {(label || description) && (
                <div className="flex-1">
                    {label && (
                        <label
                            htmlFor={id}
                            onClick={handleClick}
                            className={`
                block text-sm font-medium text-text-primary cursor-pointer select-none
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
                        >
                            {label}
                        </label>
                    )}
                    {description && (
                        <p className="text-xs text-text-secondary mt-0.5">
                            {description}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
