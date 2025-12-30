
import React, { useState, useEffect } from 'react';

interface MainMenuProps {
  onSelectImport: () => void;
  onSelectStats: () => void;
  onSelectGenerator: () => void;
  hasData: boolean;
}

const MainMenu: React.FC<MainMenuProps> = ({ onSelectImport, onSelectStats, onSelectGenerator, hasData }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const options = [
    { label: '1. IMPORTAR CSV (MEGASENA/LOTOFÁCIL)', action: onSelectImport },
    { label: '2. MOSTRAR ESTATÍSTICAS', action: onSelectStats, disabled: !hasData },
    { label: '3. GERAR JOGOS', action: onSelectGenerator, disabled: !hasData },
    { label: '4. SAIR', action: () => window.close() },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') setSelectedIndex(s => (s + 1) % options.length);
      if (e.key === 'ArrowUp') setSelectedIndex(s => (s - 1 + options.length) % options.length);
      if (e.key === 'Enter') options[selectedIndex].action();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, options]);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <pre className="text-emerald-500 mb-8 text-[0.6rem] md:text-xs leading-none">
{`
 ██╗      ██████╗ ████████╗████████╗ ██████╗ ████████╗██╗   ██╗██╗
 ██║     ██╔═══██╗╚══██╔══╝╚══██╔══╝██╔═══██╗╚══██╔══╝██║   ██║██║
 ██║     ██║   ██║   ██║      ██║   ██║   ██║   ██║   ██║   ██║██║
 ██║     ██║   ██║   ██║      ██║   ██║   ██║   ██║   ██║   ██║██║
 ███████╗╚██████╔╝   ██║      ██║   ╚██████╔╝   ██║   ╚██████╔╝██║
 ╚══════╝ ╚═════╝    ╚═╝      ╚═╝    ╚═════╝    ╚═╝    ╚═════╝ ╚═╝
`}
      </pre>
      
      <div className="w-full max-w-md space-y-4">
        {options.map((opt, idx) => (
          <button
            key={idx}
            onClick={opt.action}
            disabled={opt.disabled}
            className={`w-full text-left px-6 py-3 border-2 transition-all ${
              idx === selectedIndex 
                ? 'bg-emerald-500 text-zinc-950 border-emerald-400 font-bold scale-105' 
                : 'bg-transparent text-emerald-500 border-zinc-800'
            } ${opt.disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            {idx === selectedIndex ? '> ' : '  '} {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-12 text-zinc-500 animate-pulse text-sm">
        Use as setas [↑][↓] para navegar e [ENTER] para selecionar.
      </div>
    </div>
  );
};

export default MainMenu;
