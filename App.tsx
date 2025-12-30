
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
      // Use standard A4 dimensions for jsPDF (210 x 297 mm)
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);

      // Section ID list defined in StatsView
      const sectionIds = [
        { id: 'even-odd-section', title: 'Distribuição: Pares vs Ímpares' },
        { id: 'primes-section', title: 'Distribuição: Números Primos' },
        { id: 'sums-line-section', title: 'Tendência: Evolução das Somas' },
        { id: 'lateness-section', title: 'Ranking: Números em Atraso' },
        { id: 'quadrants-section', title: 'Desempenho: Médias por Quadrante' },
        { id: 'sums-stats-section', title: 'Resumo: Métricas de Somatória' }
      ];

      // 1. Cover Page
      doc.setFillColor(9, 9, 11);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      doc.setTextColor(16, 185, 129);
      doc.setFontSize(26);
      doc.text(`LOTTOTUI PRO REPORT`, margin + 5, 50);
      doc.setFontSize(14);
      doc.setTextColor(150, 150, 150);
      doc.text(`MODALIDADE: ${activeMode}`, margin + 5, 65);
      doc.text(`DATA BASE: ${stats.lastUpdate}`, margin + 5, 75);
      doc.text(`SORTEIOS ANALISADOS: ${stats.count}`, margin + 5, 85);
      doc.setDrawColor(16, 185, 129);
      doc.line(margin + 5, 95, pageWidth - margin - 5, 95);
      doc.setFontSize(10);
      doc.text("Gerado por Inteligência Artificial Gemini", margin + 5, pageHeight - 15);

      // 2. Loop through sections and capture each
      for (const section of sectionIds) {
        const element = document.getElementById(section.id);
        if (!element) continue;

        doc.addPage();
        doc.setFillColor(9, 9, 11);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        doc.setTextColor(16, 185, 129);
        doc.setFontSize(14);
        doc.text(section.title.toUpperCase(), margin, 15);

        // Capture with html2canvas - scale 1 to avoid memory crashes on some devices
        const canvas = await html2canvas(element, {
          backgroundColor: '#09090b',
          scale: 1,
          useCORS: true,
          logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * contentWidth) / canvas.width;
        
        // Add image to PDF
        doc.addImage(imgData, 'PNG', margin, 25, contentWidth, imgHeight);
      }

      // 3. AI Analysis Page
      try {
        const aiText = await generateAIAnalysis(stats, activeMode);
        
        doc.addPage();
        doc.setFillColor(9, 9, 11);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setTextColor(16, 185, 129);
        doc.setFontSize(16);
        doc.text("ANÁLISE ESTRATÉGICA IA (GEMINI)", margin, 15);
        
        doc.setFontSize(9);
        doc.setTextColor(200, 200, 200);
        const splitText = doc.splitTextToSize(aiText, contentWidth);
        
        let cursorY = 25;
        for (const line of splitText) {
          if (cursorY > pageHeight - 15) {
            doc.addPage();
            doc.setFillColor(9, 9, 11);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            cursorY = 15;
          }
          doc.text(line, margin, cursorY);
          cursorY += 4.5;
        }
      } catch (aiErr) {
        console.error("AI Analysis step failed", aiErr);
      }

      doc.save(`Relatorio_LottoTUI_${activeMode}_${Date.now()}.pdf`);
      
    } catch (e) {
      console.error("PDF Export Error:", e);
      alert("Falha ao gerar o PDF. Certifique-se de que a aba de estatísticas está aberta.");
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
          <div>LOTTOTUI PRO v1.1.5</div>
          <div className="hidden md:block">ESTADO: PRONTO _</div>
        </div>
      </div>
    </div>
  );
};

export default App;
