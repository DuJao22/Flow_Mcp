
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { NodeStatus, NodeType } from '../types';

const CustomNode = ({ data, isConnectable, selected }: NodeProps) => {
  const isRunning = data.status === NodeStatus.RUNNING;
  const isSuccess = data.status === NodeStatus.SUCCESS;
  const isError = data.status === NodeStatus.ERROR;

  const nodeType = (data.type || data.nodeType) as NodeType;

  // Icon & Type Specific Styling
  let nodeBadge = null;
  let typeColor = 'border-slate-800 bg-slate-900/90 text-slate-200';
  let typeIcon = '⚡';

  switch (nodeType) {
    case NodeType.AI_BRAIN:
      typeColor = 'border-purple-500/80 bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 shadow-[0_0_15px_rgba(168,85,247,0.25)]';
      typeIcon = '🧠';
      break;
    case NodeType.AI_AGENT:
      typeColor = 'border-cyan-500/80 bg-gradient-to-r from-cyan-950/70 via-slate-900 to-blue-950/70 shadow-[0_0_15px_rgba(6,182,212,0.25)]';
      typeIcon = '🤖';
      break;
    case NodeType.AI_PROMPT:
      typeColor = 'border-indigo-500/80 bg-gradient-to-r from-indigo-950/70 via-slate-900 to-violet-950/70';
      typeIcon = '💡';
      break;
    case NodeType.MULTI_AGENT:
      typeColor = 'border-amber-500/80 bg-gradient-to-r from-amber-950/70 via-slate-900 to-orange-950/70 shadow-[0_0_15px_rgba(245,158,11,0.25)]';
      typeIcon = '👥';
      break;
    case NodeType.AI_EVALUATOR:
      typeColor = 'border-emerald-500/80 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70';
      typeIcon = '🧪';
      break;
    case NodeType.AI_LOOP:
      typeColor = 'border-pink-500/80 bg-gradient-to-r from-pink-950/70 via-slate-900 to-fuchsia-950/70';
      typeIcon = '🔄';
      break;
    case NodeType.SUBFLOW:
      typeColor = 'border-blue-500/80 bg-gradient-to-r from-blue-950/70 via-slate-900 to-sky-950/70';
      typeIcon = '📂';
      break;
    case NodeType.SWITCH_ROUTER:
      typeColor = 'border-amber-500/80 bg-slate-900';
      typeIcon = '🔀';
      break;
    case NodeType.ANALYZE_PAGE:
      typeColor = 'border-purple-500/80 bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70';
      typeIcon = '🔍';
      break;
    case NodeType.IMPROVE_PAGE:
      typeColor = 'border-pink-500/80 bg-gradient-to-r from-pink-950/70 via-slate-900 to-purple-950/70 shadow-[0_0_15px_rgba(236,72,153,0.25)]';
      typeIcon = '✨';
      break;
    case NodeType.GENERATE_MOTION:
      typeColor = 'border-violet-500/80 bg-slate-900';
      typeIcon = '🎬';
      break;
    case NodeType.TEST_RESPONSIVE:
      typeColor = 'border-cyan-500/80 bg-slate-900';
      typeIcon = '📱';
      break;
    case NodeType.AI_CRITIC:
      typeColor = 'border-rose-500/80 bg-gradient-to-r from-rose-950/70 via-slate-900 to-pink-950/70';
      typeIcon = '🔍';
      break;
    case NodeType.BROWSER_PREVIEW:
      typeColor = 'border-blue-500/80 bg-slate-900';
      typeIcon = '🌐';
      break;
    case NodeType.HTTP_REQUEST:
      typeColor = 'border-emerald-500/80 bg-slate-900';
      typeIcon = '📦';
      break;
    case NodeType.IF_CONDITION:
      typeColor = 'border-amber-500/80 bg-slate-900';
      typeIcon = '⚖️';
      break;
    case NodeType.FILE_SAVE:
      typeColor = 'border-blue-500/80 bg-slate-900';
      typeIcon = '💾';
      break;
    case NodeType.START:
      typeColor = 'border-emerald-500 bg-slate-900';
      typeIcon = '🟢';
      break;
    case NodeType.WEBHOOK:
      typeColor = 'border-teal-500 bg-slate-900';
      typeIcon = '⚡';
      break;
    default:
      typeColor = 'border-slate-800 bg-slate-900/90';
      typeIcon = '⚙️';
      break;
  }

  // Status Overrides
  let statusStyles = typeColor;
  let statusLabel = null;
  let statusIcon = null;

  switch (data.status as NodeStatus) {
    case NodeStatus.RUNNING:
      statusStyles = 'border-amber-400 bg-gradient-to-r from-amber-950/90 via-slate-900 to-yellow-950/90 shadow-[0_0_25px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/80 z-50';
      statusLabel = (
        <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-50">
             <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xl flex items-center gap-1 border border-amber-200">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-950"></span>
                </span>
                EXECUTANDO
             </span>
        </div>
      );
      statusIcon = (
        <div className="relative flex items-center justify-center mr-2 shrink-0">
          <div className="animate-spin h-3.5 w-3.5 border-2 border-amber-400 border-t-transparent rounded-full"></div>
        </div>
      );
      break;

    case NodeStatus.SUCCESS:
      statusStyles = `${typeColor} border-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.3)]`;
      statusIcon = <span className="text-emerald-400 mr-2 font-black text-xs">✓</span>;
      break;

    case NodeStatus.ERROR:
      statusStyles = 'border-rose-500 bg-slate-900/95 shadow-[0_0_18px_rgba(244,63,94,0.4)]';
      statusIcon = <span className="text-rose-400 mr-2 font-black text-xs">✕</span>;
      statusLabel = (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-50">
             <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md border border-rose-400">
                ERRO
             </span>
        </div>
      );
      break;

    case NodeStatus.IDLE:
    default:
      if (selected) {
          statusStyles = `${typeColor} ring-2 ring-indigo-500/80 shadow-2xl`;
      }
      if (!statusIcon) {
          statusIcon = <span className="mr-2 text-xs">{typeIcon}</span>;
      }
      break;
  }

  const stats = data.executionStats;

  return (
    <div className="relative group">
      {/* Pulse backdrop */}
      {isRunning && (
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 opacity-50 blur-sm animate-pulse pointer-events-none" />
      )}

      <div className={`px-3.5 py-2.5 rounded-2xl border-2 min-w-[190px] transition-all duration-200 relative backdrop-blur-xl ${statusStyles}`}>
        
        {statusLabel}

        <div className="flex items-center">
          {statusIcon}
          <div className="flex flex-col overflow-hidden">
            <div className="text-xs font-black text-slate-100 truncate max-w-[140px]" title={data.label}>
              {data.label}
            </div>
            <div className="text-[8px] text-slate-400 uppercase tracking-widest font-mono font-bold mt-0.5 flex items-center gap-1">
              <span>{nodeType || 'NODE'}</span>
              {stats && (
                <span className="text-indigo-400 font-normal">
                  • {stats.latencyMs}ms ({stats.tokens}t)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Inputs (Top) */}
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          className="w-3 h-3 bg-indigo-500 border-2 border-slate-950 hover:bg-white transition-colors"
        />

        {/* Outputs (Bottom) */}
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={isConnectable}
          className="w-3 h-3 bg-indigo-500 border-2 border-slate-950 hover:bg-white transition-colors"
        />
      </div>
    </div>
  );
};

export default memo(CustomNode);
