import { useEffect, useState, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { Search, X, ChevronUp, ChevronDown, Replace, ReplaceAll, CaseSensitive, Regex } from 'lucide-react';

interface SearchPanelProps {
    view: EditorView | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function SearchPanel({ view, isOpen, onClose }: SearchPanelProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [replaceTerm, setReplaceTerm] = useState('');
    const [showReplace, setShowReplace] = useState(false);
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [useRegex, setUseRegex] = useState(false);
    const [currentMatch, setCurrentMatch] = useState(0);
    const [totalMatches, setTotalMatches] = useState(0);

    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!view || !searchTerm) {
            setTotalMatches(0);
            setCurrentMatch(0);
            return;
        }

        // Count matches
        const text = view.state.doc.toString();
        let count = 0;

        try {
            if (useRegex) {
                const flags = caseSensitive ? 'g' : 'gi';
                const regex = new RegExp(searchTerm, flags);
                const matches = text.match(regex);
                count = matches ? matches.length : 0;
            } else {
                const searchText = caseSensitive ? searchTerm : searchTerm.toLowerCase();
                const docText = caseSensitive ? text : text.toLowerCase();
                let pos = 0;
                while ((pos = docText.indexOf(searchText, pos)) !== -1) {
                    count++;
                    pos += searchText.length;
                }
            }
        } catch (e) {
            // Invalid regex
            count = 0;
        }

        setTotalMatches(count);
        if (count > 0 && currentMatch === 0) {
            setCurrentMatch(1);
        } else if (count === 0) {
            setCurrentMatch(0);
        }
    }, [searchTerm, caseSensitive, useRegex, view]);

    const findNext = () => {
        if (!view || !searchTerm || totalMatches === 0) return;

        const text = view.state.doc.toString();
        const selection = view.state.selection.main;
        let startPos = selection.to;

        try {
            if (useRegex) {
                const flags = caseSensitive ? 'g' : 'gi';
                const regex = new RegExp(searchTerm, flags);
                regex.lastIndex = startPos;
                const match = regex.exec(text);

                if (match) {
                    view.dispatch({
                        selection: { anchor: match.index, head: match.index + match[0].length },
                        scrollIntoView: true
                    });
                    // Calculate which match this is
                    const beforeText = text.substring(0, match.index);
                    const beforeMatches = beforeText.match(new RegExp(searchTerm, flags));
                    setCurrentMatch((beforeMatches ? beforeMatches.length : 0) + 1);
                } else {
                    // Wrap to beginning
                    regex.lastIndex = 0;
                    const firstMatch = regex.exec(text);
                    if (firstMatch) {
                        view.dispatch({
                            selection: { anchor: firstMatch.index, head: firstMatch.index + firstMatch[0].length },
                            scrollIntoView: true
                        });
                        setCurrentMatch(1);
                    }
                }
            } else {
                const searchText = caseSensitive ? searchTerm : searchTerm.toLowerCase();
                const docText = caseSensitive ? text : text.toLowerCase();
                const pos = docText.indexOf(searchText, startPos);

                if (pos !== -1) {
                    view.dispatch({
                        selection: { anchor: pos, head: pos + searchTerm.length },
                        scrollIntoView: true
                    });
                    // Count matches before this position
                    let count = 1;
                    let p = 0;
                    while ((p = docText.indexOf(searchText, p)) !== -1 && p < pos) {
                        count++;
                        p += searchText.length;
                    }
                    setCurrentMatch(count);
                } else {
                    // Wrap to beginning
                    const firstPos = docText.indexOf(searchText);
                    if (firstPos !== -1) {
                        view.dispatch({
                            selection: { anchor: firstPos, head: firstPos + searchTerm.length },
                            scrollIntoView: true
                        });
                        setCurrentMatch(1);
                    }
                }
            }
        } catch (e) {
            // Invalid regex
        }
    };

    const findPrevious = () => {
        if (!view || !searchTerm || totalMatches === 0) return;

        const text = view.state.doc.toString();
        const selection = view.state.selection.main;
        let endPos = selection.from;

        try {
            if (useRegex) {
                const flags = caseSensitive ? 'g' : 'gi';
                const regex = new RegExp(searchTerm, flags);
                const matches: Array<{ index: number; length: number }> = [];
                let match;

                while ((match = regex.exec(text)) !== null) {
                    if (match.index < endPos) {
                        matches.push({ index: match.index, length: match[0].length });
                    }
                }

                if (matches.length > 0) {
                    const lastMatch = matches[matches.length - 1];
                    view.dispatch({
                        selection: { anchor: lastMatch.index, head: lastMatch.index + lastMatch.length },
                        scrollIntoView: true
                    });
                    setCurrentMatch(matches.length);
                } else {
                    // Wrap to end
                    const allMatches: Array<{ index: number; length: number }> = [];
                    regex.lastIndex = 0;
                    while ((match = regex.exec(text)) !== null) {
                        allMatches.push({ index: match.index, length: match[0].length });
                    }
                    if (allMatches.length > 0) {
                        const lastMatch = allMatches[allMatches.length - 1];
                        view.dispatch({
                            selection: { anchor: lastMatch.index, head: lastMatch.index + lastMatch.length },
                            scrollIntoView: true
                        });
                        setCurrentMatch(allMatches.length);
                    }
                }
            } else {
                const searchText = caseSensitive ? searchTerm : searchTerm.toLowerCase();
                const docText = caseSensitive ? text : text.toLowerCase();
                let lastPos = -1;
                let pos = 0;

                while ((pos = docText.indexOf(searchText, pos)) !== -1 && pos < endPos) {
                    lastPos = pos;
                    pos += searchText.length;
                }

                if (lastPos !== -1) {
                    view.dispatch({
                        selection: { anchor: lastPos, head: lastPos + searchTerm.length },
                        scrollIntoView: true
                    });
                    // Count matches before this position
                    let count = 1;
                    let p = 0;
                    while ((p = docText.indexOf(searchText, p)) !== -1 && p < lastPos) {
                        count++;
                        p += searchText.length;
                    }
                    setCurrentMatch(count);
                } else {
                    // Wrap to end - find last occurrence
                    pos = docText.lastIndexOf(searchText);
                    if (pos !== -1) {
                        view.dispatch({
                            selection: { anchor: pos, head: pos + searchTerm.length },
                            scrollIntoView: true
                        });
                        setCurrentMatch(totalMatches);
                    }
                }
            }
        } catch (e) {
            // Invalid regex
        }
    };

    const replaceNext = () => {
        if (!view || !searchTerm) return;

        const selection = view.state.selection.main;
        const selectedText = view.state.doc.sliceString(selection.from, selection.to);

        // Check if current selection matches search term
        const matches = useRegex
            ? new RegExp(searchTerm, caseSensitive ? '' : 'i').test(selectedText)
            : caseSensitive
                ? selectedText === searchTerm
                : selectedText.toLowerCase() === searchTerm.toLowerCase();

        if (matches) {
            view.dispatch({
                changes: { from: selection.from, to: selection.to, insert: replaceTerm }
            });
        }

        findNext();
    };

    const replaceAll = () => {
        if (!view || !searchTerm) return;

        const text = view.state.doc.toString();
        let newText = text;

        try {
            if (useRegex) {
                const flags = caseSensitive ? 'g' : 'gi';
                const regex = new RegExp(searchTerm, flags);
                newText = text.replace(regex, replaceTerm);
            } else {
                const searchText = searchTerm;
                if (caseSensitive) {
                    newText = text.split(searchText).join(replaceTerm);
                } else {
                    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    newText = text.replace(regex, replaceTerm);
                }
            }

            view.dispatch({
                changes: { from: 0, to: text.length, insert: newText }
            });

            setSearchTerm('');
            setReplaceTerm('');
            setTotalMatches(0);
            setCurrentMatch(0);
        } catch (e) {
            // Invalid regex
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                findPrevious();
            } else {
                findNext();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute top-0 right-0 z-50 bg-bg-1 border border-border rounded-lg shadow-lg m-2 p-3 min-w-[400px]">
            {/* Search Row */}
            <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search..."
                        className="w-full pl-9 pr-3 py-1.5 bg-bg-2 border border-border rounded text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                </div>

                <div className="flex items-center gap-1 text-xs text-text-secondary">
                    {totalMatches > 0 ? `${currentMatch}/${totalMatches}` : 'No results'}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={findPrevious}
                        disabled={totalMatches === 0}
                        className="p-1.5 hover:bg-bg-2 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Previous (Shift+Enter)"
                    >
                        <ChevronUp size={14} />
                    </button>
                    <button
                        onClick={findNext}
                        disabled={totalMatches === 0}
                        className="p-1.5 hover:bg-bg-2 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Next (Enter)"
                    >
                        <ChevronDown size={14} />
                    </button>
                </div>

                <div className="flex items-center gap-1 border-l border-border pl-2">
                    <button
                        onClick={() => setCaseSensitive(!caseSensitive)}
                        className={`p-1.5 rounded transition-colors ${caseSensitive ? 'bg-accent text-bg-0' : 'hover:bg-bg-2'}`}
                        title="Case Sensitive"
                    >
                        <CaseSensitive size={14} />
                    </button>
                    <button
                        onClick={() => setUseRegex(!useRegex)}
                        className={`p-1.5 rounded transition-colors ${useRegex ? 'bg-accent text-bg-0' : 'hover:bg-bg-2'}`}
                        title="Use Regular Expression"
                    >
                        <Regex size={14} />
                    </button>
                </div>

                <button
                    onClick={() => setShowReplace(!showReplace)}
                    className={`p-1.5 rounded transition-colors ${showReplace ? 'bg-accent text-bg-0' : 'hover:bg-bg-2'}`}
                    title="Toggle Replace"
                >
                    <Replace size={14} />
                </button>

                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-bg-2 rounded transition-colors"
                    title="Close (Esc)"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Replace Row */}
            {showReplace && (
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <Replace size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                        <input
                            type="text"
                            value={replaceTerm}
                            onChange={(e) => setReplaceTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Replace with..."
                            className="w-full pl-9 pr-3 py-1.5 bg-bg-2 border border-border rounded text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                    </div>

                    <button
                        onClick={replaceNext}
                        disabled={totalMatches === 0}
                        className="px-3 py-1.5 bg-bg-2 hover:bg-bg-3 border border-border rounded text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Replace Next"
                    >
                        Replace
                    </button>

                    <button
                        onClick={replaceAll}
                        disabled={totalMatches === 0}
                        className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-bg-0 rounded text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                        title="Replace All"
                    >
                        <ReplaceAll size={14} />
                        All
                    </button>
                </div>
            )}
        </div>
    );
}
