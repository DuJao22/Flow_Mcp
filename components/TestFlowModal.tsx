import React, { useState } from 'react';
import { FlowNode, FlowEdge } from '../types';

interface TestFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunTest: (inputData: any) => void;
  nodes: FlowNode[];
  edges: FlowEdge[];
  isExecuting: boolean;
}

export const TestFlowModal: React.FC<TestFlowModalProps> = ({
  isOpen,
  onClose,
  onRunTest,
  nodes,
  edges,
  isExecuting
}) => {
  const [inputJson, setInputJson] = useState<string>(JSON.stringify({
    name: "João Layon",
    email: "teste@flowarchitect.ai",
    product: "Mini SaaS Pro",
    type: "lead"
  }, null, 2));

  const [jsonError, setJsonError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExecute = () => {
    try {
      const parsed = JSON.parse(inputJson);
      setJsonError(null);
      onRunTest(parsed);
      onClose();
    } catch (e: any) {
      setJsonError("JSON inválido. Verifique a sintaxe antes de executar.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-teal-500/40 rounded-3xl w-full max-w-xl overflow-hidden shadow-[0_0_50px_rgba(20,184,166,0.25)] flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-teal-900/40 bg-gradient-to-r from-teal-950/80 via-slate-900 to-emerald-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-xl shadow-lg shadow-teal-500/30">
              🧪
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                TEST FLOW 2.0
              </h2>
              <p className="text-xs text-teal-300/80">
                Injete dados fictícios e simule a execução do workflow em ambiente isolado.
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
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase text-teal-400 tracking-wider">
                Payload de Entrada (JSON Mock)
              </label>
              <button
                onClick={() => setInputJson(JSON.stringify({
                  user: "cliente_demo",
                  orderId: "ORD-9821",
                  amount: 297.00,
                  status: "approved"
                }, null, 2))}
                className="text-[10px] text-teal-300 hover:underline"
              >
                Carregar Exemplo Vendas
              </button>
            </div>

            <textarea
              value={inputJson}
              onChange={(e) => {
                setInputJson(e.target.value);
                setJsonError(null);
              }}
              rows={8}
              className="w-full bg-slate-950 border border-teal-900/50 rounded-2xl p-4 text-xs font-mono text-teal-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none leading-relaxed"
            />
            {jsonError && (
              <p className="text-xs text-rose-400 mt-1.5 font-bold flex items-center gap-1">
                ⚠️ {jsonError}
              </p>
            )}
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="font-bold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              Nós a serem testados: {nodes.length} nós
            </div>
            <p className="text-[11px] text-slate-400">
              O payload configurado acima entrará no nó inicial e poderá ser referenciado como <code className="text-teal-300">{"{{input.field}}"}</code> em todo o fluxo.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white px-6 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-teal-600/30 active:scale-95 transition-all flex items-center gap-2"
          >
            <span>🧪 Executar Teste Agora</span>
          </button>
        </div>

      </div>
    </div>
  );
};
