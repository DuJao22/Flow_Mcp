import React, { useState, useEffect } from 'react';
import { DeploymentResult, DeploymentPlatform, DeploymentProjectFile } from '../types';
import { deployService } from '../services/deployService';
import { keyManager } from '../services/keyManager';

interface DeployPipelineViewProps {
  onOpenVariablesModal?: (serverType: string, variableKey?: string) => void;
}

export const DeployPipelineView: React.FC<DeployPipelineViewProps> = ({
  onOpenVariablesModal
}) => {
  const [platform, setPlatform] = useState<DeploymentPlatform>('vercel');
  const [projectName, setProjectName] = useState('flow-architect-site');
  const [commitMessage, setCommitMessage] = useState('feat: deploy production build via Flow Architect AI');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [activeTab, setActiveTab] = useState<'deploy' | 'history' | 'mcp_spec'>('deploy');
  const [currentResult, setCurrentResult] = useState<DeploymentResult | null>(null);
  const [history, setHistory] = useState<DeploymentResult[]>([]);
  const [sampleFiles, setSampleFiles] = useState<DeploymentProjectFile[]>([
    {
      path: 'index.html',
      content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flow Architect AI Site</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between">
  <header class="w-full border-b border-slate-800 p-6 flex justify-between items-center max-w-7xl mx-auto">
    <div class="text-xl font-bold text-emerald-400">Flow Architect Site</div>
    <button class="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs">Acessar App</button>
  </header>
  <main class="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
    <h1 class="text-5xl font-black">Publicado via Flow Architect MCP Pipeline</h1>
    <p class="text-slate-400 text-lg">Site em produção conectado ao GitHub e distribuído globalmente na Edge Vercel.</p>
  </main>
  <footer class="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
    © 2026 Flow Architect AI. Todos os direitos reservados.
  </footer>
</body>
</html>`
    }
  ]);

  useEffect(() => {
    setHistory(deployService.getHistory());
  }, []);

  const hasGithubToken = !!keyManager.getIntegrationKey('github');
  const hasVercelToken = !!keyManager.getIntegrationKey('vercel');

  const handleExecuteDeploy = async () => {
    setIsDeploying(true);
    setCurrentResult(null);

    try {
      const res = await deployService.deployProject({
        projectName,
        files: sampleFiles,
        platform,
        githubConfig: {
          repo: projectName,
          isPrivate,
          commitMessage
        }
      });

      setCurrentResult(res);
      setHistory(deployService.getHistory());
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER BANNER */}
      <div className="p-6 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-800/40 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 flex items-center justify-center text-3xl shadow-lg border border-emerald-400/30">
              🚀
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-white tracking-wide">
                  GITHUB & VERCEL MCP DEPLOY PIPELINE
                </h2>
                <span className="text-[10px] font-mono uppercase bg-emerald-900/80 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full font-bold">
                  FASE 5 • ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Pipeline unificada de CI/CD: criação automática de repositórios no GitHub, commits atômicos de código e publicação instantânea na Vercel Edge.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenVariablesModal && (
              <button
                type="button"
                onClick={() => onOpenVariablesModal('github', 'GITHUB_PERSONAL_ACCESS_TOKEN')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
              >
                <span>⚙️</span>
                <span>Configurar Chaves</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExecuteDeploy}
              disabled={isDeploying}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isDeploying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Publicando no Edge...</span>
                </>
              ) : (
                <>
                  <span>🚀 Publicar em Produção</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* SUB TABS */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('deploy')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'deploy' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ Pipeline One-Click
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🕒 Deploys em Produção ({history.length})
          </button>
          <button
            onClick={() => setActiveTab('mcp_spec')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'mcp_spec' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🛠️ MCP Tool Specs
          </button>
        </div>
      </div>

      {/* TAB: DEPLOY */}
      {activeTab === 'deploy' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* GITHUB CARD */}
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🐙</span>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">GitHub MCP Node</h3>
                    <p className="text-[11px] text-slate-400">Repositório & Versionamento</p>
                  </div>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  hasGithubToken ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}>
                  {hasGithubToken ? 'CONECTADO' : 'DEV MODE'}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Nome do Repositório</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Commit Message</label>
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="privBox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="privBox" className="text-xs text-slate-300 cursor-pointer">
                    Repositório Privado
                  </label>
                </div>
              </div>
            </div>

            {/* VERCEL CARD */}
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">▲</span>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Vercel Edge Node</h3>
                    <p className="text-[11px] text-slate-400">Serverless CDN & Global Deployment</p>
                  </div>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  hasVercelToken ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}>
                  {hasVercelToken ? 'CONECTADO' : 'AUTO PREVIEW'}
                </span>
              </div>

              <div className="space-y-3 text-xs text-slate-400">
                <p>• Otimização automática de assets estáticos e Tailwind CSS.</p>
                <p>• Roteamento instantâneo via AnyCast Edge Network com SSL automático.</p>
                <p>• Suporte para custom domains e preview branches.</p>
                <div className="pt-2">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl font-mono text-[11px] text-emerald-400">
                    URL Alvo: https://{projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.vercel.app
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* DEPLOY RESULT DISPLAY */}
          {currentResult && (
            <div className="p-6 bg-slate-950 border border-emerald-500/60 rounded-3xl space-y-4 animate-fadeIn shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎉</span>
                  <div>
                    <h3 className="text-base font-black text-white">Deploy Realizado com Sucesso!</h3>
                    <p className="text-xs text-slate-400">Website acessível publicamente em produção.</p>
                  </div>
                </div>
                <a
                  href={currentResult.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
                >
                  <span>Abrir Website</span>
                  <span>↗</span>
                </a>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Logs da Pipeline:</span>
                <div className="space-y-1 font-mono text-[11px]">
                  {currentResult.logs.map((l, i) => (
                    <div key={i} className="flex items-start gap-2 text-slate-300">
                      <span className="text-emerald-400">[{l.stage.toUpperCase()}]</span>
                      <span>{l.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: HISTORY */}
      {activeTab === 'history' && (
        <div className="p-6 bg-slate-950 border border-slate-800 rounded-3xl space-y-4">
          <h3 className="text-sm font-bold text-white">Histórico de Publicações</h3>
          {history.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">Nenhum deploy realizado ainda.</div>
          ) : (
            <div className="space-y-2.5">
              {history.map((h) => (
                <div key={h.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{h.platform.toUpperCase()}</span>
                      <span className="text-[10px] font-mono text-slate-500">{new Date(h.deployedAt).toLocaleString()}</span>
                    </div>
                    <a href={h.url} target="_blank" rel="noreferrer" className="text-xs font-mono text-emerald-400 hover:underline">
                      {h.url}
                    </a>
                  </div>
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Abrir ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: MCP SPECS */}
      {activeTab === 'mcp_spec' && (
        <div className="p-6 bg-slate-950 border border-slate-800 rounded-3xl space-y-4">
          <h3 className="text-sm font-bold text-white">GitHub & Vercel MCP Tools</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <div className="text-xs font-bold text-emerald-400 font-mono">github_create_or_update_file</div>
              <p className="text-xs text-slate-400">Commits atômicos na árvore de arquivos do repositório no branch main/master.</p>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <div className="text-xs font-bold text-emerald-400 font-mono">vercel_create_deployment</div>
              <p className="text-xs text-slate-400">Upload de pacote estático e distribuição instantânea na rede Anycast CDN.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
