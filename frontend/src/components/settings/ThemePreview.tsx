import { Theme } from '../../store/settingsStore';
import { getThemeClassName } from '../../constants/themes';

interface ThemePreviewProps {
    theme: Theme;
    active?: boolean;
}

export default function ThemePreview({ theme }: ThemePreviewProps) {
    const themeClass = getThemeClassName(theme);

    // If active, we might want to highlight the border, but the preview itself
    // should just show the theme's potential.
    // We wrap the preview in the theme class to scope CSS variables.

    return (
        <div className={`w-full aspect-video rounded-md overflow-hidden border border-border flex shadow-sm ${themeClass}`}>
            {/* Sidebar (bg-1) */}
            <div className="w-1/4 h-full bg-bg-1 border-r border-border flex flex-col p-1.5 gap-1.5">
                <div className="w-full h-2 rounded bg-bg-3/50" />
                <div className="w-3/4 h-1.5 rounded bg-bg-3/30" />
                <div className="w-1/2 h-1.5 rounded bg-bg-3/30" />

                <div className="mt-auto w-full h-1.5 rounded bg-bg-3/30" />
            </div>

            {/* Main Content (bg-0) */}
            <div className="flex-1 h-full bg-bg-0 flex flex-col">
                {/* Header (border-b) */}
                <div className="h-6 border-b border-border flex items-center px-2 gap-2">
                    <div className="w-16 h-1.5 rounded bg-bg-3/30" />
                    <div className="flex-1" />
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                </div>

                {/* Content Area */}
                <div className="p-2 gap-2 flex flex-col">
                    <div className="flex gap-2">
                        <div className="w-1/3 h-12 rounded bg-bg-2 border border-border" />
                        <div className="w-1/3 h-12 rounded bg-bg-1 border border-border" />
                        <div className="w-1/3 h-12 rounded bg-bg-1 border border-border" />
                    </div>
                    <div className="w-full h-8 rounded bg-bg-1 border border-border flex items-center px-2">
                        <div className="w-1/2 h-1.5 rounded bg-text-secondary/20" />
                    </div>

                    <div className="mt-1 flex gap-1">
                        <div className="px-1.5 py-0.5 rounded-sm bg-accent/10 text-accent text-[6px]">Tags</div>
                        <div className="px-1.5 py-0.5 rounded-sm bg-bg-3/30 text-text-secondary text-[6px]">Tags</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
