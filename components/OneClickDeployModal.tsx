import React, { useState, useEffect } from 'react';
import { 
  DeploymentResult, 
  DeploymentPlatform, 
  DeploymentProjectFile 
} from '../types';
import { deployService } from '../services/deployService';
import { keyManager } from '../services/keyManager';

interface OneClickDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  files: DeploymentProjectFile[];
  onOpenVariablesModal?: (serverType: string, variableKey?: string) => void;
}

export const OneClickDeployModal: React.FC<OneClickDeployModalProps> = ({
  isOpen,
  onClose,
  projectName,
  files,
  onOpenVariablesModal
}) => {
  const [platform, setPlatform] = useState<DeploymentPlatform>('vercel');
  const [repoName, setRepoName] = useState(
    projectName ? projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-') : 'my-awesome-site'
  );
  const [isPrivateRepo, setIsPrivateRepo] = useState(false);
  const [commitMsg, setCommitMsg] = useState('feat: release landing page via Flow Architect AI');
  const [isDeploying, setIsDeploying] = useState(false);
  const [currentResult, setCurrentResult] = useState<DeploymentResult | null>(null);
  const [activeTab, setActiveTab] = useState<'configure' | 'logs' | 'history'>('configure');
  const [history, setHistory] = useState<DeploymentResult[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHistory(deployService.getHistory());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasGithubKey = !!keyManager.getIntegrationKey('github');
  const hasVercelKey = !!keyManager.getIntegrationKey('vercel');

  const handleStartDeploy = async () => {
    setIsDeploying(true);
    setActiveTab('logs');
    setCurrentResult(null);

    try {
      const res = await deployService.deployProject({
        projectName: repoName || projectName || 'flow-site',
        files,
        platform,
        githubConfig: {
          repo: repoName,
          isPrivate: isPrivateRepo,
          commitMessage: commitMsg
        }
      });
      setCurrentResult(res);
      setHistory(deployService.getHistory());
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 flex items-center justify-center text-2xl shadow-lg">
              🚀
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-wide">
                  ONE-CLICK DEPLOYMENT & GITHUB PIPELINE
                </h3>
                <span className="text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  Phase 5
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sincronização com GitHub Repositories e publicação serverless em produção na Vercel Edge.
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

        {/* TABS */}
        <div className="px-6 pt-4 border-b border-slate-800 flex gap-2 bg-slate-950/40">
          <button
            type="button"
            onClick={() => setActiveTab('configure')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              activeTab === 'configure'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚙️ Configurar Publicação
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              activeTab === 'logs'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📜 Pipeline Status & Logs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 ${
              activeTab === 'history'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🕒 Histórico ({history.length})
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: CONFIGURE */}
          {activeTab === 'configure' && (
            <div className="space-y-6">
              
              {/* PLATFORM SELECTOR */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Plataforma de Hospedagem Alvo</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setPlatform('vercel')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      platform === 'vercel'
                        ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">▲</span>
                      <span className="text-[10px] font-mono uppercase bg-black text-white px-2 py-0.5 rounded font-bold">
                        Recommended
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-bold text-white">Vercel Edge Network</div>
                    <div className="text-[11px] text-slate-400">Deploy serverless ultrarrápido com CDN global e SSL automático.</div>
                  </div>

                  <div
                    onClick={() => setPlatform('github_pages')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      platform === 'github_pages'
                        ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">🐙</span>
                      <span className="text-[10px] font-mono text-slate-400">Static Host</span>
                    </div>
                    <div className="mt-2 text-xs font-bold text-white">GitHub Pages / Repos</div>
                    <div className="text-[11px] text-slate-400">Hospedagem estática direta pelo branch gh-pages ou main.</div>
                  </div>
                </div>
              </div>

              {/* GITHUB REPO CONFIG */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🐙</span>
                    <span className="text-xs font-bold text-white">Configuração do Repositório GitHub</span>
                  </div>
                  {onOpenVariablesModal && (
                    <button
                      type="button"
                      onClick={() => onOpenVariablesModal('github', 'GITHUB_PERSONAL_ACCESS_TOKEN')}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono"
                    >
                      {hasGithubKey ? '✅ Token Conectado' : '⚙️ Configurar Token GitHub'}
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Nome do Repositório</label>
                    <input
                      type="text"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      placeholder="meu-website-incrivel"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Mensagem de Commit</label>
                    <input
                      type="text"
                      value={commitMsg}
                      onChange={(e) => setCommitMsg(e.target.value)}
                      placeholder="feat: launch initial landing page"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="privateRepoCheckbox"
                      checked={isPrivateRepo}
                      onChange={(e) => setIsPrivateRepo(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="privateRepoCheckbox" className="text-xs text-slate-300 cursor-pointer">
                      Criar como Repositório Privado no GitHub
                    </label>
                  </div>
                </div>
              </div>

              {/* STATS DE ARQUIVOS */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-400">Pacote de Produção:</span>
                <span className="font-mono text-emerald-400 font-bold">{files.length} arquivo(s) prontos para deploy</span>
              </div>

            </div>
          )}

          {/* TAB 2: LOGS & STATUS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              
              {isDeploying && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-2xl flex items-center gap-3 animate-pulse">
                  <div className="w-5 h-5 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
                  <div>
                    <div className="text-xs font-bold text-emerald-300">Pipeline de Deploy em Execução...</div>
                    <div className="text-[11px] text-slate-400">Compilando bundle, commitando no Git e enviando para Edge CDN.</div>
                  </div>
                </div>
              )}

              {currentResult && (
                <div className="p-5 bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-slate-900 border border-emerald-500/60 rounded-3xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎉</span>
                      <div>
                        <div className="text-xs font-bold text-emerald-400 font-mono uppercase">Deploy Concluído</div>
                        <div className="text-sm font-black text-white">Website Publicado com Sucesso!</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-900 text-emerald-300 border border-emerald-700 font-bold">
                      LIVE IN PRODUCTION
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                    <div className="overflow-hidden">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Link de Produção:</span>
                      <a 
                        href={currentResult.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs font-mono text-emerald-400 hover:underline truncate block"
                      >
                        {currentResult.url}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentResult.url)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
                      >
                        {copiedLink ? '✓ Copiado!' : 'Copiar'}
                      </button>
                      <a
                        href={currentResult.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <span>Abrir</span>
                        <span>↗</span>
                      </a>
                    </div>
                  </div>

                  {currentResult.githubRepoUrl && (
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-slate-400">Repositório no GitHub:</span>
                      <a 
                        href={currentResult.githubRepoUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-cyan-400 hover:underline font-mono"
                      >
                        {currentResult.githubRepoUrl} ↗
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* LOGS CONSOLE */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">Log de Execução:</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px]">
                  {currentResult?.logs ? (
                    currentResult.logs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-slate-300">
                        <span className="text-slate-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className="text-emerald-400 font-bold">{log.stage.toUpperCase()}:</span>
                        <span>{log.message}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500">Aguardando início da pipeline...</div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400 space-y-2">
                  <div className="text-3xl">📂</div>
                  <div>Nenhum deploy realizado ainda.</div>
                </div>
              ) : (
                history.map((dep) => (
                  <div key={dep.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{dep.platform.toUpperCase()}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(dep.deployedAt).toLocaleString()}
                        </span>
                      </div>
                      <a href={dep.url} target="_blank" rel="noreferrer" className="text-xs font-mono text-emerald-400 hover:underline truncate block">
                        {dep.url}
                      </a>
                    </div>

                    <a
                      href={dep.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all shrink-0"
                    >
                      Visitar ↗
                    </a>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-slate-800 flex items-center justify-between bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
          >
            Fechar
          </button>

          {activeTab === 'configure' && (
            <button
              type="button"
              onClick={handleStartDeploy}
              disabled={isDeploying || files.length === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2"
            >
              {isDeploying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Publicando...</span>
                </>
              ) : (
                <>
                  <span>🚀 Publicar Website Agora (One-Click)</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
