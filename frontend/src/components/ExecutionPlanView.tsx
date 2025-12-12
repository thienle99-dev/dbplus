import ReactJson from 'react-json-view';
import { useSettingsStore } from '../store/settingsStore';

interface ExecutionPlanViewProps {
    plan: any;
    loading?: boolean;
    error?: string | null;
}

export default function ExecutionPlanView({ plan, loading, error }: ExecutionPlanViewProps) {
    const { theme } = useSettingsStore();

    const isDark = theme === 'dark';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-text-secondary">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mr-2"></div>
                Generating execution plan...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-error">
                <h3 className="font-bold mb-2">Error generating plan</h3>
                <pre className="whitespace-pre-wrap font-mono text-sm bg-bg-2 p-2 rounded">
                    {error}
                </pre>
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="flex items-center justify-center h-full text-text-secondary">
                No execution plan available. Run "Explain" to see the plan.
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto p-4 bg-bg-1">
            <div className="text-sm font-mono">
                {/* If plan is simple text/string, display as pre */}
                {typeof plan === 'string' ? (
                    <pre className="whitespace-pre-wrap">{plan}</pre>
                ) : (
                    /* Use ReactJson for structured JSON plans (Postgres) */
                    <ReactJson
                        src={plan}
                        theme={isDark ? 'monokai' : 'rjv-default'}
                        style={{ backgroundColor: 'transparent' }}
                        name={false}
                        displayDataTypes={false}
                        enableClipboard={true}
                        collapsed={2}
                    />
                )}
            </div>
        </div>
    );
}
