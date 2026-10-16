import React, { useState } from 'react';
import { VisualViewportType, VisualQACriticReport } from '../types';
import { visualCriticService } from '../services/visualCriticService';

interface PlaywrightAutomationViewProps {
  onOpenVariablesModal?: (serverType: string, variableKey?: string) => void;
}

export const PlaywrightAutomationView: React.FC<PlaywrightAutomationViewProps> = ({
  onOpenVariablesModal
}) => {
  const [selectedViewport, setSelectedViewport] = useState<VisualViewportType>('desktop');
  const [testUrlOrHtml, setTestUrlOrHtml] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [report, setReport] = useState<VisualQACriticReport | null>(null);
  const [activeTab, setActiveTab] = useState<'viewports' | 'critic' | 'mcp_status'>('viewports');

  const defaultSampleHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <header class="w-full border-b border-slate-800 p-6 flex justify-between items-center">
    <div class="text-xl font-bold text-cyan-400">FlowApp</div>
    <nav class="hidden md:flex gap-6 text-sm text-slate-400">
      <a href="#" class="hover:text-white">Features</a>
      <a href="#" class="hover:text-white">Preços</a>
    </nav>
    <button class="px-4 py-2 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs">Começar</button>
  </header>
  <main class="max-w-6xl mx-auto px-4 py-16 text-center space-y-6">
    <h1 class="text-4xl md:text-6xl font-black">Construa o Futuro com IA</h1>
    <p class="text-slate-400 text-base max-w-xl mx-auto">Arquitetura visual com validação contínua em múltiplos dispositivos.</p>
    <div class="pt-4 flex justify-center gap-4">
      <button class="px-6 py-3 bg-cyan-500 text-slate-950 font-bold rounded-xl text-sm">Criar Agora</button>
      <button class="px-6 py-3 bg-slate-900 border border-slate-800 text-white font-bold rounded-xl text-sm">Ver Demo</button>
    </div>
  </main>
</body>
</html>`;

  const handleRunInspector = async () => {
    setIsRunning(true);
    try {
      const codeToTest = testUrlOrHtml.trim() || defaultSampleHtml;
      const res = await visualCriticService.auditLayout(codeToTest);
      setReport(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const getViewportDimensions = (vp: VisualViewportType) => {
    switch (vp) {
      case 'desktop': return { width: 1440, height: 900, label: 'Desktop Pro (1440x900)', icon: '💻' };
      case 'tablet': return { width: 768, height: 1024, label: 'iPad / Tablet (768x1024)', icon: '📱' };
      case 'mobile': return { width: 375, height: 812, label: 'iPhone / Mobile (375x812)', icon: '📲' };
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER BANNER */}
      <div className="p-6 bg-gradient-to-br from-cyan-950/80 via-slate-900 to-slate-950 border border-cyan-800/40 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-3xl shadow-lg border border-cyan-400/30">
              🎭
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-white tracking-wide">
                  PLAYWRIGHT BROWSER & VISUAL QA
                </h2>
                <span className="text-[10px] font-mono uppercase bg-cyan-900/80 text-cyan-300 border border-cyan-700 px-2 py-0.5 rounded-full font-bold">
                  FASE 4 • ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Automação de navegador headless para teste visual de múltiplos viewports, detecção de quebras de layout, conformidade WCAG e auditoria por IA Critic.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunInspector}
              disabled={isRunning}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Auditor Playwright em Execução...</span>
                </>
              ) : (
                <>
                  <span>🚀 Executar Playwright Auditor</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* SUB TABS */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('viewports')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'viewports' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            📱 Multi-Viewport Matrix
          </button>
          <button
            onClick={() => setActiveTab('critic')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'critic' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🤖 AI Critic Heuristics ({report?.issues.length || 0} issues)
          </button>
          <button
            onClick={() => setActiveTab('mcp_status')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'mcp_status' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚙️ MCP Protocol Specs
          </button>
        </div>
      </div>

      {/* VIEWPORT SELECTOR & MATRIX */}
      {activeTab === 'viewports' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['desktop', 'tablet', 'mobile'] as VisualViewportType[]).map((vp) => {
              const info = getViewportDimensions(vp);
              const isSel = selectedViewport === vp;
              return (
                <button
                  key={vp}
                  type="button"
                  onClick={() => setSelectedViewport(vp)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    isSel 
                      ? 'bg-slate-900 border-cyan-500 ring-1 ring-cyan-500/50 shadow-lg' 
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{info.icon}</span>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">{vp}</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-bold text-white">{info.label}</div>
                    <div className="text-[11px] font-mono text-slate-400">{info.width}px × {info.height}px</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* SIMULATED VIEWPORT CONTAINER */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-3xl space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Simulador de Renderização Playwright</span>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                  {getViewportDimensions(selectedViewport).width}px Viewport
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Headless Chromium Emulation</span>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex justify-center overflow-x-auto min-h-[420px]">
              <div 
                className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700 transition-all duration-300 relative"
                style={{
                  width: selectedViewport === 'mobile' ? '375px' : selectedViewport === 'tablet' ? '768px' : '100%',
                  maxWidth: '100%',
                  minHeight: '400px'
                }}
              >
                <iframe
                  title="Playwright Sandbox Viewport"
                  srcDoc={testUrlOrHtml.trim() || defaultSampleHtml}
                  className="w-full h-[400px] border-0"
                  sandbox="allow-scripts"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI CRITIC HEURISTICS VIEW */}
      {activeTab === 'critic' && (
        <div className="p-6 bg-slate-950 border border-slate-800 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Relatório de Diagnóstico do AI Critic</h3>
            {report && (
              <span className="text-xs font-mono font-bold text-cyan-400">Score: {report.score}/100</span>
            )}
          </div>

          {!report ? (
            <div className="text-center py-12 space-y-3">
              <div className="text-4xl">🤖</div>
              <p className="text-xs text-slate-400">Clique em "Executar Playwright Auditor" no topo para gerar um diagnóstico completo.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-300">
                <strong className="text-cyan-400 font-mono block mb-1">Avaliação Executiva:</strong>
                {report.summary}
              </div>

              <div className="space-y-2">
                {report.issues.map((iss) => (
                  <div key={iss.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{iss.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {iss.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{iss.description}</p>
                    <div className="text-[11px] font-mono text-cyan-400 pt-1">Sugestão: {iss.suggestedPatch}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MCP STATUS & PROTOCOL SPECS */}
      {activeTab === 'mcp_status' && (
        <div className="p-6 bg-slate-950 border border-slate-800 rounded-3xl space-y-4">
          <h3 className="text-sm font-bold text-white">Playwright MCP Tool Specs</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <div className="text-xs font-bold text-cyan-400 font-mono">playwright_navigate</div>
              <p className="text-xs text-slate-400">Navega para URLs ou carrega buffers HTML diretamente no contexto do browser.</p>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <div className="text-xs font-bold text-cyan-400 font-mono">playwright_screenshot</div>
              <p className="text-xs text-slate-400">Captura screenshots full-page ou de nós específicos em resoluções retina e múltiplos viewports.</p>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <div className="text-xs font-bold text-cyan-400 font-mono">playwright_evaluate</div>
              <p className="text-xs text-slate-400">Executa scripts JS de verificação DOM para calcular contrastes e overflow.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
