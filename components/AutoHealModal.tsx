import React, { useState, useEffect } from 'react';
import {
  AutoHealScore8D,
  AutoHealPatch,
  AutoHealSnapshot,
  AutoHealLogEntry,
  AutoHealIterationState
} from '../types';
import { autoHealEngine } from '../services/autoHealEngine';

interface AutoHealModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHtml: string;
  onApplyFinalHtml: (updatedHtml: string, score: AutoHealScore8D) => void;
}

export const AutoHealModal: React.FC<AutoHealModalProps> = ({
  isOpen,
  onClose,
  currentHtml,
  onApplyFinalHtml
}) => {
  const [iterationState, setIterationState] = useState<AutoHealIterationState>({
    iteration: 1,
    maxIterations: 3,
    status: 'IDLE',
    currentScore: {
      visual: 90,
      ux: 88,
      responsive: 91,
      accessibility: 95,
      performance: 89,
      motion: 84,
      conversion: 86,
      codeQuality: 92,
      overall: 89
    },
    logs: [],
    snapshots: [],
    autoApply: false, // Padrão: ASK BEFORE APPLYING (Fase 11)
    browserMode: 'STATIC_ANALYSIS'
  });

  const [workingHtml, setWorkingHtml] = useState(currentHtml);
  const [isProcessing, setIsProcessing] = useState(false);

  // Inicializa o Browser Mode e o Score Inicial ao abrir
  useEffect(() => {
    if (isOpen) {
      setWorkingHtml(currentHtml);
      initializeAutoHeal();
    }
  }, [isOpen, currentHtml]);

  const addLog = (type: AutoHealLogEntry['type'], iteration: number, message: string, details?: Record<string, any>) => {
    const entry: AutoHealLogEntry = {
      timestamp: Date.now(),
      type,
      iteration,
      message,
      details
    };
    setIterationState(prev => ({ ...prev, logs: [...prev.logs, entry] }));
  };

  const initializeAutoHeal = async () => {
    setIsProcessing(true);
    addLog('AUTO_HEAL_STARTED', 1, 'Iniciando Auto-Heal Engine...');

    try {
      // 1. Verificar status do browser
      let bMode: 'REAL_BROWSER' | 'STATIC_ANALYSIS' = 'STATIC_ANALYSIS';
      try {
        const res = await fetch('/api/mcp/playwright/status');
        if (res.ok) {
          const data = await res.json();
          bMode = data.mode;
        }
      } catch {}

      // 2. Snapshot Inicial (version_001)
      addLog('QA_STARTED', 1, 'Executando auditoria QA (DOM, Acessibilidade, Responsividade, Motion)...');
      const { score8D, browserMode } = await autoHealEngine.evaluateHtml(currentHtml);
      addLog('QA_COMPLETED', 1, `QA inicial concluído com Overall Score ${score8D.overall}/100.`);

      const snapshot0: AutoHealSnapshot = {
        versionId: 'version_001',
        timestamp: Date.now(),
        htmlCode: currentHtml,
        score: score8D,
        reason: 'Estado inicial antes da otimização'
      };

      setIterationState(prev => ({
        ...prev,
        status: 'IDLE',
        browserMode: bMode || browserMode,
        currentScore: score8D,
        snapshots: [snapshot0]
      }));
    } catch (e: any) {
      addLog('AUTO_HEAL_REJECTED', 1, `Erro ao inicializar QA: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteIteration = async (currentIter: number) => {
    setIsProcessing(true);
    const iter = currentIter;

    addLog('QA_STARTED', iter, `[Iteração ${iter}/${iterationState.maxIterations}] Analisando DOM, Acessibilidade e Motion...`);
    setIterationState(prev => ({ ...prev, status: 'ANALYZING', iteration: iter }));

    try {
      // 1. Análise de QA & Crítico
      const { score8D, criticReport } = await autoHealEngine.evaluateHtml(workingHtml);
      addLog('QA_COMPLETED', iter, `Diagnóstico realizado. Score atual: ${score8D.overall}/100.`);

      // 2. Geração do Patch com IA
      addLog('CRITIC_STARTED', iter, 'Enviando diagnóstico e contexto do projeto ao Gemini para geração do patch...');
      setIterationState(prev => ({ ...prev, status: 'GENERATING_PATCH' }));
      const patch = await autoHealEngine.generateStructuredPatch(workingHtml, score8D, criticReport);
      addLog('PATCH_GENERATED', iter, `Patch gerado: ${patch.reason}`);

      // 3. Validação do Patch
      setIterationState(prev => ({ ...prev, status: 'VALIDATING' }));
      const validation = autoHealEngine.validatePatch(patch, workingHtml);
      if (!validation.valid) {
        addLog('AUTO_HEAL_REJECTED', iter, `Patch rejeitado pela validação de segurança: ${validation.reason}`);
        setIterationState(prev => ({ ...prev, status: 'IDLE' }));
        setIsProcessing(false);
        return;
      }
      addLog('PATCH_VALIDATED', iter, 'Patch validado com sucesso (estrutura HTML íntegra).');

      // Se autoApply estiver desativado ("Ask before applying"), aguarda aprovação
      if (!iterationState.autoApply) {
        setIterationState(prev => ({
          ...prev,
          status: 'WAITING_APPROVAL',
          pendingPatch: patch,
          previousScore: prev.currentScore
        }));
        setIsProcessing(false);
        return;
      }

      // Aplica imediatamente
      await applyPatchAndRetest(patch, iter, score8D);
    } catch (err: any) {
      addLog('AUTO_HEAL_REJECTED', iter, `Falha na iteração: ${err.message}`);
      setIterationState(prev => ({ ...prev, status: 'IDLE' }));
      setIsProcessing(false);
    }
  };

  const applyPatchAndRetest = async (patch: AutoHealPatch, iter: number, prevScore: AutoHealScore8D) => {
    setIsProcessing(true);
    setIterationState(prev => ({ ...prev, status: 'APPLYING' }));
    addLog('PATCH_APPLIED', iter, 'Aplicando patch no código...');

    const newHtml = patch.fullUpdatedHtml || workingHtml;

    // Renderização e Re-teste
    setIterationState(prev => ({ ...prev, status: 'RENDERING' }));
    addLog('RENDER_STARTED', iter, 'Renderizando nova versão no browser...');
    await new Promise(r => setTimeout(r, 600)); // Delay para renderização
    addLog('RENDER_COMPLETED', iter, 'Renderização finalizada.');

    setIterationState(prev => ({ ...prev, status: 'RETESTING' }));
    addLog('QA_RETEST', iter, 'Re-testando QA na nova versão renderizada...');
    const { score8D: newScore } = await autoHealEngine.evaluateHtml(newHtml);

    // Comparação de Score (newScore > oldScore)
    if (newScore.overall > prevScore.overall) {
      addLog('SCORE_IMPROVED', iter, `Score aprimorado com sucesso: ${prevScore.overall} → ${newScore.overall}!`);
      
      const newSnapshot: AutoHealSnapshot = {
        versionId: `version_00${iterationState.snapshots.length + 1}`,
        timestamp: Date.now(),
        htmlCode: newHtml,
        score: newScore,
        reason: patch.reason
      };

      setWorkingHtml(newHtml);
      setIterationState(prev => ({
        ...prev,
        currentScore: newScore,
        previousScore: prevScore,
        snapshots: [...prev.snapshots, newSnapshot],
        pendingPatch: undefined,
        status: iter < prev.maxIterations && newScore.overall < 95 ? 'IDLE' : 'COMPLETED'
      }));

      if (iter >= iterationState.maxIterations || newScore.overall >= 95) {
        addLog('AUTO_HEAL_COMPLETED', iter, `Auto-Heal concluído com Score Excelente (${newScore.overall}/100).`);
      }
    } else {
      // Score piorou ou estagnou -> ROLLBACK Automático (Fase 5 & 6)
      addLog('ROLLBACK', iter, `Score não melhorou (${newScore.overall} <= ${prevScore.overall}). Executando Rollback de segurança para a versão anterior.`);
      setIterationState(prev => ({
        ...prev,
        status: 'IDLE',
        pendingPatch: undefined
      }));
    }

    setIsProcessing(false);
  };

  const handleManualRollback = () => {
    if (iterationState.snapshots.length > 1) {
      const prevSnap = iterationState.snapshots[iterationState.snapshots.length - 2];
      setWorkingHtml(prevSnap.htmlCode);
      setIterationState(prev => ({
        ...prev,
        currentScore: prevSnap.score,
        snapshots: prev.snapshots.slice(0, -1),
        status: 'IDLE'
      }));
      addLog('ROLLBACK', iterationState.iteration, `Rollback manual executado para ${prevSnap.versionId}.`);
    }
  };

  const handleApplyAndFinish = () => {
    onApplyFinalHtml(workingHtml, iterationState.currentScore);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-purple-500/40 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl shadow-lg">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">AUTO-HEAL ENGINE</h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  iterationState.browserMode === 'REAL_BROWSER'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-amber-950 text-amber-300 border border-amber-700'
                }`}>
                  {iterationState.browserMode === 'REAL_BROWSER' ? '🟢 REAL BROWSER' : '🟡 STATIC ANALYSIS'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Auditoria contínua, geração de patches cirúrgicos e rollback automático.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Top Score 8-Dimensions Grid */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">AI Quality (8 Dimensões)</span>
              <div className="flex items-center gap-2">
                {iterationState.previousScore && (
                  <span className="text-xs text-slate-400 font-mono">
                    {iterationState.previousScore.overall} →
                  </span>
                )}
                <span className="text-xl font-black text-purple-400">
                  {iterationState.currentScore.overall} / 100
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Visual</span>
                <span className="font-bold text-purple-300">{iterationState.currentScore.visual}</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">UX</span>
                <span className="font-bold text-indigo-300">{iterationState.currentScore.ux}</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Motion</span>
                <span className="font-bold text-pink-300">{iterationState.currentScore.motion}</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Mobile</span>
                <span className="font-bold text-blue-300">{iterationState.currentScore.responsive}</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Acessibilidade</span>
                <span className="font-bold text-emerald-300">{iterationState.currentScore.accessibility}</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Performance</span>
                <span className="font-bold text-cyan-300">{iterationState.currentScore.performance}</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Conversão</span>
                <span className="font-bold text-amber-300">{iterationState.currentScore.conversion}</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Qualidade Código</span>
                <span className="font-bold text-teal-300">{iterationState.currentScore.codeQuality}</span>
              </div>
            </div>
          </div>

          {/* Safety Settings (Fase 11) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="radio"
                  name="autoApplyMode"
                  checked={!iterationState.autoApply}
                  onChange={() => setIterationState(prev => ({ ...prev, autoApply: false }))}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className="font-semibold">Ask before applying (Recomendado)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="radio"
                  name="autoApplyMode"
                  checked={iterationState.autoApply}
                  onChange={() => setIterationState(prev => ({ ...prev, autoApply: true }))}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className="font-semibold">Apply automatically</span>
              </label>
            </div>

            {iterationState.snapshots.length > 1 && (
              <button
                onClick={handleManualRollback}
                className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <span>⏪ Rollback de Versão</span>
              </button>
            )}
          </div>

          {/* Waiting for Approval Card */}
          {iterationState.status === 'WAITING_APPROVAL' && iterationState.pendingPatch && (
            <div className="bg-purple-950/50 border-2 border-purple-500/60 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                  ⚠️ Patch Gerado — Aprovação Necessária
                </span>
                <span className="text-[10px] bg-purple-900 text-purple-200 px-2 py-0.5 rounded-md font-mono">
                  Iteração {iterationState.iteration} de {iterationState.maxIterations}
                </span>
              </div>
              <p className="text-xs text-slate-200 font-medium">
                {iterationState.pendingPatch.reason}
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1">
                <span className="font-bold text-slate-400 block">Melhorias Esperadas:</span>
                {iterationState.pendingPatch.expectedImprovements.map((imp, i) => (
                  <div key={i} className="text-emerald-400 flex items-center gap-1.5">
                    <span>✓</span>
                    <span>{imp}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIterationState(prev => ({ ...prev, status: 'IDLE', pendingPatch: undefined }))}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Descartar Patch
                </button>
                <button
                  onClick={() => applyPatchAndRetest(iterationState.pendingPatch!, iterationState.iteration, iterationState.currentScore)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  Aprovar & Aplicar
                </button>
              </div>
            </div>
          )}

          {/* Audit Logs Step by Step (Fase 12) */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Registro de Execução do Auto-Heal
            </span>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 max-h-48 overflow-y-auto space-y-2 font-mono text-[11px] custom-scrollbar">
              {iterationState.logs.length === 0 ? (
                <div className="text-slate-600 italic py-2">Nenhum evento registrado ainda.</div>
              ) : (
                iterationState.logs.map((l, i) => (
                  <div key={i} className="flex items-start gap-2 text-slate-300">
                    <span className="text-purple-400 shrink-0">
                      [{new Date(l.timestamp).toLocaleTimeString()}]
                    </span>
                    <span className={`shrink-0 px-1 rounded text-[9px] font-bold ${
                      l.type === 'SCORE_IMPROVED' ? 'bg-emerald-950 text-emerald-300' :
                      l.type === 'ROLLBACK' ? 'bg-rose-950 text-rose-300' :
                      l.type === 'PATCH_APPLIED' ? 'bg-indigo-950 text-indigo-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {l.type}
                    </span>
                    <span className="text-slate-200">{l.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            Versões: <span className="text-purple-300 font-bold">{iterationState.snapshots.map(s => s.versionId).join(' → ')}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
            >
              Cancelar
            </button>

            {iterationState.iteration < iterationState.maxIterations && iterationState.status === 'IDLE' && (
              <button
                onClick={() => handleExecuteIteration(iterationState.iteration)}
                disabled={isProcessing}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                    <span>Executando...</span>
                  </>
                ) : (
                  <>
                    <span>✨ Executar Iteração {iterationState.iteration}/{iterationState.maxIterations}</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleApplyAndFinish}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/20 transition-all"
            >
              Salvar & Aplicar no Design Lab
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
