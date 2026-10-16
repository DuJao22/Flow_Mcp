
import React, { useState, useEffect } from 'react';
import { keyManager } from '../services/keyManager';
import { geminiModelDiscovery } from '../services/geminiModelDiscovery';

const KeyStatusPanel: React.FC = () => {
  const [status, setStatus] = useState(JSON.parse(keyManager.getStatus()));
  const [detectedModel, setDetectedModel] = useState<string>(geminiModelDiscovery.getDetectedModelSync());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const unsubKey = keyManager.subscribe((newStatusStr) => {
      setStatus(JSON.parse(newStatusStr));
    });
    const unsubModel = geminiModelDiscovery.subscribe((res) => {
      setDetectedModel(res.detectedModel);
    });
    geminiModelDiscovery.discoverAvailableModels().catch(() => {});

    return () => {
      unsubKey();
      unsubModel();
    };
  }, []);

  const keyDetails = keyManager.getAllKeysStatus();
  const warningMsg = keyManager.getLastWarning();

  return (
    <div className="relative flex items-center">
      <div 
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border cursor-pointer transition-all shrink-0 ${
          warningMsg 
            ? 'bg-amber-950/90 hover:bg-amber-900 border-amber-500/80 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
            : 'bg-gray-800/90 hover:bg-gray-700 border-gray-700'
        }`}
        title="Status do Pool de Chaves e Cota"
      >
        <div className="flex -space-x-1 shrink-0">
            {keyDetails.slice(0, 4).map((k) => (
                <div 
                    key={k.index} 
                    className={`w-2 h-2 rounded-full border border-gray-900 ${k.isFailed ? 'bg-red-500' : k.isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}
                />
            ))}
            {keyDetails.length > 4 && <div className="text-[8px] text-gray-500 pl-1 font-mono">+{keyDetails.length - 4}</div>}
        </div>
        <div className="flex flex-col">
            <span className="text-[8px] sm:text-[9px] font-black text-gray-300 leading-none flex items-center gap-1 uppercase tracking-tight">
              KEY STATUS {warningMsg && <span className="bg-amber-500/30 text-amber-300 border border-amber-400/50 px-1 rounded text-[8px] sm:text-[9px] font-bold animate-pulse">⚠️ COTA</span>}
            </span>
            <span className={`text-[9px] sm:text-[10px] font-mono font-bold leading-tight ${status.healthy > 0 ? 'text-green-400' : 'text-red-400'}`}>
                #{status.current + 1} ({status.healthy}/{status.total})
            </span>
        </div>
      </div>

      {showDetails && (
        <div className="fixed sm:absolute top-14 sm:top-full right-4 sm:right-0 mt-1 w-[calc(100vw-2rem)] sm:w-72 bg-gray-900/95 border border-purple-800/60 backdrop-blur-xl rounded-xl shadow-2xl z-[999] p-3.5 animate-fade-in-up font-sans">
          {warningMsg && (
            <div className="bg-amber-950/90 border border-amber-500/80 p-2.5 rounded-lg text-[10px] text-amber-200 mb-3 flex flex-col gap-1 shadow-md">
              <span className="font-black text-amber-300 flex items-center gap-1 uppercase">⚠️ AVISO DE TOKENS / COTA (429):</span>
              <p className="leading-snug text-amber-100 font-medium">{warningMsg}</p>
            </div>
          )}

          <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-800">
             <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
               <span>🔑 Pool de Chaves API</span>
             </h4>
             <button 
                onClick={() => keyManager.reset()}
                className="text-[10px] font-bold bg-purple-700 hover:bg-purple-600 text-white px-2 py-0.5 rounded-md transition-colors shadow-sm"
             >
                Resetar Falhas
             </button>
          </div>

          {/* BADGE DE VERSÃO DETECTADA AUTOMATICAMENTE */}
          <div className="bg-slate-950/80 border border-purple-500/30 rounded-lg p-2.5 mb-3 text-[10px] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-purple-400">⚡</span>
              <span className="text-gray-400 font-medium">Modelo Ativo:</span>
            </div>
            <span className="text-purple-300 font-mono font-bold bg-purple-950/80 px-2 py-0.5 rounded border border-purple-700/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {detectedModel}
            </span>
          </div>
          
          <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {keyDetails.map((k) => (
              <div key={k.index} className={`flex items-center justify-between p-2 rounded-lg border text-xs ${k.isActive ? 'bg-purple-950/60 border-purple-500/50' : 'bg-gray-800/60 border-gray-700/60'}`}>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${k.isFailed ? 'bg-red-500' : k.isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
                    <span className="text-[11px] font-mono font-bold text-gray-200">Chave #{k.index + 1}</span>
                </div>
                <span className={`text-[10px] font-black ${k.isFailed ? 'text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/60' : k.isActive ? 'text-green-400 bg-green-950/60 px-1.5 py-0.5 rounded border border-green-800/60' : 'text-gray-400'}`}>
                    {k.isFailed ? 'ESGOTADA / COTA' : k.isActive ? 'ATIVA' : 'STANDBY'}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-3 pt-2 border-t border-gray-800 text-[9px] text-gray-400 font-medium italic leading-normal">
            O sistema alterna para a próxima chave quando uma cota atinge o limite (Erro 429).
          </div>
        </div>
      )}
    </div>
  );
};

export default KeyStatusPanel;
