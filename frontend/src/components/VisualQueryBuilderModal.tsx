import { X, Sparkles, HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import VisualQueryBuilderEnhanced from './VisualQueryBuilderEnhanced';
import GuidePanel from './GuidePanel';
import LanguageSwitcher from './LanguageSwitcher';
import { translations, Language } from '../i18n/queryBuilder';

interface VisualQueryBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSqlChange: (sql: string) => void;
    initialState?: {
        schema?: string;
        table: string;
        columns: string[];
        filters: any[];
        sorts: any[];
        limit: number;
    };
}

export default function VisualQueryBuilderModal({
    isOpen,
    onClose,
    onSqlChange,
    initialState,
}: VisualQueryBuilderModalProps) {
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [language, setLanguage] = useState<Language>('en');
    const t = translations[language];

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                if (isGuideOpen) {
                    setIsGuideOpen(false);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, isGuideOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
                {/* Backdrop - Darker and more blurred */}
                <div
                    className="absolute inset-0 bg-black/80 backdrop-blur-lg"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative w-full max-w-7xl h-[92vh] mx-4 bg-bg-0 rounded-2xl shadow-2xl border border-border/50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                    {/* Header with gradient */}
                    <div className="relative flex items-center justify-between px-6 py-5 border-b border-border/50 bg-gradient-to-r from-accent/10 via-bg-1 to-accent/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-accent/10 rounded-lg">
                                <Sparkles size={20} className="text-accent" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                                    {t.title}
                                </h2>
                                <p className="text-xs text-text-secondary mt-0.5">
                                    {t.subtitle}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Language Switcher */}
                            <LanguageSwitcher
                                currentLanguage={language}
                                onLanguageChange={setLanguage}
                            />
                            <button
                                onClick={() => setIsGuideOpen(true)}
                                className="p-2.5 hover:bg-bg-2 rounded-xl transition-all text-text-secondary hover:text-accent flex items-center gap-2"
                                title={t.help}
                            >
                                <HelpCircle size={20} />
                                <span className="text-sm font-medium">{t.help}</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2.5 hover:bg-bg-2 rounded-xl transition-all text-text-secondary hover:text-text-primary hover:rotate-90 duration-200"
                                title={`${t.close} (Esc)`}
                            >
                                <X size={22} />
                            </button>
                        </div>
                    </div>

                    {/* Content with solid background */}
                    <div className="flex-1 overflow-hidden bg-bg-0">
                        <VisualQueryBuilderEnhanced
                            onSqlChange={onSqlChange}
                            initialState={initialState}
                            language={language}
                        />
                    </div>

                    {/* Footer with gradient */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-gradient-to-r from-bg-1 via-bg-0 to-bg-1">
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                            <span className="px-2 py-1 bg-bg-2 border border-border rounded-md font-mono">Esc</span>
                            <span>{t.shortcuts.escToClose}</span>
                            <span className="mx-2 text-border">•</span>
                            <span className="px-2 py-1 bg-bg-2 border border-border rounded-md font-mono">⌘ + Enter</span>
                            <span>{t.shortcuts.runQuery}</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-gradient-to-r from-accent to-accent/90 text-white rounded-xl hover:shadow-lg hover:shadow-accent/25 transition-all font-semibold text-sm hover:scale-105 active:scale-95"
                        >
                            {t.applyClose}
                        </button>
                    </div>
                </div>
            </div>

            {/* Guide Panel */}
            <GuidePanel isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} language={language} />
        </>
    );
}
