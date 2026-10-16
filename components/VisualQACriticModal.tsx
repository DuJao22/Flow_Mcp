import React, { useState } from 'react';
import { 
  VisualQACriticReport, 
  VisualQAIssue, 
  VisualViewportType 
} from '../types';
import { visualCriticService } from '../services/visualCriticService';

interface VisualQACriticModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  currentTheme?: string;
  onApplyPatchedCode: (newCode: string) => void;
}

export const VisualQACriticModal: React.FC<VisualQACriticModalProps> = ({
  isOpen,
  onClose,
  htmlContent,
  currentTheme = 'dark',
  onApplyPatchedCode
}) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [report, setReport] = useState<VisualQACriticReport | null>(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [activeViewport, setActiveViewport] = useState<VisualViewportType>('desktop');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartAudit = async () => {
    setIsAuditing(true);
    setStatusMessage('Inspecionando DOM e executando Playwright Visual QA...');
    try {
      const result = await visualCriticService.auditLayout(htmlContent, currentTheme);
      setReport(result);
      // Seleciona todos os issues inicialmente
      setSelectedIssueIds(result.issues.map(i => i.id));
      setStatusMessage(null);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Erro durante auditoria: ${err.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const toggleIssueSelection = (id: string) => {
    setSelectedIssueIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleApplySelectedFixes = async () => {
    if (!report || selectedIssueIds.length === 0) return;
    const issuesToFix = report.issues.filter(i => selectedIssueIds.includes(i.id));

    setIsApplyingFix(true);
    setStatusMessage('Aplicando patches de Tailwind CSS e aprimorando layout...');
    try {
      const fixedHtml = await visualCriticService.applyAutoFix(htmlContent, issuesToFix);
      onApplyPatchedCode(fixedHtml);
      setStatusMessage('Patches aplicados com sucesso no Design Lab!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Erro ao aplicar patches: ${err.message}`);
    } finally {
      setIsApplyingFix(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-800 bg-emerald-950/60';
    if (score >= 75) return 'text-blue-400 border-blue-800 bg-blue-950/60';
    if (score >= 50) return 'text-amber-400 border-amber-800 bg-amber-950/60';
    return 'text-rose-400 border-rose-800 bg-rose-950/60';
  };

  const getSeverityBadge = (sev: VisualQAIssue['severity']) => {
    if (sev === 'critical') return 'bg-rose-950 text-rose-300 border-rose-800';
    if (sev === 'warning') return 'bg-amber-950 text-amber-300 border-amber-800';
    return 'bg-blue-950 text-blue-300 border-blue-800';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-2xl shadow-lg">
              🎭
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-wide">
                  PLAYWRIGHT VISUAL QA & AI CRITIC
                </h3>
                <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full font-bold">
                  Phase 4
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Auditoria de responsividade em múltiplos viewports, contraste, hierarquia visual e auto-correção.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            ✕
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {statusMessage && (
            <div className="p-3.5 bg-blue-950/80 border border-blue-800 rounded-2xl text-xs text-blue-200 flex items-center gap-2">
              <span className="animate-pulse">✨</span>
              <span>{statusMessage}</span>
            </div>
          )}

          {!report ? (
            <div className="text-center py-12 space-y-4">
              <div className="text-5xl">🔍</div>
              <h4 className="text-base font-bold text-white">Pronto para Iniciar a Auditoria Visual</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                O AI Critic inspecionará o HTML renderizado nos breakpoints Desktop (1440px), Tablet (768px) e Mobile (375px), diagnosticando contraste, overflow e propondo correções de Tailwind em 1 clique.
              </p>
              <button
                type="button"
                onClick={handleStartAudit}
                disabled={isAuditing}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-xl flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {isAuditing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Inspecionando Layout com IA Critic...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Executar Auditoria Visual Completa</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              
              {/* SCORE CARDS & RATING */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center space-y-1 ${getScoreColor(report.score)}`}>
                  <span className="text-3xl font-black">{report.score}</span>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Score Geral</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-black/40 font-bold">{report.rating}</span>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col justify-center space-y-1">
                  <span className="text-xs text-slate-400">Estética Visual</span>
                  <span className="text-lg font-black text-white">{report.breakdown.visualAesthetics}%</span>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: `${report.breakdown.visualAesthetics}%` }} />
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col justify-center space-y-1">
                  <span className="text-xs text-slate-400">Mobile Layout</span>
                  <span className="text-lg font-black text-white">{report.breakdown.responsiveMobileLayout}%</span>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400" style={{ width: `${report.breakdown.responsiveMobileLayout}%` }} />
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col justify-center space-y-1">
                  <span className="text-xs text-slate-400">Contraste / A11y</span>
                  <span className="text-lg font-black text-white">{report.breakdown.colorContrastAccessibility}%</span>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: `${report.breakdown.colorContrastAccessibility}%` }} />
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col justify-center space-y-1">
                  <span className="text-xs text-slate-400">Tipografia</span>
                  <span className="text-lg font-black text-white">{report.breakdown.typographyConsistency}%</span>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400" style={{ width: `${report.breakdown.typographyConsistency}%` }} />
                  </div>
                </div>
              </div>

              {/* RESUMO DA IA CRITIC */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[11px] font-mono text-cyan-400 uppercase font-bold">Diagnóstico do AI Critic:</span>
                <p className="text-xs text-slate-300 leading-relaxed">{report.summary}</p>
              </div>

              {/* LISTA DE PROBLEMAS DETECTADOS COM AUTO-PATCH */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Problemas Detectados ({report.issues.length})</span>
                    <span className="text-xs text-slate-400">Selecione para aplicar o Auto-Fix</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedIssueIds(report.issues.map(i => i.id))}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300"
                    >
                      Selecionar Todos
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedIssueIds([])}
                      className="text-[11px] text-slate-400 hover:text-slate-300"
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                </div>

                {report.issues.length === 0 ? (
                  <div className="p-6 bg-emerald-950/40 border border-emerald-800 rounded-2xl text-center space-y-2">
                    <div className="text-3xl">🎉</div>
                    <h5 className="text-xs font-bold text-emerald-300">Nenhum problema visual crítico detectado!</h5>
                    <p className="text-[11px] text-slate-400">O layout atende aos padrões de contraste, responsividade e estética.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {report.issues.map((issue) => {
                      const isSelected = selectedIssueIds.includes(issue.id);
                      return (
                        <div
                          key={issue.id}
                          onClick={() => toggleIssueSelection(issue.id)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                            isSelected 
                              ? 'bg-slate-950 border-cyan-500/80 ring-1 ring-cyan-500/40' 
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-1 rounded border-slate-700 text-cyan-600 focus:ring-cyan-500"
                          />

                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white">{issue.title}</span>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full border font-mono uppercase font-bold ${getSeverityBadge(issue.severity)}`}>
                                {issue.severity}
                              </span>
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                                {issue.category}
                              </span>
                            </div>

                            <p className="text-xs text-slate-300">{issue.description}</p>

                            {issue.suggestedPatch && (
                              <div className="pt-1">
                                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300">
                                  💡 <strong>Sugestão:</strong> {issue.suggestedPatch}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-5 border-t border-slate-800 flex items-center justify-between bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
          >
            Fechar
          </button>

          {report && report.issues.length > 0 && (
            <button
              type="button"
              onClick={handleApplySelectedFixes}
              disabled={isApplyingFix || selectedIssueIds.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2"
            >
              {isApplyingFix ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Aplicando Correções...</span>
                </>
              ) : (
                <>
                  <span>🛠️ Aplicar Correções Selecionadas ({selectedIssueIds.length})</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
