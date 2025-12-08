import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// Light theme with high contrast for better readability
export const lightTheme = EditorView.theme({
    '&': {
        color: '#111827', // Dark gray text
        backgroundColor: '#ffffff',
    },
    '.cm-content': {
        caretColor: '#EC4899', // Pink caret
    },
    '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: '#EC4899',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: '#FCE7F3', // Light pink selection
        color: '#111827 !important', // Dark text - ensure visibility
    },
    '.cm-selectionLayer .cm-selectionBackground': {
        backgroundColor: '#FCE7F3 !important',
    },
    '.cm-line ::selection': {
        backgroundColor: '#FCE7F3',
        color: '#111827',
    },
    '.cm-line.cm-activeLine ::selection': {
        backgroundColor: '#F9A8D4', // Darker pink for active line
        color: '#111827',
    },
    '.cm-panels': {
        backgroundColor: '#F9FAFB',
        color: '#111827',
    },
    '.cm-panels.cm-panels-top': {
        borderBottom: '1px solid #E5E7EB',
    },
    '.cm-panels.cm-panels-bottom': {
        borderTop: '1px solid #E5E7EB',
    },
    '.cm-searchMatch': {
        backgroundColor: '#FEF3C7',
        outline: '1px solid #F59E0B',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: '#FDE68A',
    },
    '.cm-activeLine': {
        backgroundColor: '#F9FAFB',
    },
    '.cm-selectionMatch': {
        backgroundColor: '#E0F2FE',
    },
    '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
        backgroundColor: '#FEF3C7',
    },
    '.cm-gutters': {
        backgroundColor: '#F9FAFB',
        color: '#9CA3AF',
        border: 'none',
    },
    '.cm-activeLineGutter': {
        backgroundColor: '#F3F4F6',
    },
    '.cm-foldPlaceholder': {
        backgroundColor: 'transparent',
        border: 'none',
        color: '#9CA3AF',
    },
    '.cm-tooltip': {
        border: '1px solid #E5E7EB',
        backgroundColor: '#ffffff',
    },
    '.cm-tooltip .cm-tooltip-arrow:before': {
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
    },
    '.cm-tooltip .cm-tooltip-arrow:after': {
        borderTopColor: '#ffffff',
        borderBottomColor: '#ffffff',
    },
    '.cm-tooltip-autocomplete': {
        '& > ul > li[aria-selected]': {
            backgroundColor: '#F3F4F6',
            color: '#111827',
        },
    },
}, { dark: false });

// High contrast syntax highlighting for light mode
export const lightHighlightStyle = HighlightStyle.define([
    { tag: t.keyword, color: '#9333EA', fontWeight: 'bold' }, // Purple 600 - HIGH CONTRAST
    { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#1F2937' }, // Gray 800
    { tag: [t.function(t.variableName), t.labelName], color: '#0891B2' }, // Cyan 600
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#0891B2' }, // Cyan 600
    { tag: [t.definition(t.name), t.separator], color: '#1F2937' }, // Gray 800
    { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#DC2626' }, // Red 600
    { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#DB2777' }, // Pink 600
    { tag: [t.meta, t.comment], color: '#6B7280', fontStyle: 'italic' }, // Gray 500 - muted
    { tag: t.strong, fontWeight: 'bold' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through' },
    { tag: t.link, color: '#2563EB', textDecoration: 'underline' }, // Blue 600
    { tag: t.heading, fontWeight: 'bold', color: '#111827' }, // Gray 900
    { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#DC2626' }, // Red 600
    { tag: [t.processingInstruction, t.string, t.inserted], color: '#059669' }, // Green 600 - HIGH CONTRAST
    { tag: t.invalid, color: '#DC2626' }, // Red 600
]);

export const light: Extension = [lightTheme, syntaxHighlighting(lightHighlightStyle)];
