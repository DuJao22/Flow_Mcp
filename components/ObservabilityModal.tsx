import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import { ExecutionMetric } from '../types';

interface ObservabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ObservabilityModal: React.FC<ObservabilityModalProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState(analyticsService.getSummaryStats());

  useEffect(() => {
    if (isOpen) {
      setStats(analyticsService.getSummaryStats());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-blue-500/40 rounded-3xl w-full max-w-4xl overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.25)] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-blue-900/40 bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-blue-500/30">
              📊
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                OBSERVABILITY & ANALYTICS
              </h2>
              <p className="text-xs text-blue-300/80">
                Monitoramento de métricas enterprise: execuções, tokens, latência e estimativa de custos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Execuções</span>
              <span className="text-2xl font-black text-white mt-1">{stats.totalExecutions}</span>
              <span className="text-[10px] text-emerald-400 mt-1">✓ {stats.successCount} Sucessos</span>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Taxa de Sucesso</span>
              <span className="text-2xl font-black text-emerald-400 mt-1">{stats.successRate}%</span>
              <span className="text-[10px] text-rose-400 mt-1">{stats.errorCount} Erros</span>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Latência Média</span>
              <span className="text-2xl font-black text-indigo-300 mt-1">{stats.avgDurationMs}ms</span>
              <span className="text-[10px] text-slate-500 mt-1">Tempo por execução</span>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tokens & Custo Est.</span>
              <span className="text-xl font-black text-amber-300 mt-1">{stats.totalTokens} tks</span>
              <span className="text-[10px] text-amber-400 mt-1 font-mono">${stats.totalCost} USD</span>
            </div>
          </div>

          {/* Recent Executions History Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Histórico de Execuções Recentes
              </h3>
              <button
                onClick={() => {
                  analyticsService.clearMetrics();
                  setStats(analyticsService.getSummaryStats());
                }}
                className="text-[10px] text-rose-400 hover:underline"
              >
                Limpar Métricas
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Horário</th>
                    <th className="p-3">Workflow</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Duração</th>
                    <th className="p-3">Tokens</th>
                    <th className="p-3">Custo Est.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
                  {stats.recentMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500 font-sans">
                        Nenhuma execução registrada ainda. Execute um fluxo no Canvas para ver telemetria em tempo real!
                      </td>
                    </tr>
                  ) : (
                    stats.recentMetrics.map((m: ExecutionMetric) => (
                      <tr key={m.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-3 text-slate-400">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="p-3 font-sans font-bold text-white">{m.flowName}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            m.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="p-3 text-indigo-300">{m.durationMs}ms</td>
                        <td className="p-3 text-amber-300">{m.tokensUsed} tks</td>
                        <td className="p-3 text-slate-400">${m.estimatedCost.toFixed(6)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">
            Powered by Flow Architect Telemetry Core
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
