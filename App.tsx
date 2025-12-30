
import React, { useState, useEffect, useRef } from 'react';
import { GameMode, Statistics, Draw, StrategyConfig, FilterConfig } from './types';
import TerminalHeader from './components/TerminalHeader';
import MainMenu from './components/MainMenu';
import ImportView from './components/ImportView';
import StatsView from './components/StatsView';
import GeneratorFlow from './components/GeneratorFlow';
import { calculateStatistics } from './services/lottoLogic';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { generateAIAnalysis } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<'menu' | 'import' | 'stats' | 'generator'>('menu');
  const [db, setDb] = useState<{ [key in GameMode]?: Draw[] }>({});
  const [activeMode, setActiveMode] = useState<GameMode>(GameMode.MEGASENA);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleImport = (mode: GameMode, draws: Draw[]) => {
    const newDb = { ...db, [mode]: draws };
    setDb(newDb);
    const calculated = calculateStatistics(draws, mode);
    setStats(calculated);
    setActiveMode(mode);
    setView('menu');
  };

  const handleShowStats = () => {
    if (!db[activeMode]) {
      alert("Aviso: Nenhuma base de dados importada para " + activeMode);
      return;
    }
    setView('stats');
  };

  const generateReportPDF = async () => {
    if (!stats) {
      alert("Erro: Estatísticas não encontradas.");
      return;
    }
    setIsGeneratingReport(true);
    
    try {
      // Use standard A4 dimensions for jsPDF
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      // Section ID list defined in StatsView
      const sectionIds = [
        { id: 'even-odd-section', title: 'Pares vs Ímpares' },
        { id: 'primes-section', title: 'Números Primos' },
        { id: 'sums-line-section', title: 'Evolução das Somas' },
        { id: 'lateness-section', title: 'Ranking de Atraso' },
        { id: 'quadrants-section', title: 'Médias por Quadrante' },
        { id: 'sums-stats-section', title: 'Resumo de Somatória' }
      ];

      // 1. Cover Page
      doc.setFillColor(9, 9, 11);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      doc.setTextColor(16, 185, 129);
      doc.setFontSize(28);
      doc.text(`LOTTOTUI PRO REPORT`, margin, 50);
      doc.setFontSize(14);
      doc.setTextColor(150, 150, 150);
      doc.text(`MODALIDADE: ${activeMode}`, margin, 65);
      doc.text(`ÚLTIMA ATUALIZAÇÃO: ${stats.lastUpdate}`, margin, 75);
      doc.text(`TOTAL DE SORTEIOS ANALISADOS: ${stats.count}`, margin, 85);
      doc.line(margin, 95, pageWidth - margin, 95);

      // 2. Loop through sections
      for (const section of sectionIds) {
        const element = document.getElementById(section.id);
        if (!element) {
          console.warn(`Section ${section.id} not found in DOM`);
          continue;
        }

        doc.addPage();
        doc.setFillColor(9, 9, 11);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        doc.setTextColor(16, 185, 129);
        doc.setFontSize(16);
        doc.text(section.title.toUpperCase(), margin, 20);

        try {
          const canvas = await html2canvas(element, {
            backgroundColor: '#09090b',
            scale: 1.5, // Slightly lower scale for stability
            useCORS: true,
            allowTaint: true,
            logging: false
          });

          const imgData = canvas.toDataURL('image/png');
          const imgHeight = (canvas.height * contentWidth) / canvas.width;
          
          // Center vertically if it fits, else start at top
          let startY = 30;
          if (imgHeight < pageHeight - 60) {
            startY = (pageHeight - imgHeight) / 2;
          }

          doc.addImage(imgData, 'PNG', margin, startY, contentWidth, imgHeight);
        } catch (canvasErr) {
          console.error(`Error capturing ${section.id}:`, canvasErr);
          doc.setTextColor(255, 0, 0);
          doc.text(`Erro ao capturar gráfico: ${section.title}`, margin, 40);
        }
      }

      // 3. AI Analysis Page
      try {
        const aiText = await generateAIAnalysis(stats, activeMode);
        
        doc.addPage();
        doc.setFillColor(9, 9, 11);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setTextColor(16, 185, 129);
        doc.setFontSize(18);
        doc.text("ANÁLISE ESTRATÉGICA IA", margin, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(200, 200, 200);
        const splitText = doc.splitTextToSize(aiText, contentWidth);
        
        let cursorY = 35;
        for (const line of splitText) {
          if (cursorY > pageHeight - margin) {
            doc.addPage();
            doc.setFillColor(9, 9, 11);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            cursorY = margin;
          }
          doc.text(line, margin, cursorY);
          cursorY += 5;
        }
      } catch (aiErr) {
        console.error("AI Analysis PDF step failed:", aiErr);
      }

      // 4. Save
      doc.save(`LottoTUI_Report_${activeMode}_${Date.now()}.pdf`);
      
    } catch (e) {
      console.error("General PDF Error:", e);
      alert("Houve um problema ao gerar o PDF. Verifique se os gráficos estão visíveis na tela.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="flex flex-col h-screen p-2 md:p-8 relative overflow-hidden">
      <div className="scanline"></div>
      
      <div className="flex-1 flex flex-col w-full bg-zinc-900 tui-border rounded-lg overflow-hidden shadow-2xl relative z-10">
        <TerminalHeader />
        
        <div className="flex-1 p-3 md:p-6 overflow-auto">
          {view === 'menu' && (
            <MainMenu 
              onSelectImport={() => setView('import')}
              onSelectStats={handleShowStats}
              onSelectGenerator={() => setView('generator')}
              hasData={!!db[activeMode]}
            />
          )}

          {view === 'import' && (
            <ImportView 
              onBack={() => setView('menu')}
              onImport={handleImport}
            />
          )}

          {view === 'stats' && stats && (
            <StatsView 
              stats={stats} 
              mode={activeMode} 
              onBack={() => setView('menu')}
              onGenerateReport={generateReportPDF}
              isGeneratingReport={isGeneratingReport}
            />
          )}

          {view === 'generator' && (
            <GeneratorFlow 
              onBack={() => setView('menu')}
              db={db}
            />
          )}
        </div>

        <div className="bg-zinc-950 px-4 py-2 border-t border-zinc-800 flex justify-between text-[10px] md:text-xs opacity-60">
          <div>LOTTOTUI PRO v1.1.2</div>
          <div className="hidden md:block">STATUS: ONLINE _</div>
        </div>
      </div>
    </div>
  );
};

export default App;
