import React, { useState, useEffect } from 'react';

export interface CommandItem {
  id: string;
  icon: string;
  title: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  commands
}) => {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-20 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center gap-3">
          <svg className="w-5 h-5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="O que você deseja fazer? (Ex: Build, Test, Agente...)"
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="p-2 overflow-y-auto custom-scrollbar flex-1 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium">
              Nenhum comando encontrado para "{search}".
            </div>
          ) : (
            filteredCommands.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                className="w-full text-left p-3 rounded-2xl hover:bg-indigo-950/50 hover:border-indigo-800/50 border border-transparent flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl p-2 rounded-xl bg-slate-800 group-hover:bg-indigo-900/60 transition-colors">
                    {cmd.icon}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-indigo-200 transition-colors">
                      {cmd.title}
                    </div>
                    <div className="text-[10px] font-mono uppercase text-slate-400">
                      {cmd.category}
                    </div>
                  </div>
                </div>

                {cmd.shortcut && (
                  <kbd className="text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 text-center text-[10px] text-slate-500 font-mono">
          Navegue com o teclado ou clique para executar acoes instantaneas.
        </div>
      </div>
    </div>
  );
};
