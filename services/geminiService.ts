
import { GoogleGenAI } from "@google/genai";
import { Statistics, GameMode } from "../types";

export async function generateAIAnalysis(stats: Statistics, mode: GameMode): Promise<string> {
  // Always create a new instance of GoogleGenAI inside the function to ensure the correct API key is used.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Analise os seguintes dados estatísticos da loteria ${mode} e gere um relatório detalhado em Português (Brasil).
    O relatório deve explicar o que cada estatística significa e dar insights sobre padrões observados.
    
    Dados:
    - Total de sorteios analisados: ${stats.count}
    - Último sorteio em: ${stats.lastUpdate}
    - Média de pares/ímpares: ${JSON.stringify(stats.evenOdd.slice(-10))} (últimos 10)
    - Distribuição de Primos: ${JSON.stringify(stats.primes.slice(-10))}
    - Números mais atrasados (top 5): ${JSON.stringify((Object.entries(stats.lateness) as [string, number][]).sort((a,b) => b[1] - a[1]).slice(0,5))}
    - Range de somas: Min: ${Math.min(...stats.sums)}, Max: ${Math.max(...stats.sums)}, Média: ${(stats.sums.reduce((a,b)=>a+b,0)/stats.sums.length).toFixed(2)}
    
    Formate como um relatório profissional, pronto para ser lido por um apostador que busca padrões matemáticos.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Access response.text directly as a property, not as a method.
    return response.text || "Erro ao gerar análise da IA.";
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "Não foi possível conectar com a IA para gerar o relatório detalhado.";
  }
}
