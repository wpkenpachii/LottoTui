
import React, { useState } from 'react';
import { GameMode, Draw } from '../types';

interface ImportViewProps {
  onBack: () => void;
  onImport: (mode: GameMode, draws: Draw[]) => void;
}

const ImportView: React.FC<ImportViewProps> = ({ onBack, onImport }) => {
  const [mode, setMode] = useState<GameMode>(GameMode.MEGASENA);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const draws: Draw[] = [];

      // Basic CSV parsing assumption: Concurso, Data, D1, D2, D3, D4, D5, D6...
      lines.slice(1).forEach((line, idx) => {
        const cols = line.split(/[;,]/).map(s => s.trim());
        if (cols.length < 8) return;

        const dezenas = cols.slice(2).filter(s => s !== '').map(Number);
        if (dezenas.some(isNaN)) return;

        draws.push({
          concurso: Number(cols[0]) || idx + 1,
          data: cols[1] || '01/01/2024',
          dezenas
        });
      });

      if (draws.length > 0) {
        onImport(mode, draws);
      } else {
        alert("Erro: Formato de CSV inválido ou arquivo vazio.");
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 py-10">
      <h2 className="text-2xl font-bold border-b border-emerald-500/30 pb-2">IMPORTAÇÃO DE BASE DE DADOS</h2>
      
      <div className="space-y-4">
        <label className="block text-zinc-400">SELECIONE A MODALIDADE:</label>
        <div className="flex space-x-4">
          <button 
            onClick={() => setMode(GameMode.MEGASENA)}
            className={`flex-1 py-4 border-2 ${mode === GameMode.MEGASENA ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800'}`}
          >
            MEGA-SENA
          </button>
          <button 
            onClick={() => setMode(GameMode.LOTOFACIL)}
            className={`flex-1 py-4 border-2 ${mode === GameMode.LOTOFACIL ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800'}`}
          >
            LOTOFÁCIL
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-zinc-400">CARREGAR ARQUIVO .CSV:</label>
        <div className="p-10 border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center space-y-4 hover:border-emerald-500 transition-colors">
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload}
            className="hidden" 
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="bg-emerald-500 text-zinc-950 px-8 py-3 font-bold cursor-pointer hover:bg-emerald-400">
            {isProcessing ? 'PROCESSANDO...' : 'PROCURAR ARQUIVO'}
          </label>
          <p className="text-xs text-zinc-500">FORMATO: Concurso; Data; D1; D2; D3; D4; D5; D6</p>
        </div>
      </div>

      <button onClick={onBack} className="text-zinc-500 hover:text-white transition-colors">
        [ VOLTAR AO MENU ]
      </button>
    </div>
  );
};

export default ImportView;
