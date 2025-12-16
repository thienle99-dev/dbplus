interface RadioOption {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
}

interface RadioGroupProps {
    name: string;
    value: string;
    onChange: (value: string) => void;
    options: RadioOption[];
    orientation?: 'horizontal' | 'vertical';
    className?: string;
}

export default function RadioGroup({
    name,
    value,
    onChange,
    options,
    orientation = 'vertical',
    className = '',
}: RadioGroupProps) {
    return (
        <div
            role="radiogroup"
            className={`
        flex gap-3
        ${orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'}
        ${className}
      `}
        >
            {options.map((option) => (
                <label
                    key={option.value}
                    className={`
            flex items-start gap-3 cursor-pointer group
            ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
                >
                    <div className="flex items-center justify-center w-5 h-5 flex-shrink-0 mt-0.5">
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            checked={value === option.value}
                            onChange={(e) => !option.disabled && onChange(e.target.value)}
                            disabled={option.disabled}
                            className="sr-only"
                        />
                        <div
                            className={`
                w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center
                ${value === option.value
                                    ? 'border-accent bg-accent shadow-sm'
                                    : 'border-border bg-bg-2 group-hover:border-accent/50'
                                }
                ${option.disabled ? '' : 'cursor-pointer'}
              `}
                        >
                            {value === option.value && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                        </div>
                    </div>
                    <div className="flex-1">
                        <span className="block text-sm font-medium text-text-primary select-none">
                            {option.label}
                        </span>
                        {option.description && (
                            <span className="block text-xs text-text-secondary mt-0.5">
                                {option.description}
                            </span>
                        )}
                    </div>
                </label>
            ))}
        </div>
    );
}
