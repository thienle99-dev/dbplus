import React, { useState } from 'react';
import { SnippetVariable } from '../../types/snippet';

interface SnippetParameterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExecute: (params: Record<string, any>) => void;
    variables: SnippetVariable[];
    snippetName: string;
}

export const SnippetParameterModal: React.FC<SnippetParameterModalProps> = ({
    isOpen,
    onClose,
    onExecute,
    variables,
    snippetName,
}) => {
    const [params, setParams] = useState<Record<string, any>>(() => {
        const initial: Record<string, any> = {};
        variables.forEach((v) => {
            initial[v.name] = v.default !== undefined ? v.default : '';
        });
        return initial;
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        const newErrors: Record<string, string> = {};
        variables.forEach((v) => {
            if (v.required && (params[v.name] === '' || params[v.name] === null || params[v.name] === undefined)) {
                newErrors[v.name] = 'This field is required';
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onExecute(params);
        onClose();
    };

    const handleChange = (name: string, value: any) => {
        setParams((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const renderInput = (variable: SnippetVariable) => {
        const value = params[variable.name];
        const error = errors[variable.name];

        switch (variable.type) {
            case 'number':
                return (
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => handleChange(variable.name, e.target.value ? Number(e.target.value) : '')}
                        className={`w-full px-3 py-2 bg-bg-0 border rounded text-text-primary ${
                            error ? 'border-error' : 'border-border'
                        } focus:outline-none focus:border-primary-default`}
                        placeholder={variable.description || `Enter ${variable.name}`}
                    />
                );
            case 'boolean':
                return (
                    <select
                        value={String(value)}
                        onChange={(e) => handleChange(variable.name, e.target.value === 'true')}
                        className={`w-full px-3 py-2 bg-bg-0 border rounded text-text-primary ${
                            error ? 'border-error' : 'border-border'
                        } focus:outline-none focus:border-primary-default`}
                    >
                        <option value="">Select...</option>
                        <option value="true">True</option>
                        <option value="false">False</option>
                    </select>
                );
            case 'date':
                return (
                    <input
                        type="date"
                        value={value}
                        onChange={(e) => handleChange(variable.name, e.target.value)}
                        className={`w-full px-3 py-2 bg-bg-0 border rounded text-text-primary ${
                            error ? 'border-error' : 'border-border'
                        } focus:outline-none focus:border-primary-default`}
                    />
                );
            default: // string
                return (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => handleChange(variable.name, e.target.value)}
                        className={`w-full px-3 py-2 bg-bg-0 border rounded text-text-primary ${
                            error ? 'border-error' : 'border-border'
                        } focus:outline-none focus:border-primary-default`}
                        placeholder={variable.description || `Enter ${variable.name}`}
                    />
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-bg-1 rounded-lg shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-text-primary">Execute Snippet: {snippetName}</h2>
                    <p className="text-sm text-text-secondary mt-1">Enter parameter values</p>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
                    <div className="px-6 py-4 space-y-4">
                        {variables.map((variable) => (
                            <div key={variable.name}>
                                <label className="block text-sm font-medium text-text-primary mb-1">
                                    {variable.name}
                                    {variable.required && <span className="text-error ml-1">*</span>}
                                    <span className="text-text-secondary ml-2 text-xs">({variable.type})</span>
                                </label>
                                {variable.description && (
                                    <p className="text-xs text-text-secondary mb-2">{variable.description}</p>
                                )}
                                {renderInput(variable)}
                                {errors[variable.name] && (
                                    <p className="text-xs text-error mt-1">{errors[variable.name]}</p>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded bg-bg-2 text-text-secondary hover:bg-bg-3 hover:text-text-primary transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded bg-primary-default text-text-inverse hover:bg-primary-hover transition-colors"
                        >
                            Execute
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
