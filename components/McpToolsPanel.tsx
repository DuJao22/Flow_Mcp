import React, { useState, useEffect } from 'react';
import { mcpClient } from '../services/mcpClient';
import { mcpService } from '../services/mcpService';
import { brainService } from '../services/brainService';
import { notionContextAgent } from '../services/notionContextAgent';
import { userVariablesManager } from '../services/userVariablesManager';
import { VariableGearButton } from './VariableGearButton';
import { IntegrationVariablesModal } from './IntegrationVariablesModal';
import { 
  MCPServer, 
  MCPTool, 
  MCPPermission, 
  MCPSessionLog, 
  NotionPageSummary,
  StructuredProjectContext,
  DesignMemory,
  IntegrationCategory 
} from '../types';
import { McpAutoDiscoveryView } from './McpAutoDiscoveryView';
import { FigmaExplorerView } from './FigmaExplorerView';
import { PlaywrightAutomationView } from './PlaywrightAutomationView';
import { DeployPipelineView } from './DeployPipelineView';
import { ProfessionalTemplate } from '../services/templateRegistry';

export interface ProjectDesignMemory {
  importedAt: string;
  figmaUrl: string;
  fileKey: string;
  nodeId?: string;
  designName: string;
  frames: string[];
  colors: Record<string, string>;
  typography: {
    headingFont: string;
    bodyFont: string;
    scaleRatio: number;
    fontSizes?: Record<string, string>;
  };
  tokens: Record<string, string>;
  sourceApi: 'Figma REST API' | 'Figma MCP Extractor';
}

export const McpToolsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'servers' | 'notion_explorer' | 'figma_explorer' | 'playwright_qa' | 'deploy_pipeline' | 'tools' | 'discovery' | 'permissions' | 'logs'>('servers');
  const [servers, setServers] = useState<MCPServer[]>(mcpClient.getServers());
  const [tools, setTools] = useState<MCPTool[]>(mcpService.getTools());
  const [permissions, setPermissions] = useState<MCPPermission[]>(mcpService.getPermissions());
  const [logs, setLogs] = useState<MCPSessionLog[]>(mcpClient.getSessionLogs());

  // Variables & Credentials Modal State (Engrenagenzinha ⚙️)
  const [isVariablesModalOpen, setIsVariablesModalOpen] = useState(false);
  const [variablesModalCategory, setVariablesModalCategory] = useState<IntegrationCategory | undefined>(undefined);
  const [variablesModalVarId, setVariablesModalVarId] = useState<string | undefined>(undefined);

  // Notion Connect & Status State
  const [notionToken, setNotionToken] = useState<string>(
    typeof window !== 'undefined' ? (userVariablesManager.getValue('NOTION_INTERNAL_INTEGRATION_TOKEN') || localStorage.getItem('NOTION_MCP_TOKEN') || '') : ''
  );
  const [isConnectingNotion, setIsConnectingNotion] = useState(false);
  const [notionError, setNotionError] = useState<string | null>(null);
  const [notionSuccessMsg, setNotionSuccessMsg] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Notion Explorer State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingNotion, setIsSearchingNotion] = useState(false);
  const [searchResults, setSearchResults] = useState<NotionPageSummary[]>([]);
  const [selectedPages, setSelectedPages] = useState<NotionPageSummary[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('NOTION_SELECTED_PAGES');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.warn(e); }
      }
    }
    return [];
  });

  // Phase 2: Notion Context Agent Extraction State
  const [isExtractingContext, setIsExtractingContext] = useState(false);
  const [activeExtractingPageId, setActiveExtractingPageId] = useState<string | null>(null);
  const [extractedContext, setExtractedContext] = useState<StructuredProjectContext | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notion_extracted_structured_context');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.warn(e); }
      }
    }
    return null;
  });
  const [extractedDesignMemory, setExtractedDesignMemory] = useState<DesignMemory | null>(null);
  const [contextAgentSummary, setContextAgentSummary] = useState<string | null>(null);

  // Template & Design Memory State
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('NOTION_MCP_PAGE_TEMPLATE_ID') || 'saas_ai_platform' : 'saas_ai_platform'
  );
  const [projectDesignMemory, setProjectDesignMemory] = useState<ProjectDesignMemory | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('figma_project_design_memory');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.warn(e); }
      }
    }
    return null;
  });

  // Modal para adicionar servidor genérico
  const [showAddServerModal, setShowAddServerModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerEndpoint, setNewServerEndpoint] = useState('');
  const [newServerDesc, setNewServerDesc] = useState('');

  // Helper para abrir o modal de variáveis com engrenagem
  const handleOpenVariables = (category?: IntegrationCategory, varId?: string) => {
    setVariablesModalCategory(category);
    setVariablesModalVarId(varId);
    setIsVariablesModalOpen(true);
  };


  // Sincroniza status inicial e escuta eventos do MCP Client
  useEffect(() => {
    mcpClient.checkNotionStatus().then((srv) => {
      setServers(mcpClient.getServers());
    });

    const unsubscribe = mcpClient.subscribe((event) => {
      if (event.type === 'SERVER_STATUS_CHANGE') {
        setServers(mcpClient.getServers());
      } else if (event.type === 'TOOLS_DISCOVERED') {
        setTools(mcpService.getTools());
      } else if (event.type === 'LOG_ADDED') {
        setLogs(mcpClient.getSessionLogs());
      }
    });

    return () => unsubscribe();
  }, []);

  const handleConnectNotion = async () => {
    setIsConnectingNotion(true);
    setNotionError(null);
    setNotionSuccessMsg(null);

    try {
      const result = await mcpClient.connectNotion(notionToken.trim());
      if (typeof window !== 'undefined' && notionToken.trim()) {
        localStorage.setItem('NOTION_MCP_TOKEN', notionToken.trim());
        userVariablesManager.setValue('NOTION_INTERNAL_INTEGRATION_TOKEN', notionToken.trim());
      }
      setNotionSuccessMsg(`Conectado com sucesso! ${result.toolsCount} ferramentas MCP descobertas.`);
      setShowConnectModal(false);
      setTimeout(() => setNotionSuccessMsg(null), 5000);
    } catch (err: any) {
      setNotionError(err.message || 'Erro ao autenticar com o Notion MCP');
    } finally {
      setIsConnectingNotion(false);
    }
  };

  const handleDisconnectNotion = async () => {
    try {
      await mcpClient.disconnectNotion();
      setNotionSuccessMsg('Notion MCP desconectado.');
      setTimeout(() => setNotionSuccessMsg(null), 3000);
    } catch (e: any) {
      setNotionError(e.message);
    }
  };

  // Phase 2: Extração de Contexto Estruturado com Notion Context Agent
  const handleExtractNotionContext = async (page: NotionPageSummary) => {
    setIsExtractingContext(true);
    setActiveExtractingPageId(page.id);
    setNotionError(null);
    setNotionSuccessMsg(null);

    try {
      const result = await notionContextAgent.extractProjectContext(page);
      setExtractedContext(result.structuredContext);
      setExtractedDesignMemory(result.designMemory);
      setContextAgentSummary(result.brainIntegrationSummary);

      if (typeof window !== 'undefined') {
        localStorage.setItem('notion_extracted_structured_context', JSON.stringify(result.structuredContext));
      }

      setNotionSuccessMsg(`Contexto do projeto "${result.structuredContext.project.name}" extraído e salvo no Cérebro com proveniência estrita!`);
      setTimeout(() => setNotionSuccessMsg(null), 6000);
    } catch (err: any) {
      console.error('Falha ao extrair contexto via Notion Agent:', err);
      setNotionError(`Falha na extração de contexto: ${err.message || 'Erro de comunicação com o Notion MCP'}`);
    } finally {
      setIsExtractingContext(false);
      setActiveExtractingPageId(null);
    }
  };

  const handleSearchNotion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearchingNotion(true);
    setNotionError(null);

    try {
      const results = await mcpClient.searchNotion(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setNotionSuccessMsg('Nenhuma página encontrada com este termo.');
        setTimeout(() => setNotionSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setNotionError(`Falha na busca Notion: ${err.message}. Verifique a conexão com o Notion MCP.`);
    } finally {
      setIsSearchingNotion(false);
    }
  };

  const handleToggleSelectPage = (page: NotionPageSummary) => {
    let updated: NotionPageSummary[];
    if (selectedPages.some(p => p.id === page.id)) {
      updated = selectedPages.filter(p => p.id !== page.id);
    } else {
      updated = [...selectedPages, page];
    }
    setSelectedPages(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('NOTION_SELECTED_PAGES', JSON.stringify(updated));
    }
    // Adiciona na memória do Brain Engine
    brainService.addMemory(
      `[Notion Project Context] Página vinculada: "${page.title}" (ID: ${page.id})`,
      'rule',
      'high',
      'auto'
    );
  };

  const handleToggleTool = (toolId: string) => {
    mcpService.toggleTool(toolId);
    setTools([...mcpService.getTools()]);
  };

  const handleTogglePermission = (agentRole: string, toolId: string) => {
    mcpService.togglePermission(agentRole, toolId);
    setPermissions([...mcpService.getPermissions()]);
  };

  const notionServer = servers.find(s => s.id === 'notion');
  const isNotionConnected = notionServer?.status === 'CONNECTED';

  return (
    <div className="h-full bg-slate-950 flex flex-col text-slate-100 p-6 space-y-6 overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/20">
            🔌
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
                MCP TOOLS & GATEWAY
                <span className="text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                  Streamable HTTP Active
                </span>
              </h1>
              <VariableGearButton 
                onClick={handleOpenVariables}
                title="Configurar variáveis de todos os serviços (Notion, Figma, Gemini...)"
                size="md"
              />
            </div>
            <p className="text-xs text-slate-400">
              Protocolo Model Context Protocol com integração oficial Notion MCP, Agente de Contexto e Gerenciador de Credenciais.
            </p>
          </div>
        </div>

        {/* Sub Tabs */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('servers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'servers' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            🖥️ Servidores ({servers.length})
          </button>
          <button
            onClick={() => setActiveTab('notion_explorer')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'notion_explorer' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                : 'text-blue-300 hover:text-white bg-blue-950/40 border border-blue-800/40'
            }`}
          >
            <span>📝</span>
            <span>Notion Explorer & Context</span>
            {selectedPages.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-blue-400/20 text-blue-200 border border-blue-400/40">
                {selectedPages.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('figma_explorer')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'figma_explorer' 
                ? 'bg-gradient-to-r from-violet-600 via-pink-600 to-orange-500 text-white shadow-lg' 
                : 'text-pink-300 hover:text-white bg-pink-950/40 border border-pink-800/40'
            }`}
          >
            <span>🎨</span>
            <span>Figma Dev Mode & Tokens</span>
          </button>
          <button
            onClick={() => setActiveTab('playwright_qa')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'playwright_qa' 
                ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg' 
                : 'text-cyan-300 hover:text-white bg-cyan-950/40 border border-cyan-800/40'
            }`}
          >
            <span>🎭</span>
            <span>Playwright Visual QA</span>
          </button>
          <button
            onClick={() => setActiveTab('deploy_pipeline')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'deploy_pipeline' 
                ? 'bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 text-white shadow-lg' 
                : 'text-emerald-300 hover:text-white bg-emerald-950/40 border border-emerald-800/40'
            }`}
          >
            <span>🚀</span>
            <span>GitHub & Vercel Deploy</span>
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'tools' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            🛠️ Ferramentas ({tools.length})
          </button>
          <button
            onClick={() => setActiveTab('discovery')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'discovery' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-purple-300 hover:text-white bg-purple-950/40 border border-purple-800/40'
            }`}
          >
            <span>🔍</span>
            <span>Auto-Discovery</span>
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'permissions' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            🔐 Permissões
          </button>
          <button
            onClick={() => {
              setLogs(mcpClient.getSessionLogs());
              setActiveTab('logs');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            📜 Audit Logs
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notionSuccessMsg && (
        <div className="p-3 bg-emerald-950 border border-emerald-800 rounded-2xl text-xs font-mono text-emerald-200 animate-fadeIn flex items-center gap-2">
          <span>✅</span>
          <span>{notionSuccessMsg}</span>
        </div>
      )}
      {notionError && (
        <div className="p-3 bg-rose-950 border border-rose-800 rounded-2xl text-xs font-mono text-rose-200 animate-fadeIn flex items-center gap-2">
          <span>⚠️</span>
          <span>{notionError}</span>
        </div>
      )}

      {/* --- TAB: SERVERS (PROFESSIONAL MCP SERVERS LIST) --- */}
      {activeTab === 'servers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-extrabold text-white">MCP SERVERS REGISTRY</h3>
              <p className="text-xs text-slate-400">Servidores MCP com transporte Streamable HTTP, SSE e in-memory.</p>
            </div>
            <button
              onClick={() => setShowAddServerModal(!showAddServerModal)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <span>➕</span>
              <span>Registrar Servidor MCP</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* NOTION MCP SERVER CARD */}
            <div className={`border rounded-3xl p-6 transition-all shadow-xl space-y-4 ${
              isNotionConnected 
                ? 'bg-gradient-to-br from-blue-950/70 via-slate-900 to-indigo-950/70 border-blue-800/80 shadow-blue-950/30' 
                : 'bg-slate-900/90 border-slate-800'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white text-black flex items-center justify-center text-xl font-bold shadow-md">
                    N
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-base font-black text-white font-mono">
                        NOTION
                      </h4>
                      <VariableGearButton 
                        onClick={() => handleOpenVariables('notion', 'NOTION_INTERNAL_INTEGRATION_TOKEN')}
                        title="Configurar credenciais e variáveis do Notion MCP"
                        size="sm"
                      />
                    </div>
                    <span className="text-xs text-slate-400">https://mcp.notion.com/mcp</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase border flex items-center gap-1.5 ${
                    isNotionConnected
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : notionServer?.status === 'CONNECTING'
                      ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isNotionConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    {isNotionConnected ? 'Connected' : notionServer?.status === 'CONNECTING' ? 'Connecting...' : 'Not Connected'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 text-[10px] block">Transport:</span>
                  <span className="text-blue-300 font-bold">Streamable HTTP</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Discovered Tools:</span>
                  <span className="text-white font-bold">{notionServer?.toolsCount || 0}</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Servidor MCP oficial do Notion para acesso estruturado a briefings, brand guidelines, bases de dados e regras de design.
              </p>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                {isNotionConnected ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('notion_explorer')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                    >
                      <span>🔍 Abrir Explorer & Context</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('tools')}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
                    >
                      View Tools ({notionServer?.toolsCount})
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectNotion}
                      className="px-3.5 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl text-xs font-bold transition-all ml-auto"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(true)}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <span>⚡ Connect Notion MCP</span>
                  </button>
                )}
              </div>
            </div>

            {/* FIGMA MCP SERVER CARD */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center text-xl shadow-md">
                    🎨
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-base font-black text-white font-mono">
                        FIGMA
                      </h4>
                      <VariableGearButton 
                        onClick={() => handleOpenVariables('figma', 'FIGMA_PERSONAL_ACCESS_TOKEN')}
                        title="Configurar Figma Access Token e File Key"
                        size="sm"
                      />
                    </div>
                    <span className="text-xs text-slate-400">http://localhost:3005/mcp</span>
                  </div>
                </div>

                <span className="px-3 py-1 bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold rounded-full uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Not Connected
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 text-[10px] block">Transport:</span>
                  <span className="text-purple-300 font-bold">SSE (Server-Sent Events)</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Tools:</span>
                  <span className="text-white font-bold">0</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Extração de Design Tokens, hierarquia de frames e estilos direto do Figma Dev Mode.
              </p>

              <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('figma_explorer')}
                  className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 via-pink-600 to-orange-500 hover:from-violet-500 hover:to-orange-400 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>🎨 Abrir Figma Explorer</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenVariables('figma', 'FIGMA_PERSONAL_ACCESS_TOKEN')}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center"
                  title="Configurações de Credenciais Figma"
                >
                  <span>⚙️</span>
                </button>
              </div>
            </div>

            {/* PLAYWRIGHT & BROWSER MCP SERVER CARD */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-blue-600 flex items-center justify-center text-xl shadow-md">
                    🌐
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-base font-black text-white font-mono">
                        PLAYWRIGHT
                      </h4>
                      <VariableGearButton 
                        onClick={() => handleOpenVariables('playwright')}
                        title="Configurar variáveis do Playwright"
                        size="sm"
                      />
                    </div>
                    <span className="text-xs text-slate-400">http://localhost:3006/mcp</span>
                  </div>
                </div>

                <span className="px-3 py-1 bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold rounded-full uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Not Connected
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 text-[10px] block">Transport:</span>
                  <span className="text-emerald-300 font-bold">SSE</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Tools:</span>
                  <span className="text-white font-bold">0</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Navegador virtual para renderização, inspeção DOM, validação de responsividade e AI Critic.
              </p>

              <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenVariables('playwright')}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <span>⚙️ Configurar Playwright</span>
                </button>
              </div>
            </div>

            {/* FILESYSTEM MCP SERVER CARD */}
            <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-800/60 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-xl shadow-md">
                    📁
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-base font-black text-white font-mono">
                        FILESYSTEM
                      </h4>
                      <VariableGearButton 
                        onClick={() => handleOpenVariables('storage')}
                        title="Configurar armazenamento e diretórios"
                        size="sm"
                      />
                    </div>
                    <span className="text-xs text-slate-400">local://filesystem</span>
                  </div>
                </div>

                <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold rounded-full uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Connected
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 text-[10px] block">Transport:</span>
                  <span className="text-emerald-300 font-bold">In-Memory / Local</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Tools:</span>
                  <span className="text-white font-bold">4 Ativas</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Manipulação e versionamento de arquivos HTML, CSS, JavaScript e assets de landing pages.
              </p>

              <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('tools')}
                  className="flex-1 py-2.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-bold rounded-xl text-xs transition-all"
                >
                  Manage Tools
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB: NOTION EXPLORER (WORKSPACE BROWSER & PROJECT CONTEXT) --- */}
      {activeTab === 'notion_explorer' && (
        <div className="space-y-6">
          {!isNotionConnected ? (
            <div className="bg-slate-900/90 border border-blue-900/60 rounded-3xl p-8 text-center space-y-4 max-w-xl mx-auto shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-blue-950 border border-blue-800 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-blue-500/20">
                📝
              </div>
              <h3 className="text-lg font-black text-white">Notion MCP Não Conectado</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Conecte seu Workspace do Notion para pesquisar e importar briefings, personas, cores, copy e diretrizes de landing pages diretamente para o Cérebro da IA.
              </p>
              <button
                type="button"
                onClick={() => setShowConnectModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-blue-600/20"
              >
                ⚡ Conectar Workspace Notion
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* SEARCH BAR */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>🔍</span> NOTION WORKSPACE EXPLORER
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ● Conexão Ativa com Notion MCP
                  </span>
                </div>

                <form onSubmit={handleSearchNotion} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Pesquisar páginas, briefings, clientes ou databases no Notion..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 font-mono shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={isSearchingNotion}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition-all shadow-md shrink-0 flex items-center gap-2"
                  >
                    {isSearchingNotion ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Buscando...</span>
                      </>
                    ) : (
                      <span>Pesquisar</span>
                    )}
                  </button>
                </form>
              </div>

              {/* SEARCH RESULTS */}
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Resultados no Notion Workspace ({searchResults.length}):
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {searchResults.map((page) => {
                      const isSelected = selectedPages.some(p => p.id === page.id);
                      return (
                        <div
                          key={page.id}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-blue-950/60 border-blue-600 shadow-lg shadow-blue-950/40'
                              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                          }`}
                          onClick={() => handleToggleSelectPage(page)}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xl">{page.icon || '📄'}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                                isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {isSelected ? '✓ Selecionado' : '+ Vincular'}
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-white leading-snug">{page.title}</h5>
                            {page.excerpt && (
                              <p className="text-[11px] text-slate-400 line-clamp-2">{page.excerpt}</p>
                            )}
                          </div>
                          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[9px] font-mono text-slate-500 flex justify-between">
                            <span>ID: {page.id.substring(0, 8)}...</span>
                            <span>{page.isDatabase ? 'Database' : 'Página'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ASSOCIATED PROJECT CONTEXT & AGENT EXTRACTION */}
              <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-blue-800/60 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-xl text-white shadow-md">
                      🧠
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white">NOTION PROJECT CONTEXT (BRAIN ENGINE)</h4>
                      <p className="text-xs text-slate-300">Páginas associadas ativas e extração de contexto inteligente pelo Notion Agent.</p>
                    </div>
                  </div>

                  <span className="text-xs font-mono text-blue-300 bg-blue-950 px-3 py-1 rounded-xl border border-blue-800">
                    {selectedPages.length} Fonte(s) Vinculada(s)
                  </span>
                </div>

                {selectedPages.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    Nenhuma página vinculada ainda. Use a pesquisa acima para selecionar briefings, brand guidelines ou copies.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {selectedPages.map((page) => {
                      const isExtracting = isExtractingContext && activeExtractingPageId === page.id;
                      return (
                        <div
                          key={page.id}
                          className="bg-slate-950 border border-blue-800/80 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-inner"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <span className="text-xl">{page.icon || '📄'}</span>
                              <div>
                                <h5 className="text-xs font-bold text-white truncate max-w-[220px]">{page.title}</h5>
                                <span className="text-[10px] text-slate-500 font-mono">ID: {page.id.substring(0, 10)}...</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleSelectPage(page)}
                              className="text-slate-500 hover:text-rose-400 text-xs shrink-0 p-1"
                              title="Remover fonte"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleExtractNotionContext(page)}
                              disabled={isExtractingContext}
                              className="flex-1 py-2 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                            >
                              {isExtracting ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                  <span className="text-[11px]">Extraindo Contexto...</span>
                                </>
                              ) : (
                                <>
                                  <span>🧠</span>
                                  <span className="text-[11px]">Extrair Contexto com Notion Agent</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STRUCTURED PROJECT CONTEXT DISPLAY (PHASE 2 OUTCOME) */}
              {extractedContext && (
                <div className="bg-slate-900 border border-indigo-700/60 rounded-3xl p-6 space-y-5 shadow-2xl animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl text-white shadow-lg">
                        ✨
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white uppercase tracking-wider">
                            CONTEXTO ESTRUTURADO DO PROJETO
                          </h4>
                          <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">
                            Ativo no Brain Engine
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Extraído do Notion com parsing inteligente e proveniência estrita.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(extractedContext, null, 2));
                          alert('Contexto copiado para a área de transferência em formato JSON!');
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono transition-all"
                      >
                        📋 Copiar JSON
                      </button>
                    </div>
                  </div>

                  {/* PROVENANCE BADGE */}
                  {extractedContext.provenance && (
                    <div className="p-3 bg-slate-950/80 border border-indigo-900/50 rounded-2xl flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-400 font-bold">Origem:</span>
                        <span className="text-white font-bold">{extractedContext.provenance.source}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Page ID:</span>
                        <span className="text-indigo-300">{extractedContext.provenance.notionPageId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Data:</span>
                        <span>{new Date(extractedContext.provenance.retrievedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* GRID DE CARDS DO CONTEXTO */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* CARD 1: IDENTIDADE & NEGÓCIO */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                      <h5 className="text-xs font-bold text-indigo-400 font-mono uppercase flex items-center gap-1.5">
                        <span>🏢</span> Projeto & Marca
                      </h5>
                      <div className="space-y-1.5 text-xs">
                        <p><strong className="text-slate-400">Nome:</strong> <span className="text-white font-bold">{extractedContext.project.name}</span></p>
                        <p><strong className="text-slate-400">Marca:</strong> <span className="text-slate-200">{extractedContext.project.brandName}</span></p>
                        <p><strong className="text-slate-400">Setor:</strong> <span className="text-slate-300">{extractedContext.project.industry || 'Tecnologia / SaaS'}</span></p>
                        <p><strong className="text-slate-400">Oferta:</strong> <span className="text-slate-300">{extractedContext.business.offer}</span></p>
                      </div>
                    </div>

                    {/* CARD 2: PÚBLICO & TOM DE VOZ */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                      <h5 className="text-xs font-bold text-purple-400 font-mono uppercase flex items-center gap-1.5">
                        <span>🎯</span> Público & Tom de Voz
                      </h5>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-mono">Público-Alvo:</span>
                          <span className="text-slate-200">{extractedContext.targetAudience.primary}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-mono">Tom de Voz:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {extractedContext.toneOfVoice.map((t, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-800 rounded-md text-[10px] font-mono">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CARD 3: DESIGN TOKENS (CORES & TIPOGRAFIA) */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                      <h5 className="text-xs font-bold text-pink-400 font-mono uppercase flex items-center gap-1.5">
                        <span>🎨</span> Design Tokens
                      </h5>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-mono">Paleta de Cores:</span>
                          <div className="flex items-center gap-2 mt-1.5">
                            {Object.entries(extractedContext.designTokens.colors).map(([key, val]) => (
                              <div key={key} className="flex flex-col items-center gap-1">
                                <div 
                                  className="w-6 h-6 rounded-lg border border-slate-700 shadow"
                                  style={{ backgroundColor: val }}
                                  title={`${key}: ${val}`}
                                />
                                <span className="text-[8px] font-mono text-slate-400 uppercase">{key.substring(0, 3)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-1 text-[11px] text-slate-300">
                          <span className="text-slate-400">Headings:</span> <span className="font-bold text-white">{extractedContext.designTokens.typography.headingFont}</span> | <span className="text-slate-400">Body:</span> <span className="text-white">{extractedContext.designTokens.typography.bodyFont}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* SEÇÕES E ESTRUTURA */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <h5 className="text-xs font-bold text-emerald-400 font-mono uppercase flex items-center gap-1.5">
                      <span>📐</span> Estrutura e Sequência Recomendada de Seções
                    </h5>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {extractedContext.contentStructure.sections.map((sec, idx) => (
                        <div key={sec.id || idx} className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-white font-bold">{sec.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({sec.type})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* COPY PRINCIPAL */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <h5 className="text-xs font-bold text-blue-400 font-mono uppercase flex items-center gap-1.5">
                      <span>✍️</span> Copywriting Estruturado
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-mono">Headline Principal:</span>
                        <p className="text-white font-bold text-sm bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          "{extractedContext.copy.heroHeadline}"
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-mono">Call to Action Primária (CTA):</span>
                        <p className="text-emerald-300 font-bold bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-900">
                          👉 {extractedContext.copy.primaryCta}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* --- TAB: FIGMA EXPLORER & DEV MODE (FASE 3) --- */}
      {activeTab === 'figma_explorer' && (
        <FigmaExplorerView onOpenVariablesModal={handleOpenVariables} />
      )}

      {/* --- TAB: PLAYWRIGHT BROWSER AUTOMATION & VISUAL QA (FASE 4) --- */}
      {activeTab === 'playwright_qa' && (
        <PlaywrightAutomationView onOpenVariablesModal={handleOpenVariables} />
      )}

      {/* --- TAB: GITHUB & VERCEL DEPLOY PIPELINE (FASE 5) --- */}
      {activeTab === 'deploy_pipeline' && (
        <DeployPipelineView onOpenVariablesModal={handleOpenVariables} />
      )}

      {/* --- TAB: TOOLS --- */}
      {activeTab === 'tools' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className={`bg-slate-900/90 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                  tool.enabled ? 'border-slate-800 hover:border-indigo-500/50 shadow-md' : 'border-slate-900 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono uppercase bg-slate-800 text-indigo-300 px-2 py-0.5 rounded-md">
                      {tool.category}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tool.enabled}
                        onChange={() => handleToggleTool(tool.id)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-mono">
                    <span>⚡</span> {tool.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>{tool.isDynamic ? 'Notion MCP (Dinâmica)' : 'Local Gateway'}</span>
                  <span className={tool.enabled ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                    {tool.enabled ? '● Ativa' : '○ Inativa'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB: DISCOVERY --- */}
      {activeTab === 'discovery' && (
        <McpAutoDiscoveryView
          servers={servers}
          tools={tools}
          projectDesignMemory={projectDesignMemory}
          activeTemplateId={activeTemplateId}
          onSelectTemplate={(tpl) => {
            setActiveTemplateId(tpl.id);
            if (typeof window !== 'undefined') localStorage.setItem('NOTION_MCP_PAGE_TEMPLATE_ID', tpl.id);
          }}
          onGenerateWithCoPilot={(tpl) => {
            mcpService.triggerMcpCoPilotBuildSession(`Construir página com template ${tpl.title}`);
          }}
          onNavigateToTab={(t) => setActiveTab(t as any)}
        />
      )}

      {/* --- TAB: PERMISSIONS --- */}
      {activeTab === 'permissions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-sm font-extrabold text-white">Matriz de Permissões por Agente de IA</h2>
            <p className="text-xs text-slate-400">
              Controle estritamente quais ferramentas cada Agente de Design e Contexto pode acionar.
            </p>
          </div>

          <div className="space-y-6">
            {permissions.map((perm) => (
              <div key={perm.agentRole} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-indigo-300 font-mono uppercase flex items-center gap-2">
                  <span>🤖</span> Agente: {perm.agentRole}
                </h3>

                <div className="flex flex-wrap gap-2">
                  {tools.map((t) => {
                    const isAllowed = perm.allowedToolIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleTogglePermission(perm.agentRole, t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                          isAllowed
                            ? 'bg-indigo-950 text-indigo-300 border border-indigo-700 font-bold'
                            : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        <span>{isAllowed ? '✓' : '+'}</span>
                        <span>{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB: AUDIT LOGS --- */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white">Audit Trail & Histórico MCP ({logs.length})</h3>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-rose-400 hover:text-rose-300 font-mono"
            >
              Limpar Logs
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
            {logs.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">Nenhum evento registrado ainda.</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 text-xs font-mono space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="text-indigo-300 font-bold">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                      log.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {log.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{log.toolName}</span>
                    <span className="text-slate-500">via {log.agentRole}</span>
                    <span className="text-slate-600 ml-auto">{log.durationMs}ms</span>
                  </div>

                  {log.outputResult && (
                    <pre className="text-[10px] text-slate-400 bg-slate-900/80 p-2 rounded-lg overflow-x-auto">
                      {JSON.stringify(log.outputResult, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONEXÃO AO NOTION MCP */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-blue-900/80 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold text-lg">
                  N
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Conectar Notion MCP Server</h3>
                  <span className="text-[10px] text-blue-300 font-mono">https://mcp.notion.com/mcp</span>
                </div>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 block">
                Notion Internal Integration Token ou OAuth Token:
              </label>
              <input
                type="password"
                placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={notionToken}
                onChange={(e) => setNotionToken(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-blue-500 shadow-inner"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Você pode obter o token em <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" className="text-blue-400 underline">notion.so/my-integrations</a>. O token é gerenciado com segurança pelo servidor MCP Gateway.
              </p>
            </div>

            {notionError && (
              <div className="p-3 bg-rose-950 border border-rose-800 rounded-xl text-xs font-mono text-rose-200">
                {notionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConnectNotion}
                disabled={isConnectingNotion}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
              >
                {isConnectingNotion ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Conectando e Descobrindo Tools...</span>
                  </>
                ) : (
                  <span>Conectar e Descobrir Tools</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GERENCIAMENTO DE VARIÁVEIS / CREDENCIAIS (ENGRENAGENZINHA ⚙️) */}
      <IntegrationVariablesModal
        isOpen={isVariablesModalOpen}
        onClose={() => setIsVariablesModalOpen(false)}
        initialCategory={variablesModalCategory}
        initialVariableId={variablesModalVarId}
      />

    </div>
  );
};

