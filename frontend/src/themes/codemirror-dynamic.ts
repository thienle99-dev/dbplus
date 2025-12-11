import { EditorView } from '@codemirror/view';

// Define the base theme using CSS variables
// This allows the editor to adapt to ANY application theme defined in index.css
const dynamicTheme = EditorView.theme({
    "&": {
        backgroundColor: "var(--bg-0)",
        color: "var(--text-primary)",
    },
    ".cm-content": {
        caretColor: "var(--accent)",
        fontFamily: "var(--font-mono, monospace)",
    },
    "&.cm-focused .cm-cursor": {
        borderLeftColor: "var(--accent)"
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
        backgroundColor: "var(--accent-muted) !important",
    },
    ".cm-selectionMatch": {
        backgroundColor: "var(--accent-muted)",
        opacity: "0.5"
    },
    ".cm-gutters": {
        backgroundColor: "var(--bg-1)",
        color: "var(--text-secondary)",
        borderRight: "1px solid var(--border)",
    },
    ".cm-activeLineGutter": {
        backgroundColor: "var(--bg-2)",
        color: "var(--text-primary)",
    },
    ".cm-activeLine": {
        backgroundColor: "var(--bg-2)",
    },
    ".cm-lineNumbers .cm-gutterElement": {
        color: "var(--text-secondary)",
    },
}, { dark: false }); // We set dark: false to allow manual override, or we can toggle it

// Syntax highlighting mapping
// We use fallback colors that work reasonably well on both light and dark,
// OR we can use CSS variables for these too if we defined them.
// For now, let's stick to standard colors but ensure background is transparent so it picks up the container bg.

export const dynamicSettings = dynamicTheme;

// We can ideally create a syntax highlighter that also uses CSS variables,
// but for simplicity we will rely on the base theme's highlighting or OneDark/Light highlighting
// but OVERRIDE the container background.

/*
  Strategy:
  1. Use OneDark for Dark themes, but override background/gutter colors with CSS variables.
  2. Use Light for Light themes, but override background/gutter colors with CSS variables.
*/

export const transparentTheme = EditorView.theme({
    "&": {
        backgroundColor: "transparent !important",
        color: "var(--text-primary) !important",
    },
    ".cm-gutters": {
        backgroundColor: "transparent !important",
        color: "var(--text-secondary) !important",
        borderRight: "1px solid var(--border)",
    },
    ".cm-activeLine": {
        backgroundColor: "var(--bg-2) !important",
    },
    ".cm-activeLineGutter": {
        backgroundColor: "var(--bg-2) !important",
    }
});
