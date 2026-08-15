import React, { useState } from 'react';
import { FlowNode, FlowEdge, NodeType, NodeStatus } from '../types';

interface SubflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  subflowNode: FlowNode | null;
  onSaveSubflow: (nodeId: string, internalNodes: FlowNode[], internalEdges: FlowEdge[]) => void;
}

export const SubflowModal: React.FC<SubflowModalProps> = ({
  isOpen,
  onClose,
  subflowNode,
  onSaveSubflow
}) => {
  if (!isOpen || !subflowNode) return null;

  const initialData = subflowNode.data.subflowData || {
    nodes: [
      { id: 'sub-node-1', type: 'custom', position: { x: 50, y: 100 }, data: { label: 'Subflow Start', type: NodeType.START, status: NodeStatus.IDLE, config: {} } },
      { id: 'sub-node-2', type: 'custom', position: { x: 280, y: 100 }, data: { label: 'Copy Agent', type: NodeType.AI_AGENT, status: NodeStatus.IDLE, config: { role: 'Copywriter Agent' } } },
      { id: 'sub-node-3', type: 'custom', position: { x: 510, y: 100 }, data: { label: 'Code Reviewer', type: NodeType.AI_EVALUATOR, status: NodeStatus.IDLE, config: { criteria: 'Validação de sintaxe' } } }
    ],
    edges: [
      { id: 'sub-edge-1', source: 'sub-node-1', target: 'sub-node-2', type: 'smoothstep', animated: true, style: { strokeWidth: 3, stroke: '#3b82f6' } },
      { id: 'sub-edge-2', source: 'sub-node-2', target: 'sub-node-3', type: 'smoothstep', animated: true, style: { strokeWidth: 3, stroke: '#3b82f6' } }
    ]
  };

  const [internalNodes, setInternalNodes] = useState<FlowNode[]>(initialData.nodes);
  const [internalEdges, setInternalEdges] = useState<FlowEdge[]>(initialData.edges);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>(NodeType.AI_AGENT);

  const handleAddInternalNode = () => {
    if (!newNodeLabel.trim()) return;
    const newId = `sub-node-${Date.now()}`;
    const newNode: FlowNode = {
      id: newId,
      type: 'custom',
      position: { x: 50 + internalNodes.length * 200, y: 150 },
      data: {
        label: newNodeLabel.trim(),
        type: newNodeType,
        status: NodeStatus.IDLE,
        config: {}
      }
    };

    setInternalNodes(prev => [...prev, newNode]);
    setNewNodeLabel('');
  };

  const handleRemoveNode = (id: string) => {
    setInternalNodes(prev => prev.filter(n => n.id !== id));
    setInternalEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
  };

  const handleSave = () => {
    onSaveSubflow(subflowNode.id, internalNodes, internalEdges);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-blue-500/50 rounded-3xl w-full max-w-3xl overflow-hidden shadow-[0_0_60px_rgba(59,130,246,0.25)] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-blue-900/40 bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-blue-500/30">
              📂
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                SUBFLOW: {subflowNode.data.label}
              </h2>
              <p className="text-xs text-blue-300/80">
                Encapsulamento de sub-rotina visual. Edite e organize os nós internos da sub-rotina.
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
          
          {/* Add Internal Node Bar */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-black uppercase text-blue-400 tracking-wider block">
              Adicionar Novo Nó Interno ao Subflow
            </span>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newNodeLabel}
                onChange={(e) => setNewNodeLabel(e.target.value)}
                placeholder="Nome do Nó Interno..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
              <select
                value={newNodeType}
                onChange={(e) => setNewNodeType(e.target.value as NodeType)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
              >
                <option value={NodeType.AI_AGENT}>🤖 AI Agent</option>
                <option value={NodeType.AI_PROMPT}>💡 AI Prompt</option>
                <option value={NodeType.AI_EVALUATOR}>🧪 AI Evaluator</option>
                <option value={NodeType.HTTP_REQUEST}>📦 HTTP Request</option>
                <option value={NodeType.FILE_SAVE}>💾 File Save</option>
              </select>
              <button
                onClick={handleAddInternalNode}
                disabled={!newNodeLabel.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shrink-0"
              >
                + Adicionar
              </button>
            </div>
          </div>

          {/* Internal Nodes List */}
          <div className="space-y-2">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Nós do Subflow ({internalNodes.length})
            </span>
            <div className="grid grid-cols-1 gap-2">
              {internalNodes.map((node, idx) => (
                <div key={node.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-500">#{idx + 1}</span>
                    <div>
                      <div className="text-xs font-bold text-white">{node.data.label}</div>
                      <div className="text-[10px] font-mono text-blue-400 uppercase">{node.data.type}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveNode(node.id)}
                    className="text-slate-500 hover:text-rose-400 text-xs px-2 py-1 rounded-md transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              ))}
            </div>
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
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-2"
          >
            <span>✓ Salvar Subflow</span>
          </button>
        </div>

      </div>
    </div>
  );
};
