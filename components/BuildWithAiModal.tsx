import React, { useState } from 'react';
import { generateFlowFromPrompt } from '../services/geminiService';
import { FlowSchema, FlowNode, FlowEdge } from '../types';

interface BuildWithAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFlow: (nodes: FlowNode[], edges: FlowEdge[]) => void;
  currentNodes: FlowNode[];
  currentEdges: FlowEdge[];
}

export const BuildWithAiModal: React.FC<BuildWithAiModalProps> = ({
  isOpen,
  onClose,
  onApplyFlow,
  currentNodes,
  currentEdges
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{ text: string; flowData?: FlowSchema } | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setGeneratedResult(null);

    try {
      const fullPrompt = `Crie um fluxo completo e profissional para o seguinte objetivo do usuário: "${prompt}".\n
Garanta que os nós sejam organizados em sequência lógica (ex: Webhook/Start -> Processing/AI Agent -> HTTP/Database -> FileSave/Logger) com posições X e Y espaçadas (x: 50, 280, 510, 740... y: 150).
Inclua configurações ricas nos nós.`;

      const result = await generateFlowFromPrompt(fullPrompt, { logs: [], currentNodes, currentEdges });
      setGeneratedResult(result);
    } catch (e: any) {
      setGeneratedResult({
        text: `❌ Ocorreu um erro ao gerar o fluxo com a IA: ${e?.message || 'Erro de conexão'}`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (generatedResult?.flowData) {
      const flowNodes: FlowNode[] = generatedResult.flowData.nodes.map((n, idx) => ({
        id: n.id || `node-${Date.now()}-${idx}`,
        type: 'custom',
        position: n.position || { x: 50 + idx * 220, y: 150 },
        data: {
          label: n.label,
          type: n.type as any,
          config: n.config || {},
          status: 'IDLE' as any
        }
      }));

      const flowEdges: FlowEdge[] = generatedResult.flowData.edges.map((e, idx) => ({
        id: e.id || `edge-${Date.now()}-${idx}`,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: true,
        style: { strokeWidth: 3, stroke: '#3b82f6' }
      }));

      onApplyFlow(flowNodes, flowEdges);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-purple-500/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.25)] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-purple-900/40 bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-purple-500/30">
              ✨
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                BUILD WITH AI 2.0
              </h2>
              <p className="text-xs text-purple-300/80">
                Descreva seu sistema completo e a IA montará o workflow diretamente no Canvas.
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
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          <div>
            <label className="block text-xs font-black uppercase text-purple-400 tracking-wider mb-2">
              O que você deseja construir?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Exemplo: Crie um sistema de agendamento para uma clínica com login, pacientes, profissionais, agenda e painel administrativo."
              rows={4}
              className="w-full bg-slate-950 border border-purple-900/50 rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none leading-relaxed"
            />
          </div>

          {/* Prompt Presets */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exemplos Prontos:</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPrompt("Fluxo de Apresentação Automática MCP: Entrada com informações do produto -> IA analisa os dados -> MCP Notion/Figma seleciona e indica o melhor tema -> IA gera página HTML com apresentação automática estilo slides sem precisar de scroll -> Salva o arquivo HTML final.")}
                className="text-xs bg-purple-950/90 hover:bg-purple-900 text-purple-200 border border-purple-600/80 px-3 py-1.5 rounded-xl transition-all text-left font-bold shadow-sm shadow-purple-900/50"
              >
                🎬 Fluxo Apresentação Auto + MCP Tema
              </button>
              <button
                type="button"
                onClick={() => setPrompt("Sistema de agendamento para clínica com cadastro de paciente, verificação de horários e confirmação via WhatsApp/E-mail.")}
                className="text-xs bg-slate-800/80 hover:bg-purple-900/50 text-slate-300 hover:text-purple-200 border border-slate-700 hover:border-purple-600/60 px-3 py-1.5 rounded-xl transition-all text-left"
              >
                🏥 Agendamento Clínico
              </button>
              <button
                type="button"
                onClick={() => setPrompt("Pipeline de automação de Landing Page: entrada de briefing, IA Architect planeja, AI Developer gera código HTML/CSS, AI Reviewer testa e salva em arquivo.")}
                className="text-xs bg-slate-800/80 hover:bg-purple-900/50 text-slate-300 hover:text-purple-200 border border-slate-700 hover:border-purple-600/60 px-3 py-1.5 rounded-xl transition-all text-left"
              >
                🚀 Pipeline Multi-Agent Landing Page
              </button>
              <button
                type="button"
                onClick={() => setPrompt("Automação de Leads: Webhook recebe lead, AI Agent qualifica o perfil, Switch Router direciona para CRM ou Slack, e dispara notificação.")}
                className="text-xs bg-slate-800/80 hover:bg-purple-900/50 text-slate-300 hover:text-purple-200 border border-slate-700 hover:border-purple-600/60 px-3 py-1.5 rounded-xl transition-all text-left"
              >
                ⚡ Qualificador de Leads & Router
              </button>
            </div>
          </div>

          {/* Result Output */}
          {generatedResult && (
            <div className="bg-slate-950 border border-purple-800/50 rounded-2xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Resultado do Raciocínio da IA
                </span>
                {generatedResult.flowData && (
                  <span className="text-[10px] font-mono bg-purple-900/60 text-purple-200 px-2 py-0.5 rounded-md">
                    {generatedResult.flowData.nodes.length} Nós • {generatedResult.flowData.edges.length} Conexões
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {generatedResult.text}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-purple-600/30 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  Gerando Workflow...
                </>
              ) : (
                <>
                  <span>✨ Gerar Workflow</span>
                </>
              )}
            </button>

            {generatedResult?.flowData && (
              <button
                onClick={handleApply}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center gap-2"
              >
                <span>✓ Inserir no Canvas</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
