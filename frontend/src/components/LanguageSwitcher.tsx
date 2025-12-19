import { Globe } from 'lucide-react';
import { Language } from '../i18n/queryBuilder';

interface LanguageSwitcherProps {
    currentLanguage: Language;
    onLanguageChange: (lang: Language) => void;
}

const languages = [
    { code: 'en' as Language, label: 'English', flag: '🇬🇧' },
    { code: 'vi' as Language, label: 'Tiếng Việt', flag: '🇻🇳' },
];

export default function LanguageSwitcher({ currentLanguage, onLanguageChange }: LanguageSwitcherProps) {
    return (
        <div className="relative group">
            <button
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-2 border border-border-light hover:border-accent transition-all text-sm"
                title="Change Language"
            >
                <Globe size={16} className="text-text-secondary" />
                <span className="text-text-primary font-medium">
                    {languages.find(l => l.code === currentLanguage)?.flag}
                </span>
            </button>

            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-bg-1 border border-border-light rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => onLanguageChange(lang.code)}
                        className={`
              w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
              ${currentLanguage === lang.code
                                ? 'bg-primary-transparent text-accent font-medium'
                                : 'text-text-primary hover:bg-bg-2'
                            }
              ${lang.code === 'en' ? 'rounded-t-lg' : ''}
              ${lang.code === 'vi' ? 'rounded-b-lg' : ''}
            `}
                    >
                        <span className="text-xl">{lang.flag}</span>
                        <span className="flex-1 text-left">{lang.label}</span>
                        {currentLanguage === lang.code && (
                            <span className="text-accent">✓</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
