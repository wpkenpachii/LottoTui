
import React, { useState, useEffect, useCallback } from 'react';
import { GameMode, Draw, StrategyType, FilterType, StrategyConfig, FilterConfig } from '../types';
import { GAME_RULES } from '../constants';
import { calculateStatistics, generateGames } from '../services/lottoLogic';

interface GeneratorFlowProps {
  onBack: () => void;
  db: { [key in GameMode]?: Draw[] };
}

const GeneratorFlow: React.FC<GeneratorFlowProps> = ({ onBack, db }) => {
  const [step, setStep] = useState<'mode' | 'config' | 'selection' | 'params' | 'results'>('mode');
  const [mode, setMode] = useState<GameMode>(GameMode.MEGASENA);
  const [numGames, setNumGames] = useState(1);
  const [numDezenas, setNumDezenas] = useState(6);
  
  const [availableStrats] = useState<StrategyType[]>([
    StrategyType.LATENESS, StrategyType.EVEN_ODD, StrategyType.PRIMES, StrategyType.MULTIPLES
  ]);
  const [availableFilters] = useState<FilterType[]>([
    FilterType.QUADRANTS, FilterType.SUM_TOTAL
  ]);

  const [selectedStrats, setSelectedStrats] = useState<StrategyType[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<FilterType[]>([]);
  const [activePanel, setActivePanel] = useState<'left' | 'right'>('left');
  const [listIdx, setListIdx] = useState(0);

  const [stratConfigs, setStratConfigs] = useState<StrategyConfig[]>([]);
  const [filterConfigs, setFilterConfigs] = useState<FilterConfig[]>([]);
  const [currentParamIdx, setCurrentParamIdx] = useState(0);
  const [paramState, setParamState] = useState<any>({});
  
  const [results, setResults] = useState<number[][]>([]);

  const jumpToStep = (targetStep: 'config' | 'selection' | 'params', idx?: number) => {
    if (targetStep === 'params' && idx !== undefined) {
      setCurrentParamIdx(idx);
      setParamState({});
      const allItems = [...selectedStrats, ...selectedFilters];
      setStratConfigs(prev => prev.slice(0, idx));
      setFilterConfigs(prev => prev.slice(0, Math.max(0, idx - selectedStrats.length)));
    } else {
      setStep(targetStep);
      if (targetStep === 'selection') {
        setStratConfigs([]);
        setFilterConfigs([]);
        setCurrentParamIdx(0);
      }
    }
  };

  useEffect(() => {
    if (step !== 'selection') return;

    const list = activePanel === 'left' ? [...availableStrats, ...availableFilters, 'FINALIZAR'] : selectedStrats.concat(selectedFilters as any);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setActivePanel(p => p === 'left' ? 'right' : 'left');
        setListIdx(0);
      }
      if (e.key === 'ArrowDown') setListIdx(i => (i + 1) % list.length);
      if (e.key === 'ArrowUp') setListIdx(i => (i - 1 + list.length) % list.length);
      
      if (e.key === 'Enter') {
        if (activePanel === 'left') {
          const item = list[listIdx];
          if (item === 'FINALIZAR') {
            if (selectedStrats.length === 0 && selectedFilters.length === 0) {
              setStep('results');
              setTimeout(() => {
                const stats = calculateStatistics(db[mode]!, mode);
                const generated = generateGames(numGames, numDezenas, mode, [], [], stats);
                setResults(generated);
              }, 50);
            } else {
              setStep('params');
            }
            return;
          }
          if (Object.values(StrategyType).includes(item as StrategyType)) {
            setSelectedStrats(s => [...s, item as StrategyType]);
          } else {
            setSelectedFilters(f => [...f, item as FilterType]);
          }
        } else {
          const item = list[listIdx];
          if (Object.values(StrategyType).includes(item as StrategyType)) {
            setSelectedStrats(s => s.filter(x => x !== item));
          } else {
            setSelectedFilters(f => f.filter(x => x !== item));
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, activePanel, listIdx, selectedStrats, selectedFilters]);

  const handleStart = () => {
    const rules = GAME_RULES[mode];
    setNumDezenas(rules.minDezenas);
    setStep('config');
  };

  const nextParam = () => {
    const allItems = [...selectedStrats, ...selectedFilters];
    const currentItem = allItems[currentParamIdx];

    const updatedStrats = [...stratConfigs];
    const updatedFilters = [...filterConfigs];

    if (Object.values(StrategyType).includes(currentItem as StrategyType)) {
      updatedStrats.push({ type: currentItem as StrategyType, params: { ...paramState } });
      setStratConfigs(updatedStrats);
    } else {
      updatedFilters.push({ type: currentItem as FilterType, params: { ...paramState } });
      setFilterConfigs(updatedFilters);
    }

    if (currentParamIdx < allItems.length - 1) {
      setParamState({});
      setCurrentParamIdx(currentParamIdx + 1);
    } else {
      setStep('results');
      setTimeout(() => {
        const stats = calculateStatistics(db[mode]!, mode);
        const generated = generateGames(numGames, numDezenas, mode, updatedStrats, updatedFilters, stats);
        setResults(generated);
      }, 50);
    }
  };

  if (step === 'mode') {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 md:space-y-8 h-full">
        <h2 className="text-xl font-bold text-emerald-500">SELECIONE A MODALIDADE</h2>
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6 w-full max-w-sm md:max-w-none">
          {[GameMode.MEGASENA, GameMode.LOTOFACIL].map(m => (
            <button 
              key={m}
              onClick={() => { setMode(m); handleStart(); }}
              className="flex-1 px-10 py-6 border-2 border-zinc-800 hover:border-emerald-500 hover:bg-emerald-500/10 text-lg font-bold transition-all"
            >
              {GAME_RULES[m].name}
            </button>
          ))}
        </div>
        <button onClick={onBack} className="text-zinc-500 text-sm underline mt-4">CANCELAR E VOLTAR</button>
      </div>
    );
  }

  if (step === 'config') {
    const rules = GAME_RULES[mode];
    return (
      <div className="max-w-md mx-auto space-y-8 py-6">
        <h2 className="text-2xl font-bold border-b border-zinc-700 pb-2">CONFIGURAÇÃO INICIAL</h2>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-zinc-500 text-xs font-bold uppercase">Quantidade de Jogos (1-100):</label>
            <input 
              type="number" 
              value={numGames} 
              onChange={e => setNumGames(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 focus:border-emerald-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-zinc-500 text-xs font-bold uppercase">Dezenas por Jogo ({rules.minDezenas}-{rules.maxDezenas}):</label>
            <input 
              type="number" 
              value={numDezenas} 
              onChange={e => setNumDezenas(Math.min(rules.maxDezenas, Math.max(rules.minDezenas, parseInt(e.target.value) || rules.minDezenas)))}
              className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>
        <button 
          onClick={() => setStep('selection')}
          className="w-full bg-emerald-500 text-zinc-950 font-bold py-4 hover:bg-emerald-400 transition-colors"
        >
          AVANÇAR PARA SELEÇÃO
        </button>
      </div>
    );
  }

  if (step === 'selection') {
    const leftList = [...availableStrats, ...availableFilters, 'FINALIZAR'];
    const rightList = [...selectedStrats, ...selectedFilters];

    return (
      <div className="h-full flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row justify-between md:items-end border-b border-zinc-800 pb-4 gap-2">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-emerald-500">SELEÇÃO DE FILTROS</h2>
            <p className="text-[10px] md:text-xs text-zinc-500">TAB: trocar painéis | SETAS: navegar | ENTER: mover.</p>
          </div>
          <button 
            onClick={() => jumpToStep('config')}
            className="text-[10px] px-2 py-1 border border-zinc-700 hover:bg-zinc-800"
          >
            ← VOLTAR CONFIGS
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
          <div className={`flex-1 flex flex-col border-2 p-2 md:p-4 transition-all overflow-hidden ${activePanel === 'left' ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800 opacity-60'}`}>
            <h3 className="text-xs font-bold mb-2 uppercase text-zinc-400">Disponíveis</h3>
            <div className="flex-1 space-y-1 overflow-auto">
              {leftList.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => { setActivePanel('left'); setListIdx(idx); }}
                  className={`px-3 py-2 flex items-center text-sm cursor-pointer ${activePanel === 'left' && listIdx === idx ? 'bg-emerald-500 text-zinc-950 font-bold' : 'text-zinc-400'}`}
                >
                  {activePanel === 'left' && listIdx === idx ? '>> ' : '   '} {item}
                </div>
              ))}
            </div>
          </div>

          <div className={`flex-1 flex flex-col border-2 p-2 md:p-4 transition-all overflow-hidden ${activePanel === 'right' ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800 opacity-60'}`}>
            <h3 className="text-xs font-bold mb-2 uppercase text-zinc-400">Selecionados</h3>
            <div className="flex-1 space-y-1 overflow-auto">
              {rightList.length === 0 ? (
                <div className="text-zinc-700 italic text-xs p-4">Nenhum item selecionado...</div>
              ) : (
                rightList.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => { setActivePanel('right'); setListIdx(idx); }}
                    className={`px-3 py-2 flex items-center text-sm cursor-pointer ${activePanel === 'right' && listIdx === idx ? 'bg-emerald-500 text-zinc-950 font-bold' : 'text-zinc-400'}`}
                  >
                    {activePanel === 'right' && listIdx === idx ? '<< ' : `${idx+1}. `} {item}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'params') {
    const allItems = [...selectedStrats, ...selectedFilters];
    const currentItem = allItems[currentParamIdx];

    return (
      <div className="max-w-2xl mx-auto py-4 md:py-10 space-y-6">
        <div className="flex flex-wrap gap-2 text-[10px] md:text-xs">
          <button onClick={() => jumpToStep('config')} className="text-zinc-500 hover:text-white underline">CONFIGS</button>
          <span className="text-zinc-700">/</span>
          <button onClick={() => jumpToStep('selection')} className="text-zinc-500 hover:text-white underline">SELEÇÃO</button>
          {allItems.map((item, idx) => (
            <React.Fragment key={idx}>
              <span className="text-zinc-700">/</span>
              <button 
                disabled={idx >= currentParamIdx}
                onClick={() => jumpToStep('params', idx)}
                className={`uppercase ${idx === currentParamIdx ? 'text-emerald-500 font-bold' : idx < currentParamIdx ? 'text-zinc-500 hover:text-white underline' : 'text-zinc-800'}`}
              >
                {item.split(' ')[0]}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-2xl font-bold text-emerald-500 uppercase">{currentItem}</h2>
            <div className="text-[10px] md:text-xs text-zinc-500">{currentParamIdx + 1} de {allItems.length}</div>
        </div>

        <div className="bg-zinc-950 p-4 md:p-8 border border-zinc-800 space-y-6">
          {currentItem === StrategyType.LATENESS && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500">QTD DE NÚMEROS ATRASADOS:</label>
                <input type="number" value={paramState.count || ''} className="w-full bg-zinc-900 border border-zinc-700 p-2 mt-1 outline-none focus:border-emerald-500" 
                    onChange={e => setParamState({...paramState, count: parseInt(e.target.value) || 0})} placeholder="Ex: 2" />
              </div>
              <div>
                <label className="text-xs text-zinc-500">ATRASO MÍNIMO (JOGOS):</label>
                <input type="number" value={paramState.minDelay || ''} className="w-full bg-zinc-900 border border-zinc-700 p-2 mt-1 outline-none focus:border-emerald-500"
                    onChange={e => setParamState({...paramState, minDelay: parseInt(e.target.value) || 0})} placeholder="Ex: 10" />
              </div>
            </div>
          )}

          {currentItem === StrategyType.EVEN_ODD && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500">PARES:</label>
                <input type="number" value={paramState.even || ''} className="w-full bg-zinc-900 border border-zinc-700 p-2 mt-1"
                    onChange={e => setParamState({...paramState, even: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label className="text-xs text-zinc-500">ÍMPARES:</label>
                <input type="number" value={paramState.odd || ''} className="w-full bg-zinc-900 border border-zinc-700 p-2 mt-1"
                    onChange={e => setParamState({...paramState, odd: parseInt(e.target.value) || 0})} />
              </div>
            </div>
          )}

          {currentItem === StrategyType.PRIMES && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500">MÍN PRIMOS:</label>
                <input type="number" value={paramState.min || ''} className="w-full bg-zinc-900 border border-zinc-700 p-2 mt-1"
                    onChange={e => setParamState({...paramState, min: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label className="text-xs text-zinc-500">MÁX PRIMOS:</label>
                <input type="number" value={paramState.max || ''} className="w-full bg-zinc-900 border border-zinc-700 p-2 mt-1"
                    onChange={e => setParamState({...paramState, max: parseInt(e.target.value) || 0})} />
              </div>
            </div>
          )}

          {currentItem === FilterType.SUM_TOTAL && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500">SOMA MÍN:</label>
                <input type="number" value={paramState.min || ''} className="w-full bg-zinc-900 border border-zinc-700 p-2 mt-1"
                    onChange={e => setParamState({...paramState, min: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <label className="text-xs text-zinc-500">SOMA MÁX:</label>
                <input type="number" value={paramState.max || ''} className="w-full bg-zinc-900 border border-zinc-700 p-2 mt-1"
                    onChange={e => setParamState({...paramState, max: parseInt(e.target.value) || 0})} />
              </div>
            </div>
          )}

          {currentItem === FilterType.QUADRANTS && (
             <div className="grid grid-cols-2 gap-x-4 md:gap-x-8 gap-y-4">
                {[1, 2, 3, 4].map(q => (
                    <div key={q} className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="text-[10px] text-zinc-500 uppercase">Q{q} MÍN</label>
                            <input type="number" value={paramState[`q${q}Min`] || ''} className="w-full bg-zinc-900 border border-zinc-700 p-1 md:p-2"
                                onChange={e => setParamState({...paramState, [`q${q}Min`]: parseInt(e.target.value) || 0})} />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] text-zinc-500 uppercase">Q{q} MAX</label>
                            <input type="number" value={paramState[`q${q}Max`] || ''} className="w-full bg-zinc-900 border border-zinc-700 p-1 md:p-2"
                                onChange={e => setParamState({...paramState, [`q${q}Max`]: parseInt(e.target.value) || 0})} />
                        </div>
                    </div>
                ))}
             </div>
          )}

          <button onClick={nextParam} className="w-full bg-emerald-500 text-zinc-950 font-bold py-4 active:scale-95 transition-transform">
             {currentParamIdx === allItems.length - 1 ? 'GERAR JOGOS' : 'PRÓXIMO'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'results') {
    return (
      <div className="space-y-4 md:space-y-6 h-full flex flex-col">
        <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-zinc-800 pb-4 gap-4">
          <h2 className="text-xl md:text-2xl font-bold text-emerald-500">JOGOS GERADOS</h2>
          <div className="flex gap-2">
            <button 
                onClick={() => {
                    const stats = calculateStatistics(db[mode]!, mode);
                    const generated = generateGames(numGames, numDezenas, mode, stratConfigs, filterConfigs, stats);
                    setResults(generated);
                }} 
                className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/50 px-4 py-2 text-xs font-bold hover:bg-emerald-500/30 active:scale-95"
            >
                RE-GERAR
            </button>
            <button onClick={onBack} className="bg-zinc-800 text-white px-4 py-2 border border-zinc-700 text-xs">MENU</button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-auto pr-2 pb-8">
          {results.length === 0 ? (
            <div className="col-span-1 md:col-span-2 text-center py-20 bg-zinc-950 border border-dashed border-zinc-800 italic text-zinc-500">
               Critérios muito restritos ou base insuficiente. Tente voltar e alterar os parâmetros.
            </div>
          ) : (
            results.map((game, idx) => (
              <div key={idx} className="bg-zinc-950 border border-zinc-800 p-4 md:p-6 flex items-center justify-between group hover:border-emerald-500 transition-colors">
                <div className="flex flex-wrap gap-2">
                  {game.map(num => (
                    <span key={num} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-bold text-sm md:text-base">
                      {num.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] text-zinc-700 font-mono tracking-tighter hidden md:block">
                  #{(idx + 1).toString().padStart(2, '0')}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-t shrink-0">
            <div className="flex justify-between items-center mb-1">
                <h4 className="text-[10px] font-bold text-emerald-500 uppercase">Filtros:</h4>
                <button onClick={() => jumpToStep('selection')} className="text-[9px] text-zinc-500 underline uppercase">Editar Filtros</button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
                {stratConfigs.map((s, i) => <span key={i} className="text-[9px] text-zinc-400">→ {s.type}</span>)}
                {filterConfigs.map((f, i) => <span key={i} className="text-[9px] text-zinc-400">→ {f.type}</span>)}
            </div>
        </div>
      </div>
    );
  }

  return null;
};

export default GeneratorFlow;
