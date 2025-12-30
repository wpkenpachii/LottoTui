
import React from 'react';
import { Statistics, GameMode } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface StatsViewProps {
  stats: Statistics;
  mode: GameMode;
  onBack: () => void;
  onGenerateReport: () => void;
  isGeneratingReport: boolean;
}

const StatsView: React.FC<StatsViewProps> = ({ stats, mode, onBack, onGenerateReport, isGeneratingReport }) => {
  // Prep data for Even/Odd histogram
  const evenOddCounts = stats.evenOdd.reduce((acc, curr) => {
    const key = `${curr.even}P-${curr.odd}I`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const evenOddData = Object.entries(evenOddCounts).map(([name, value]) => ({ name, value }));

  // Prep data for Primes
  const primeCounts = stats.primes.reduce((acc, curr) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  const primeData = Object.entries(primeCounts).map(([name, value]) => ({ name: `${name} Primos`, value }));

  // Prep data for Sums Line Chart (last 50 draws)
  const sumLineData = stats.sums.slice(-50).map((val, idx) => ({ name: idx + 1, sum: val }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-700 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-emerald-500">ESTATÍSTICAS: {mode}</h2>
          <p className="text-xs text-zinc-500">Última atualização: {stats.lastUpdate} | Total: {stats.count} sorteios</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
           <button 
            onClick={onGenerateReport}
            disabled={isGeneratingReport}
            className="flex-1 md:flex-none bg-emerald-500 text-zinc-950 px-4 py-2 text-sm font-bold hover:bg-emerald-400 disabled:opacity-50 transition-colors"
          >
            {isGeneratingReport ? 'GERANDO PDF...' : 'EXPORTAR RELATÓRIO PDF (IA)'}
          </button>
          <button onClick={onBack} className="flex-1 md:flex-none border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800 transition-colors">
            VOLTAR
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Even/Odd Histogram */}
        <div id="even-odd-section" className="bg-zinc-950 p-6 rounded border border-zinc-800">
          <h3 className="text-sm font-bold mb-4 uppercase text-zinc-400">Distribuição Pares x Ímpares</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evenOddData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} />
                <YAxis stroke="#52525b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#10b981' }} />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Primes Histogram */}
        <div id="primes-section" className="bg-zinc-950 p-6 rounded border border-zinc-800">
          <h3 className="text-sm font-bold mb-4 uppercase text-zinc-400">Quantidade de Primos por Sorteio</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={primeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} />
                <YAxis stroke="#52525b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sums Line Chart */}
      <div id="sums-line-section" className="bg-zinc-950 p-6 rounded border border-zinc-800">
        <h3 className="text-sm font-bold mb-4 uppercase text-zinc-400">Evolução da Soma (Últimos 50 Sorteios)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sumLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" stroke="#52525b" fontSize={10} />
              <YAxis stroke="#52525b" fontSize={10} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
              <Line type="monotone" dataKey="sum" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lateness Dashboard */}
      <div id="lateness-section" className="bg-zinc-950 p-6 rounded border border-zinc-800">
        <h3 className="text-sm font-bold mb-4 uppercase text-zinc-400">Números em Atraso (Top 20)</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(stats.lateness) as [string, number][])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([num, delay]) => (
              <div key={num} className="flex flex-col items-center bg-zinc-900 border border-zinc-800 px-3 py-2 min-w-[60px]">
                <span className="text-lg font-bold text-emerald-500">{num.padStart(2, '0')}</span>
                <span className="text-[0.6rem] text-zinc-500">{delay} JOGOS</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Quadrants and Sums Summary */}
      <div id="quadrants-section" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.quadrants.map((q, idx) => {
            const avg = (q.reduce((a,b)=>a+b,0) / q.length).toFixed(2);
            return (
                <div key={idx} className="bg-zinc-950 p-4 border border-zinc-800 text-center">
                    <div className="text-[10px] text-zinc-500 mb-1">QUADRANTE {idx+1}</div>
                    <div className="text-xl font-bold text-emerald-400">{avg} <span className="text-[10px]">AVG</span></div>
                </div>
            )
        })}
      </div>

      <div id="sums-stats-section" className="bg-zinc-950 p-6 border border-zinc-800">
          <h3 className="text-sm font-bold mb-4 uppercase text-zinc-400">Resumo de Somatória</h3>
          <div className="flex justify-around items-center">
            <div className="text-center">
                <div className="text-[10px] text-zinc-500">MÍNIMA</div>
                <div className="text-xl md:text-2xl font-bold">{Math.min(...stats.sums)}</div>
            </div>
            <div className="text-center">
                <div className="text-[10px] text-zinc-500">MÉDIA</div>
                <div className="text-xl md:text-2xl font-bold text-emerald-500">{(stats.sums.reduce((a,b)=>a+b,0)/stats.sums.length).toFixed(0)}</div>
            </div>
            <div className="text-center">
                <div className="text-[10px] text-zinc-500">MÁXIMA</div>
                <div className="text-xl md:text-2xl font-bold">{Math.max(...stats.sums)}</div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default StatsView;
