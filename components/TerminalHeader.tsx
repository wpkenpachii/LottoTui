
import React from 'react';

const TerminalHeader: React.FC = () => {
  return (
    <div className="bg-zinc-800 px-4 py-2 flex items-center justify-between border-b border-zinc-700">
      <div className="flex space-x-2">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
      </div>
      <div className="text-zinc-400 text-sm font-bold tracking-widest">
        LOTTO-TUI TERMINAL :: INTERACTIVE GUI
      </div>
      <div className="w-12"></div>
    </div>
  );
};

export default TerminalHeader;
