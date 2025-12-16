import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, Table, Eye, Code, FileCode, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch } from '../hooks/useDatabase';
import { useSettingsStore } from '../store/settingsStore';
import ObjectDefinitionModal from './ObjectDefinitionModal';
import { useTabContext } from '../context/TabContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string | undefined;
}

export default function CommandPalette({ isOpen, onClose, connectionId }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: results = [] } = useGlobalSearch(connectionId, query);
  
  // Definition Modal state
  const [defModal, setDefModal] = useState<{ open: boolean; name: string; schema: string; type: 'view' | 'function' }>({ 
      open: false, name: '', schema: '', type: 'view' 
  });

  // Tab Context
   let tabContext: any;
   try { tabContext = useTabContext(); } catch { tabContext = null; }


  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
      setSelectedIndex(0);
  }, [results]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
        onClose();
    }
  };
  
  // Scroll selected into view
  useEffect(() => {
      if (listRef.current && results.length > 0) {
          const el = listRef.current.children[selectedIndex] as HTMLElement;
          if (el) {
              el.scrollIntoView({ block: 'nearest' });
          }
      }
  }, [selectedIndex, results]);

  const handleSelect = (item: any) => {
      // If View or Function -> Open Definition Modal
      if (item.type === 'VIEW' || item.type === 'FUNCTION' || item.type === 'TRIGGER') {
          setDefModal({
              open: true,
              name: item.name,
              schema: item.schema,
              type: item.type === 'FUNCTION' ? 'function' : 'view' // Trigger viewed as view for now or function?
          });
          // Do NOT close palette immediately? Or close it?
          // Close palette so modal is visible.
          // Yet keep palette state? No, standard is close palette.
          // But wait, if I close palette, this component unmounts? 
          // If CommandPalette is conditionally rendered in parent, yes.
          // So I cannot host the modal INSIDE CommandPalette if CommandPalette closes.
          // I must render Modal OUTSIDE.
          // OR, CommandPalette stays open but hidden?
          // Actually, standard Quick Open closes upon selection.
          // If I persist the modal logic here, I must Delay closing?
          // NO, I must lift state up OR use a separate mechanism.
          
          // Workaround: Don't close CommandPalette, just hide it? 
          // Or simpler: Navigate to a "Definition View" route? No route for that yet.
          
          // Let's rely on parent providing a way to open def modal?
          // Or: Dispatch a custom event?
          // Or: Layout handles it.
          
          // For now: I will assume CommandPalette is NOT unmounted but just hidden with CSS?
          // No, usually unmounted.
          
          // Solution: I will close logic, but for Views/Functions, I simply cannot implement it purely here if it unmounts.
          // HOWEVER, if I use `navigate` to a query tab which shows definition?
          // Feature 1 was "Object Definition Viewers".
          // Feature 2 is "Quick Open".
          
          // Let's implement Table open first.
          // For Views/Funcs, I will emit a Toast for now saying "Opening definitions via Quick Open pending global modal refactor" 
          // OR I fix the architecture.
          
          // Proper fix: Move `defModal` state to `Layout` or `Workspace`.
          // I'll emit a custom event "dbplus:open-definition" and listen in Layout.
          
           window.dispatchEvent(new CustomEvent('dbplus:open-definition', {
              detail: { schema: item.schema, name: item.name, type: item.type.toLowerCase() }
           }));
           onClose();
           
      } else {
          // TABLE
          if (connectionId) {
             if (tabContext) {
                 tabContext.openTableInTab(item.schema, item.name, true);
             } else {
                 navigate(`/workspace/${connectionId}/query`, {
                    state: { openTable: { schema: item.schema, table: item.name } }
                 });
             }
          }
          onClose();
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
       <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
       
       <div className="relative w-full max-w-xl bg-bg-1 rounded-lg shadow-2xl border border-border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center px-4 py-3 border-b border-border gap-3">
             <Search size={18} className="text-text-secondary" />
             <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search tables, views, functions..."
                className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-secondary"
             />
             <div className="flex gap-1">
                 <kbd className="px-1.5 py-0.5 bg-bg-3 rounded text-[10px] text-text-secondary">ESC</kbd>
             </div>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto p-2" ref={listRef}>
             {results.length === 0 ? (
                 <div className="py-8 text-center text-text-secondary text-sm">
                     {query ? 'No results found' : 'Type to search...'}
                 </div>
             ) : (
                 results.map((item: any, index: number) => {
                     const isSelected = index === selectedIndex;
                     let Icon = Table;
                     let iconColor = "text-blue-400";
                     if (item.type === 'VIEW') { Icon = Eye; iconColor = "text-purple-400"; }
                     if (item.type === 'FUNCTION') { Icon = FileCode; iconColor = "text-orange-400"; }
                     if (item.type === 'TRIGGER') { Icon = Code; iconColor = "text-yellow-400"; }

                     return (
                         <div
                            key={`${item.schema}.${item.name}.${item.type}`}
                            className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm ${isSelected ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-bg-2'}`}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(index)}
                         >
                            <Icon size={16} className={iconColor} />
                            <div className="flex-1 flex flex-col">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-xs opacity-60 flex items-center gap-1">
                                   {item.schema} <span className="w-1 h-1 rounded-full bg-current opacity-40"/> {item.type}
                                </span>
                            </div>
                            {isSelected && <ArrowRight size={14} className="opacity-50" />}
                         </div>
                     );
                 })
             )}
          </div>
       </div>
    </div>
  );
}
