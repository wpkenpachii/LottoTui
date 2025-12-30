
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
    if (!stats) return;
    setIsGeneratingReport(true);
    
    try {
      // Initialize PDF
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      // Function to add a section as a new page
      const addSectionToPdf = async (id: string, title: string, isFirst: boolean = false) => {
        const element = document.getElementById(id);
        if (!element) return;

        if (!isFirst) doc.addPage();

        // Style the page
        doc.setFillColor(9, 9, 11); // Dark background
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        doc.setTextColor(16, 185, 129); // Emerald text
        doc.setFont('courier', 'bold');
        doc.setFontSize(16);
        doc.text(title.toUpperCase(), margin, 20);

        // Capture element
        const canvas = await html2canvas(element, {
          backgroundColor: '#09090b',
          scale: 2,
          logging: false,
          useCORS: true
        });

        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        // Ensure image fits or handle overflow (simple fit here)
        doc.addImage(imgData, 'PNG', margin, 30, contentWidth, imgHeight);
      };

      // 1. Cover / General Stats
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

      // 2. Process Sections individually
      await addSectionToPdf('even-odd-section', 'Gráfico: Pares vs Ímpares', false);
      await addSectionToPdf('primes-section', 'Gráfico: Números Primos', false);
      await addSectionToPdf('sums-line-section', 'Gráfico: Evolução das Somas', false);
      await addSectionToPdf('lateness-section', 'Gráfico: Ranking de Atraso', false);
      await addSectionToPdf('quadrants-section', 'Estatística: Médias por Quadrante', false);
      await addSectionToPdf('sums-stats-section', 'Estatística: Resumo de Somatória', false);

      // 3. AI Analysis Page
      doc.addPage();
      doc.setFillColor(9, 9, 11);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      doc.setTextColor(16, 185, 129);
      doc.setFontSize(18);
      doc.text("ANÁLISE ESTRATÉGICA (IA GEMINI)", margin, 20);
      
      doc.setFont('courier', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      
      const aiText = await generateAIAnalysis(stats, activeMode);
      const splitText = doc.splitTextToSize(aiText, contentWidth);
      
      // Handle multi-page text for AI analysis if it's very long
      let cursorY = 35;
      for (const line of splitText) {
        if (cursorY > pageHeight - 20) {
          doc.addPage();
          doc.setFillColor(9, 9, 11);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          cursorY = 20;
        }
        doc.text(line, margin, cursorY);
        cursorY += 5;
      }

      doc.save(`relatorio_completo_${activeMode.toLowerCase()}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar PDF modular. Verifique o console.");
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
          <div>LOTTOTUI MOBILE-READY V1.1.0</div>
          <div className="hidden md:block">ESTADO: OPERACIONAL _</div>
        </div>
      </div>
    </div>
  );
};

export default App;
