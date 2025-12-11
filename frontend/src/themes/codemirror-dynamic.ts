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

export const autocompleteTheme = EditorView.theme({
    ".cm-tooltip-autocomplete": {
        backgroundColor: "var(--bg-1) !important",
        border: "1px solid var(--border) !important",
        borderRadius: "8px !important",
        boxShadow: "var(--shadow-lg) !important",
        padding: "6px !important",
        maxWidth: "min(400px, 90vw) !important"
    },
    ".cm-tooltip-autocomplete > ul": {
        fontFamily: "var(--font-mono) !important",
        gap: "4px",
        maxHeight: "300px !important"
    },
    ".cm-tooltip-autocomplete > ul > li": {
        padding: "6px 10px !important",
        borderRadius: "6px !important",
        color: "var(--text-secondary) !important",
        display: "flex !important",
        alignItems: "center !important",
        gap: "8px !important",
        lineHeight: "1.4",
        minHeight: "24px" // Ensure touch target size/readability
    },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
        backgroundColor: "var(--bg-active) !important",
        color: "var(--text-primary) !important"
    },
    ".cm-tooltip-autocomplete > ul > li[aria-selected] .cm-completionDetail": {
        color: "var(--text-muted) !important"
    },
    ".cm-completionDetail": {
        marginLeft: "auto !important",
        color: "var(--text-muted) !important",
        fontSize: "0.85em",
        fontStyle: "italic",
        opacity: "0.7"
    },
    ".cm-completionIcon": {
        width: "18px !important", // Slightly larger for emojis
        height: "18px !important",
        opacity: "1 !important",
        padding: "0 !important",
        marginRight: "4px !important",
        background: "none !important", // clear default
        display: "flex !important",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        // Hide original text (the 't', 'k', etc.) to prevent duplicates
        color: "transparent !important",
        fontSize: "0 !important",
        lineHeight: "0 !important",
    },
    // Reset shape styles and restore visibility for emoji
    ".cm-completionIcon::before": {
        display: "block",
        width: "auto",
        height: "auto",
        borderRadius: "0",
        backgroundColor: "transparent",
        content: "' '",
        // Restore size for the emoji in pseudo-element
        fontSize: "14px !important",
        lineHeight: "1 !important",
        filter: "grayscale(0.2)", // Slight mute
        color: "var(--text-primary) !important" // Ensure visibility
    },

    // Database Types (Table, Schema)
    ".cm-completionIcon-class::before, .cm-completionIcon-type::before": { // Tables
        content: "'🗃️'" // File box for tables
    },
    ".cm-completionIcon-schema::before, .cm-completionIcon-namespace::before": { // Schemas
        content: "'📂'" // Folder for patterns/schemas
    },

    // Code Logic Types (Function, Keyword)
    ".cm-completionIcon-function::before, .cm-completionIcon-method::before": {
        content: "'⚡'" // Bolt for functions/actions
    },
    ".cm-completionIcon-keyword::before": {
        content: "'🔑'" // Key for keywords
    },

    // Data Types (Columns, Variables)
    ".cm-completionIcon-variable::before, .cm-completionIcon-property::before": {
        content: "'🏷️'" // Tag for columns/fields
    },
});
