import { X, Lightbulb, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { translations, Language } from '../i18n/queryBuilder';

interface GuidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
}

export default function GuidePanel({ isOpen, onClose, language }: GuidePanelProps) {
    const [activeTab, setActiveTab] = useState<'steps' | 'examples'>('steps');
    const t = translations[language];

    // Icons mapping for steps
    const stepIcons = ['🗄️', '📋', '🔍', '🧮', '📦', '↕️', '⚙️'];

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-bg-overlay/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-3xl max-h-[85vh] mx-4 bg-gradient-to-br from-bg-0 to-bg-1 rounded-md shadow-2xl border border-border-light flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-border-light bg-gradient-to-r from-bg-2 via-bg-1 to-bg-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-transparent rounded-lg">
                            <Lightbulb size={20} className="text-accent" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">
                                {t.guide.title}
                            </h2>
                            <p className="text-xs text-text-secondary mt-0.5">
                                {t.guide.subtitle}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-bg-2 rounded-xl transition-all text-text-secondary hover:text-text-primary"
                        title={t.close}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 px-6 py-3 border-b border-border-subtle bg-bg-1 glass">
                    <button
                        onClick={() => setActiveTab('steps')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'steps'
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-2'
                            }`}
                    >
                        {t.guide.tabs.steps}
                    </button>
                    <button
                        onClick={() => setActiveTab('examples')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'examples'
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-text-secondary hover:text-primary hover:bg-bg-2'
                            }`}
                    >
                        {t.guide.tabs.examples}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'steps' ? (
                        <div className="space-y-4">
                            {t.guide.steps.map((step, index) => (
                                <div
                                    key={index}
                                    className="p-4 bg-bg-1 rounded-lg border border-border hover:border-accent/50 transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl flex-shrink-0">{stepIcons[index]}</span>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-semibold text-text-primary mb-1">
                                                {step.title}
                                            </h3>
                                            <p className="text-sm text-text-secondary mb-2">
                                                {step.description}
                                            </p>
                                            <div className="px-3 py-2 bg-bg-0 rounded-md border border-border-light">
                                                <code className="text-xs text-accent font-mono">
                                                    {step.example}
                                                </code>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Tips Section */}
                            <div className="mt-6 p-4 bg-primary-transparent rounded-lg border border-accent">
                                <div className="flex items-start gap-2">
                                    <Lightbulb size={18} className="text-accent flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-semibold text-text-primary mb-2">
                                            {t.guide.proTips.title}
                                        </h4>
                                        <ul className="space-y-1.5 text-sm text-text-secondary">
                                            {t.guide.proTips.tips.map((tip, index) => (
                                                <li key={index} className="flex items-start gap-2">
                                                    <CheckCircle2 size={16} className="text-accent flex-shrink-0 mt-0.5" />
                                                    <span dangerouslySetInnerHTML={{ __html: tip }} />
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {t.guide.examples.map((example, index) => (
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
                                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-transparent text-accent text-xs font-bold flex-shrink-0 mt-0.5">
                                                    {stepIndex + 1}
                                                </span>
                                                <span className="text-text-primary">{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end px-6 py-4 border-t border-border-light bg-bg-1 glass">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gradient-to-r from-accent to-accent/90 text-white rounded-xl hover:shadow-lg hover:shadow-accent/25 transition-all font-semibold text-sm"
                    >
                        {t.guide.cta}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
