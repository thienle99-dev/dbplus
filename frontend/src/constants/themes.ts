import { Theme } from '../store/settingsStore';

export interface ThemeConfig {
    value: Theme;
    label: string;
    emoji?: string;
    category: 'standard' | 'premium' | 'retro' | 'anime';
    description?: string;
}

export const THEME_CONFIGS: Record<Theme, ThemeConfig> = {
    // Standard Themes
    dark: {
        value: 'dark',
        label: 'Dark',
        category: 'standard',
        description: 'Default dark theme',
    },
    light: {
        value: 'light',
        label: 'Light',
        category: 'standard',
        description: 'Clean light theme',
    },
    solar: {
        value: 'solar',
        label: 'Solarized',
        category: 'standard',
        description: 'Eye-friendly solarized theme',
    },
    midnight: {
        value: 'midnight',
        label: 'Midnight',
        category: 'standard',
        description: 'Deep blue midnight theme',
    },
    system: {
        value: 'system',
        label: 'System',
        category: 'standard',
        description: 'Follow system preference',
    },

    // Premium Themes
    'soft-pink': {
        value: 'soft-pink',
        label: 'Soft Pink Premium',
        emoji: '💖',
        category: 'premium',
        description: 'Elegant soft pink with premium dark UI',
    },

    // Retro Themes
    'gruvbox-dark': {
        value: 'gruvbox-dark',
        label: 'Gruvbox Dark',
        emoji: '🍂',
        category: 'retro',
        description: 'Warm retro terminal theme',
    },
    'gruvbox-light': {
        value: 'gruvbox-light',
        label: 'Gruvbox Light',
        emoji: '☀️',
        category: 'retro',
        description: 'Warm retro light theme',
    },

    // Anime/Wibu Themes
    'wibu-pink': {
        value: 'wibu-pink',
        label: 'Wibu Pink',
        emoji: '💖',
        category: 'anime',
        description: 'Kawaii magical girl theme',
    },
    'wibu-sakura': {
        value: 'wibu-sakura',
        label: 'Wibu Sakura',
        emoji: '🌸',
        category: 'anime',
        description: 'Cherry blossom spring theme',
    },
    'wibu-ocean': {
        value: 'wibu-ocean',
        label: 'Wibu Ocean',
        emoji: '🌊',
        category: 'anime',
        description: 'Deep sea blue anime theme',
    },
    'wibu-sunset': {
        value: 'wibu-sunset',
        label: 'Wibu Sunset',
        emoji: '🌅',
        category: 'anime',
        description: 'Warm orange-pink gradient theme',
    },
    'wibu-neon': {
        value: 'wibu-neon',
        label: 'Wibu Neon',
        emoji: '⚡',
        category: 'anime',
        description: 'Cyberpunk vaporwave theme',
    },

    // macOS Xcode Themes
    'macos-dark': {
        value: 'macos-dark',
        label: 'macOS Dark',
        emoji: '🍎',
        category: 'standard',
        description: 'Xcode dark theme inspired',
    },
    'macos-light': {
        value: 'macos-light',
        label: 'macOS Light',
        emoji: '☀️',
        category: 'standard',
        description: 'Xcode light theme inspired',
    },
    dbplus: {
        value: 'dbplus',
        label: 'DBPlus Style',
        emoji: '💎',
        category: 'premium',
        description: 'Luxury deep dark theme with glassmorphism',
    },
};

// Helper to get theme display name with emoji
export const getThemeDisplayName = (theme: Theme): string => {
    const config = THEME_CONFIGS[theme];
    return config.emoji ? `${config.label} ${config.emoji}` : config.label;
};

// Get all themes by category
export const getThemesByCategory = (category: ThemeConfig['category']): ThemeConfig[] => {
    return Object.values(THEME_CONFIGS).filter((config) => config.category === category);
};

// Get all theme values
export const ALL_THEMES = Object.keys(THEME_CONFIGS) as Theme[];

// Theme class names for CSS
export const THEME_CLASS_NAMES: Record<Theme, string> = {
    dark: 'theme-dark',
    light: 'theme-light',
    solar: 'theme-solar',
    midnight: 'theme-midnight',
    'soft-pink': 'theme-soft-pink',
    'gruvbox-dark': 'theme-gruvbox-dark',
    'gruvbox-light': 'theme-gruvbox-light',
    'wibu-pink': 'theme-wibu-pink',
    'wibu-sakura': 'theme-wibu-sakura',
    'wibu-ocean': 'theme-wibu-ocean',
    'wibu-sunset': 'theme-wibu-sunset',
    'wibu-neon': 'theme-wibu-neon',
    'macos-dark': 'theme-macos-dark',
    'macos-light': 'theme-macos-light',
    dbplus: 'theme-dbplus',
    system: '', // System doesn't have a direct class
};

// Get CSS class name for theme
export const getThemeClassName = (theme: Theme): string => {
    return THEME_CLASS_NAMES[theme];
};

// Get all theme class names (for cleanup)
export const ALL_THEME_CLASS_NAMES = Object.values(THEME_CLASS_NAMES).filter(Boolean);
