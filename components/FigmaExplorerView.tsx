import React, { useState, useEffect } from 'react';
import { 
  FigmaFileSummary, 
  FigmaDesignTokens, 
  FigmaDevModeInspection, 
  FigmaFrameSummary,
  IntegrationCategory
} from '../types';
import { figmaService } from '../services/figmaService';
import { userVariablesManager } from '../services/userVariablesManager';
import { VariableGearButton } from './VariableGearButton';

interface FigmaExplorerViewProps {
  onOpenVariablesModal?: (category?: IntegrationCategory, varId?: string) => void;
}

export const FigmaExplorerView: React.FC<FigmaExplorerViewProps> = ({ onOpenVariablesModal }) => {
  const [figmaUrlOrKey, setFigmaUrlOrKey] = useState<string>(() => {
    return figmaService.getActiveFileKey() || '';
  });

  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isExtractingTokens, setIsExtractingTokens] = useState(false);
  const [isSyncingWithBrain, setIsSyncingWithBrain] = useState(false);
  const [isInspectingNode, setIsInspectingNode] = useState(false);

  const [fileSummary, setFileSummary] = useState<FigmaFileSummary | null>(() => figmaService.getActiveFile());
  const [tokens, setTokens] = useState<FigmaDesignTokens | null>(() => figmaService.getActiveTokens());
  const [selectedFrame, setSelectedFrame] = useState<FigmaFrameSummary | null>(null);
  const [nodeInspection, setNodeInspection] = useState<FigmaDevModeInspection | null>(null);

  const [activeTab, setActiveTab] = useState<'tokens' | 'frames' | 'devmode' | 'tailwind'>('tokens');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Escuta atualizações de variáveis caso o usuário mude o token no modal
  useEffect(() => {
    const handleVarsChange = () => {
      const savedKey = figmaService.getActiveFileKey();
      if (savedKey && !figmaUrlOrKey) {
        setFigmaUrlOrKey(savedKey);
      }
    };
    window.addEventListener('storage', handleVarsChange);
    return () => window.removeEventListener('storage', handleVarsChange);
  }, [figmaUrlOrKey]);

  const showStatus = (type: 'success' | 'error' | 'info', text: string, durationMs = 5000) => {
    setStatusMessage({ type, text });
    if (durationMs > 0) {
      setTimeout(() => {
        setStatusMessage((curr) => (curr?.text === text ? null : curr));
      }, durationMs);
    }
  };

  // 1. Busca e Carrega o Arquivo Figma
  const handleLoadFile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!figmaUrlOrKey.trim()) {
      showStatus('error', 'Insira uma URL ou File Key do Figma.');
      return;
    }

    const token = figmaService.getToken();
    if (!token) {
      showStatus('error', 'Token de Acesso do Figma não configurado. Clique na engrenagem ⚙️ para inserir seu token.');
      if (onOpenVariablesModal) {
        onOpenVariablesModal('figma', 'FIGMA_PERSONAL_ACCESS_TOKEN');
      }
      return;
    }

    setIsLoadingFile(true);
    setStatusMessage(null);

    try {
      const fileData = await figmaService.fetchFile(figmaUrlOrKey.trim());
      setFileSummary(fileData);
      showStatus('success', `Arquivo "${fileData.name}" carregado com sucesso! ${fileData.pages?.length || 0} página(s) encontradas.`);
      
      // Auto-dispara a extração de tokens se ainda não houver
      handleExtractTokens(fileData.key);
    } catch (err: any) {
      console.error('Erro ao carregar Figma:', err);
      showStatus('error', `Falha ao carregar arquivo: ${err.message || 'Verifique sua conexão e o token do Figma.'}`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  // 2. Extrai Tokens de Design
  const handleExtractTokens = async (fileKeyToUse?: string, targetNodeId?: string) => {
    const key = fileKeyToUse || fileSummary?.key || figmaUrlOrKey.trim();
    if (!key) {
      showStatus('error', 'Nenhum arquivo do Figma carregado para extrair tokens.');
      return;
    }

    setIsExtractingTokens(true);
    try {
      const extracted = await figmaService.extractTokens(key, targetNodeId);
      setTokens(extracted);
      showStatus('success', `Tokens extraídos com sucesso! ${extracted.colors.length} cores e ${extracted.typography.length} estilos tipográficos detectados.`);
    } catch (err: any) {
      console.error('Erro ao extrair tokens do Figma:', err);
      showStatus('error', `Erro na extração de tokens: ${err.message}`);
    } finally {
      setIsExtractingTokens(false);
    }
  };

  // 3. Sincroniza Tokens com o Cérebro da IA e Design Lab
  const handleSyncWithBrain = async () => {
    if (!tokens) {
      showStatus('error', 'Extraia os tokens de design primeiro.');
      return;
    }

    setIsSyncingWithBrain(true);
    try {
      const report = await figmaService.syncWithBrainAndDesignLab(tokens);
      showStatus('success', `Design Tokens sincronizados com sucesso com o Brain Engine e Design Lab! (${report.tokensCount.colors} cores, ${report.tokensCount.typography} tipografias).`);
    } catch (err: any) {
      console.error('Erro ao sincronizar com o Brain:', err);
      showStatus('error', `Falha na sincronização: ${err.message}`);
    } finally {
      setIsSyncingWithBrain(false);
    }
  };

  // 4. Inspeciona Frame no Dev Mode
  const handleInspectFrame = async (frame: FigmaFrameSummary) => {
    setSelectedFrame(frame);
    if (!fileSummary) return;

    setIsInspectingNode(true);
    setActiveTab('devmode');
    try {
      const inspection = await figmaService.inspectNode(fileSummary.key, frame.id);
      setNodeInspection(inspection);
    } catch (err: any) {
      console.error('Erro ao inspecionar nó:', err);
      showStatus('error', `Falha na inspeção do frame: ${err.message}`);
    } finally {
      setIsInspectingNode(false);
    }
  };

  const hasToken = !!figmaService.getToken();

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* HEADER PRINCIPAL */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 via-pink-500 to-orange-400 flex items-center justify-center text-2xl shadow-lg">
            🎨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-wide">
                FIGMA DEV MODE & TOKEN SYNC
              </h2>
              <span className="text-[10px] font-mono uppercase bg-violet-950 text-violet-300 border border-violet-800 px-2.5 py-0.5 rounded-full font-bold">
                MCP Phase 3
              </span>
              <VariableGearButton 
                onClick={() => onOpenVariablesModal && onOpenVariablesModal('figma', 'FIGMA_PERSONAL_ACCESS_TOKEN')}
                title="Configurar Access Token e Chave do Figma"
                size="sm"
              />
            </div>
            <p className="text-xs text-slate-400">
              Sincronização em tempo real de Design Tokens (Cores, Tipografia, Layout) e Inspeção Dev Mode direto no Cérebro da IA.
            </p>
          </div>
        </div>

        {/* STATUS DA AUTENTICAÇÃO */}
        <div className="flex items-center gap-2">
          {hasToken ? (
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold text-emerald-300">Figma Token Ativo</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenVariablesModal && onOpenVariablesModal('figma', 'FIGMA_PERSONAL_ACCESS_TOKEN')}
              className="flex items-center gap-2 bg-amber-950/60 border border-amber-800/80 hover:bg-amber-900/60 px-3 py-1.5 rounded-xl transition-all"
            >
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs font-mono font-bold text-amber-300">Inserir Token Figma ⚙️</span>
            </button>
          )}
        </div>
      </div>

      {/* STATUS NOTIFICATION ALERT */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl border text-xs font-medium flex items-center justify-between gap-3 shadow-lg transition-all animate-fadeIn ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
            : statusMessage.type === 'error'
            ? 'bg-rose-950/80 border-rose-800 text-rose-200'
            : 'bg-blue-950/80 border-blue-800 text-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            <span>{statusMessage.type === 'success' ? '✅' : statusMessage.type === 'error' ? '⚠️' : 'ℹ️'}</span>
            <span>{statusMessage.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* INPUT DO ARQUIVO / URL DO FIGMA */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <form onSubmit={handleLoadFile} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔗</span>
            <input
              type="text"
              value={figmaUrlOrKey}
              onChange={(e) => setFigmaUrlOrKey(e.target.value)}
              placeholder="Cole o link do Figma (ex: https://www.figma.com/design/xyz/Project ou a File Key)..."
              className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-2xl text-xs text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isLoadingFile || isExtractingTokens}
              className="flex-1 sm:flex-none px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isLoadingFile ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Carregando Arquivo...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Explorar Figma</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleExtractTokens()}
              disabled={isExtractingTokens || isLoadingFile || !figmaUrlOrKey.trim()}
              className="flex-1 sm:flex-none px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              title="Extrair cores, tipografia e espaçamentos"
            >
              {isExtractingTokens ? (
                <>
                  <div className="w-3 h-3 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                  <span>Extraindo...</span>
                </>
              ) : (
                <>
                  <span>⚡ Extrair Tokens</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* METADADOS DO ARQUIVO CARREGADO */}
        {fileSummary && (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-950 border border-violet-800 flex items-center justify-center text-sm font-bold text-violet-300">
                📄
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{fileSummary.name}</h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <span>Key: {fileSummary.key}</span>
                  <span>•</span>
                  <span>Versão: {fileSummary.version}</span>
                  <span>•</span>
                  <span>Modificado: {new Date(fileSummary.lastModified).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* BOTÃO DE SINCRONIZAÇÃO COM O BRAIN ENGINE */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncWithBrain}
                disabled={isSyncingWithBrain || !tokens}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2"
              >
                {isSyncingWithBrain ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Sincronizando com o Cérebro...</span>
                  </>
                ) : (
                  <>
                    <span>🧠</span>
                    <span>Sincronizar Tokens com Cérebro & Design Lab</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* NAVEGAÇÃO DE ABAS INTERNAS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('tokens')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'tokens'
              ? 'bg-violet-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🎨 Design Tokens</span>
          {tokens && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/30 font-mono">
              {tokens.colors.length + tokens.typography.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('frames')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'frames'
              ? 'bg-violet-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🖼️ Frames & Páginas</span>
          {fileSummary && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/30 font-mono">
              {fileSummary.pages.reduce((acc, p) => acc + p.frames.length, 0)}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('devmode')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'devmode'
              ? 'bg-violet-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>⚡ Dev Mode Inspector</span>
          {selectedFrame && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/30 font-mono truncate max-w-[100px]">
              {selectedFrame.name}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tailwind')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'tailwind'
              ? 'bg-violet-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📄 Tailwind Theme Config</span>
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}

      {/* ABA 1: DESIGN TOKENS EXTRAÍDOS */}
      {activeTab === 'tokens' && (
        <div className="space-y-6">
          {!tokens ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
              <div className="text-4xl">🎨</div>
              <h3 className="text-base font-bold text-white">Nenhum token extraído ainda</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Insira o link de um arquivo do Figma acima e clique em "Extrair Tokens" para mapear automaticamente a paleta de cores, tipografia, bordas e sombras.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* CARD DE PROVENIÊNCIA */}
              <div className="bg-slate-950 border border-violet-900/60 rounded-2xl p-3.5 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-violet-400 font-bold">Origem dos Tokens:</span>
                  <span className="text-white font-bold">{tokens.source.fileName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Componentes Detectados:</span>
                  <span className="text-violet-300 font-bold">{tokens.componentsDetected}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Estilos do Figma:</span>
                  <span className="text-violet-300 font-bold">{tokens.rawStylesCount}</span>
                </div>
              </div>

              {/* GRID DE CORES */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌈</span>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                      Paleta de Cores Mapeada ({tokens.colors.length})
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400">Classificação semântica automática</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {tokens.colors.map((color, idx) => (
                    <div 
                      key={idx}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2 hover:border-violet-500/60 transition-all cursor-pointer group"
                      onClick={() => {
                        navigator.clipboard.writeText(color.hex);
                        showStatus('info', `Cor ${color.hex} copiada para a área de transferência!`, 2000);
                      }}
                      title="Clique para copiar o código HEX"
                    >
                      <div 
                        className="w-full h-14 rounded-xl border border-slate-700/80 shadow-inner group-hover:scale-105 transition-transform"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-white uppercase">{color.hex}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            {color.usageCount}x
                          </span>
                        </div>
                        <span className="text-[10px] block text-violet-400 font-mono uppercase font-bold">
                          {color.semanticRole}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GRID DE TIPOGRAFIA */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔤</span>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                      Hierarquia Tipográfica ({tokens.typography.length})
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400">Fontes e tamanhos detectados</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tokens.typography.map((typo, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{typo.name}</span>
                        <span className="text-[10px] font-mono uppercase bg-violet-950 text-violet-300 border border-violet-800 px-2 py-0.5 rounded-full">
                          {typo.usage}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                        <p 
                          className="text-slate-200 truncate"
                          style={{
                            fontFamily: typo.fontFamily,
                            fontWeight: typo.fontWeight,
                            fontSize: `${Math.min(typo.fontSize, 20)}px`
                          }}
                        >
                          The quick brown fox jumps over the lazy dog
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-400 pt-1">
                        <span>Família: <strong className="text-slate-200">{typo.fontFamily}</strong></span>
                        <span>Tamanho: <strong className="text-slate-200">{typo.fontSize}px</strong></span>
                        <span>Peso: <strong className="text-slate-200">{typo.fontWeight}</strong></span>
                        <span>Line-Height: <strong className="text-slate-200">{typo.lineHeight}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ESPAÇAMENTOS E BORDAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* BORDAS / CORNER RADIUS */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span>🔘</span> Border Radii ({tokens.borders.length})
                  </h4>
                  <div className="space-y-2">
                    {tokens.borders.map((b, idx) => (
                      <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 border-2 border-violet-500 bg-violet-950/40"
                            style={{ borderRadius: `${b.radiusPx}px` }}
                          />
                          <div>
                            <span className="text-xs font-bold text-white">{b.name}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">{b.radiusPx}px</span>
                          </div>
                        </div>
                        <code className="text-xs bg-slate-900 text-violet-300 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
                          {b.tailwindRadius}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ESPAÇAMENTOS */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span>📐</span> Espaçamentos & Gaps ({tokens.spacings.length})
                  </h4>
                  <div className="space-y-2">
                    {tokens.spacings.slice(0, 6).map((sp, idx) => (
                      <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="h-3 bg-indigo-500 rounded"
                            style={{ width: `${Math.min(sp.valuePx * 2, 80)}px` }}
                          />
                          <span className="text-xs font-bold text-white">{sp.valuePx}px</span>
                        </div>
                        <code className="text-xs bg-slate-900 text-indigo-300 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
                          {sp.tailwindClass}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      )}

      {/* ABA 2: FRAMES & PÁGINAS DO FIGMA */}
      {activeTab === 'frames' && (
        <div className="space-y-6">
          {!fileSummary ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
              <div className="text-4xl">🖼️</div>
              <h3 className="text-base font-bold text-white">Nenhum arquivo carregado</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Insira o link de um arquivo do Figma acima para visualizar as páginas e frames.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {fileSummary.pages.map((page) => (
                <div key={page.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📄</span>
                      <h4 className="text-sm font-black text-white">{page.name}</h4>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{page.frames.length} Frame(s)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {page.frames.map((frame) => (
                      <div 
                        key={frame.id}
                        className={`bg-slate-950 border rounded-2xl p-4 space-y-3 transition-all cursor-pointer ${
                          selectedFrame?.id === frame.id ? 'border-violet-500 ring-1 ring-violet-500 bg-violet-950/20' : 'border-slate-800 hover:border-slate-700'
                        }`}
                        onClick={() => handleInspectFrame(frame)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="text-xs font-bold text-white truncate max-w-[180px]">{frame.name}</h5>
                            <span className="text-[10px] text-slate-500 font-mono block">ID: {frame.id}</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 text-slate-400 border border-slate-800 rounded-md">
                            {frame.type}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-900">
                          <span>{frame.width} × {frame.height} px</span>
                          <span>{frame.childCount} elementos</span>
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectFrame(frame);
                            }}
                            className="w-full py-1.5 bg-violet-950 hover:bg-violet-900 text-violet-300 border border-violet-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                          >
                            <span>⚡ Inspecionar no Dev Mode</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: DEV MODE INSPECTOR */}
      {activeTab === 'devmode' && (
        <div className="space-y-6">
          {!selectedFrame && !nodeInspection ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
              <div className="text-4xl">⚡</div>
              <h3 className="text-base font-bold text-white">Selecione um Frame para Inspecionar</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Acesse a aba "Frames & Páginas" e clique em "Inspecionar no Dev Mode" para inspecionar dimensões, estilos CSS calculados e classes Tailwind prontas para uso.
              </p>
            </div>
          ) : isInspectingNode ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
              <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Inspecionando nó do Figma e gerando código Tailwind...</p>
            </div>
          ) : nodeInspection ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              
              {/* HEADER DO NÓ INSPECIONADO */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-xl text-white shadow-lg">
                    ⚡
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-white">{nodeInspection.nodeName}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-violet-950 text-violet-300 border border-violet-800 rounded-full font-bold">
                        {nodeInspection.nodeType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      Dimensões: {nodeInspection.dimensions.width}px × {nodeInspection.dimensions.height}px
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(nodeInspection.htmlSnippet);
                    showStatus('info', 'Snippet HTML copiado!', 2000);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <span>📋 Copiar HTML</span>
                </button>
              </div>

              {/* TAILWIND SNIPPET */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-violet-400 font-mono uppercase">Classes Tailwind CSS:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(nodeInspection.tailwindSnippet);
                      showStatus('info', 'Classes Tailwind copiadas!', 2000);
                    }}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Copiar Classes
                  </button>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400 select-all overflow-x-auto">
                  {nodeInspection.tailwindSnippet || '/* Nenhuma classe calculada */'}
                </div>
              </div>

              {/* CSS RULES */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 font-mono uppercase">CSS Declarado:</span>
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1 overflow-x-auto">
                  {Object.entries(nodeInspection.cssRules).map(([prop, val]) => (
                    <div key={prop}>
                      <span className="text-violet-400">{prop}</span>: <span className="text-amber-300">{val}</span>;
                    </div>
                  ))}
                </div>
              </div>

              {/* HTML SNIPPET COMPLETO */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 font-mono uppercase">Snippet HTML & Componente:</span>
                <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                  {nodeInspection.htmlSnippet}
                </pre>
              </div>

            </div>
          ) : null}
        </div>
      )}

      {/* ABA 4: TAILWIND THEME CONFIG EXPORT */}
      {activeTab === 'tailwind' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚙️</span>
              <h4 className="text-sm font-black text-white">Configuração do Tailwind (tailwind.config.js)</h4>
            </div>
            <button
              type="button"
              onClick={() => {
                if (tokens) {
                  navigator.clipboard.writeText(JSON.stringify(tokens.tailwindThemeExtension, null, 2));
                  showStatus('info', 'Extensão do tema copiada para a área de transferência!', 2000);
                }
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono transition-all"
            >
              📋 Copiar Config
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Esta extensão de tema pode ser injetada diretamente no compilador Tailwind do Design Lab ou exportada para o seu projeto Next.js/Vite.
          </p>

          <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-violet-300 overflow-x-auto">
            {tokens ? JSON.stringify({ theme: { extend: tokens.tailwindThemeExtension } }, null, 2) : '// Extraia os tokens do Figma para visualizar a configuração'}
          </pre>
        </div>
      )}

    </div>
  );
};
