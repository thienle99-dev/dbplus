import { X, Lightbulb, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface GuidePanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const GUIDE_STEPS = [
    {
        title: '1. Select Your Data Source',
        description: 'Start by choosing a schema and table from the dropdown menus at the top.',
        example: 'Schema: public → Table: products',
        icon: '🗄️',
    },
    {
        title: '2. Choose Columns',
        description: 'Select which columns you want to see in your results. Click "All (*)" to select everything.',
        example: 'Select: name, price, category',
        icon: '📋',
    },
    {
        title: '3. Add Filters (Optional)',
        description: 'Filter your data using WHERE conditions. Click "+ Add" to add multiple filters.',
        example: 'price > 100 AND category = "Electronics"',
        icon: '🔍',
    },
    {
        title: '4. Calculate Values (Optional)',
        description: 'Use aggregate functions to calculate totals, averages, counts, etc.',
        example: 'COUNT(id) as total_products, AVG(price) as avg_price',
        icon: '🧮',
    },
    {
        title: '5. Group Data (Optional)',
        description: 'Group rows by columns to see aggregated results.',
        example: 'Group by: category',
        icon: '📦',
    },
    {
        title: '6. Sort Results (Optional)',
        description: 'Order your results by one or more columns.',
        example: 'Sort by: price (descending)',
        icon: '↕️',
    },
    {
        title: '7. Set Limits',
        description: 'Control how many rows to display and skip.',
        example: 'Limit: 100, Offset: 0',
        icon: '⚙️',
    },
];

const COMMON_EXAMPLES = [
    {
        title: 'Find Expensive Products',
        description: 'Get all products over $100',
        steps: [
            'Select table: products',
            'Add filter: price > 100',
            'Sort by: price (descending)',
        ],
    },
    {
        title: 'Count by Category',
        description: 'See how many products in each category',
        steps: [
            'Select table: products',
            'Add calculation: COUNT(*) as total',
            'Group by: category',
            'Sort by: total (descending)',
        ],
    },
    {
        title: 'Average Price Analysis',
        description: 'Calculate average price per category',
        steps: [
            'Select table: products',
            'Select columns: category',
            'Add calculation: AVG(price) as avg_price',
            'Group by: category',
            'Add HAVING filter: avg_price > 50',
        ],
    },
];

export default function GuidePanel({ isOpen, onClose }: GuidePanelProps) {
    const [activeTab, setActiveTab] = useState<'steps' | 'examples'>('steps');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-3xl max-h-[85vh] mx-4 bg-gradient-to-br from-bg-0 to-bg-1 rounded-2xl shadow-2xl border border-border/50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-gradient-to-r from-accent/10 via-bg-1 to-accent/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent/10 rounded-lg">
                            <Lightbulb size={20} className="text-accent" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">
                                Quick Start Guide
                            </h2>
                            <p className="text-xs text-text-secondary mt-0.5">
                                Learn how to build queries visually
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-bg-2 rounded-xl transition-all text-text-secondary hover:text-text-primary"
                        title="Close"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 px-6 py-3 border-b border-border/30 bg-bg-1/50">
                    <button
                        onClick={() => setActiveTab('steps')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'steps'
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-2'
                            }`}
                    >
                        Step-by-Step Guide
                    </button>
                    <button
                        onClick={() => setActiveTab('examples')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'examples'
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-text-secondary hover:text-primary hover:bg-bg-2'
                            }`}
                    >
                        Common Examples
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'steps' ? (
                        <div className="space-y-4">
                            {GUIDE_STEPS.map((step, index) => (
                                <div
                                    key={index}
                                    className="p-4 bg-bg-1 rounded-lg border border-border hover:border-accent/50 transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl flex-shrink-0">{step.icon}</span>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-semibold text-text-primary mb-1">
                                                {step.title}
                                            </h3>
                                            <p className="text-sm text-text-secondary mb-2">
                                                {step.description}
                                            </p>
                                            <div className="px-3 py-2 bg-bg-0 rounded-md border border-border/50">
                                                <code className="text-xs text-accent font-mono">
                                                    {step.example}
                                                </code>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Tips Section */}
                            <div className="mt-6 p-4 bg-accent/10 rounded-lg border border-accent/30">
                                <div className="flex items-start gap-2">
                                    <Lightbulb size={18} className="text-accent flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-semibold text-text-primary mb-2">
                                            💡 Pro Tips
                                        </h4>
                                        <ul className="space-y-1.5 text-sm text-text-secondary">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 size={16} className="text-accent flex-shrink-0 mt-0.5" />
                                                <span>Hover over <strong>?</strong> icons for detailed explanations</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 size={16} className="text-accent flex-shrink-0 mt-0.5" />
                                                <span>SQL is generated automatically as you build</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 size={16} className="text-accent flex-shrink-0 mt-0.5" />
                                                <span>Use GROUP BY with aggregate functions for summaries</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle2 size={16} className="text-accent flex-shrink-0 mt-0.5" />
                                                <span>HAVING filters work on grouped data, WHERE filters on rows</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {COMMON_EXAMPLES.map((example, index) => (
                                <div
                                    key={index}
                                    className="p-4 bg-bg-1 rounded-lg border border-border hover:border-accent/50 transition-colors"
                                >
                                    <h3 className="text-base font-semibold text-text-primary mb-1">
                                        {example.title}
                                    </h3>
                                    <p className="text-sm text-text-secondary mb-3">
                                        {example.description}
                                    </p>
                                    <div className="space-y-2">
                                        {example.steps.map((step, stepIndex) => (
                                            <div
                                                key={stepIndex}
                                                className="flex items-start gap-2 text-sm"
                                            >
                                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/20 text-accent text-xs font-bold flex-shrink-0 mt-0.5">
                                                    {stepIndex + 1}
                                                </span>
                                                <span className="text-text-primary">{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Additional Help */}
                            <div className="mt-6 p-4 bg-bg-1 rounded-lg border border-border">
                                <h4 className="text-sm font-semibold text-text-primary mb-2">
                                    Need More Help?
                                </h4>
                                <p className="text-sm text-text-secondary">
                                    Each section in the builder has a <strong>?</strong> icon with detailed
                                    explanations. Click on them to learn more about specific features.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end px-6 py-4 border-t border-border/50 bg-bg-1/50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gradient-to-r from-accent to-accent/90 text-white rounded-xl hover:shadow-lg hover:shadow-accent/25 transition-all font-semibold text-sm"
                    >
                        Got it, thanks!
                    </button>
                </div>
            </div>
        </div>
    );
}
