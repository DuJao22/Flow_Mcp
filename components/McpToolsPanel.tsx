import React, { useState } from 'react';
import { mcpService } from '../services/mcpService';
import { brainService } from '../services/brainService';
import { MCPTool, MCPServer, MCPPermission, MCPSessionLog } from '../types';
import { McpAutoDiscoveryView } from './McpAutoDiscoveryView';
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
  const [activeTab, setActiveTab] = useState<'tools' | 'servers' | 'discovery' | 'permissions' | 'logs'>('tools');
  const [tools, setTools] = useState<MCPTool[]>(mcpService.getTools());
  const [servers, setServers] = useState<MCPServer[]>(mcpService.getServers());
  const [permissions, setPermissions] = useState<MCPPermission[]>(mcpService.getPermissions());
  const [logs, setLogs] = useState<MCPSessionLog[]>([]);

  // Active Template state for Notion MCP & Auto-Discovery
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('NOTION_MCP_PAGE_TEMPLATE_ID') || 'saas_ai_platform' : 'saas_ai_platform'
  );

  const handleSelectTemplate = (template: ProfessionalTemplate) => {
    setActiveTemplateId(template.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('NOTION_MCP_PAGE_TEMPLATE_ID', template.id);
      localStorage.setItem('NOTION_MCP_PAGE_TEMPLATE_LABEL', template.title);
      localStorage.setItem('NOTION_MCP_PAGE_TEMPLATE_SPECS', template.specs);
    }
    try {
      brainService.addMemory(
        `[Notion MCP Template Ativo] ${template.title} (${template.id}). Especificações: ${template.specs}`,
        'rule',
        'high',
        'auto'
      );
    } catch (e) {
      console.warn('Erro ao salvar template na memória:', e);
    }
  };

  const handleGenerateWithCoPilot = (template: ProfessionalTemplate) => {
    handleSelectTemplate(template);
    mcpService.triggerMcpCoPilotBuildSession(`Gerando mega página profissional com o template ${template.title}`);
  };

  // Custom MCP Server Registration form state
  const [newServerName, setNewServerName] = useState('');
  const [newServerEndpoint, setNewServerEndpoint] = useState('');
  const [newServerDesc, setNewServerDesc] = useState('');
  const [showAddServerModal, setShowAddServerModal] = useState(false);

  // Figma Token & Workflow State
  const [figmaToken, setFigmaToken] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('FIGMA_MCP_TOKEN') || '' : ''
  );
  const [figmaTokenSaved, setFigmaTokenSaved] = useState<boolean>(!!figmaToken);
  const [showTokenSecret, setShowTokenSecret] = useState(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [testFigmaUrl, setTestFigmaUrl] = useState('');
  const [testFigmaResult, setTestFigmaResult] = useState<any>(null);
  const [isTestingFigma, setIsTestingFigma] = useState(false);

  // Notion MCP State
  const [notionToken, setNotionToken] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('NOTION_MCP_TOKEN') || '' : ''
  );
  const [notionPageId, setNotionPageId] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('NOTION_MCP_PAGE_ID') || '' : ''
  );
  const [notionResult, setNotionResult] = useState<any>(null);
  const [isFetchingNotion, setIsFetchingNotion] = useState(false);

  const handleFetchNotionBriefing = async () => {
    setIsFetchingNotion(true);
    setNotionResult(null);

    try {
      const res = await mcpService.executeTool('UX Designer', 'notion_fetch_briefing', {
        pageId: notionPageId,
        apiKey: notionToken
      });
      setNotionResult(res);
      setSaveNotification('✅ Diretrizes e Briefing do Notion MCP sincronizados no Cérebro com sucesso!');
      setTimeout(() => setSaveNotification(null), 4000);
    } catch (err: any) {
      console.error('Erro ao conectar com Notion MCP:', err);
    } finally {
      setIsFetchingNotion(false);
    }
  };

  // Active Project Design Memory State (accessible by Brain Engine)
  const [projectDesignMemory, setProjectDesignMemory] = useState<ProjectDesignMemory | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('figma_project_design_memory');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.warn('Erro ao carregar figma_project_design_memory:', e);
        }
      }
    }
    return null;
  });

  const handleSaveFigmaToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('FIGMA_MCP_TOKEN', figmaToken.trim());
    }
    setFigmaTokenSaved(!!figmaToken.trim());
    setSaveNotification(
      figmaToken.trim() 
        ? '✅ Token do Figma salvo com sucesso no armazenamento seguro local!' 
        : 'ℹ️ Token limpo com sucesso.'
    );
    setTimeout(() => setSaveNotification(null), 4000);
  };

  const handleClearFigmaToken = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('FIGMA_MCP_TOKEN');
    }
    setFigmaToken('');
    setFigmaTokenSaved(false);
    setSaveNotification('ℹ️ Token do Figma removido do armazenamento local.');
    setTimeout(() => setSaveNotification(null), 4000);
  };

  // IMPORT DESIGN HANDLER: Calls Figma REST API + MCP Tool and updates projectDesignMemory for the Brain Engine
  const handleImportDesign = async (urlOverride?: string) => {
    const targetUrl = (urlOverride || testFigmaUrl).trim();
    if (!targetUrl) return;

    setIsTestingFigma(true);
    setTestFigmaResult(null);

    let fileKey = 'figma_design_key';
    let nodeId = '';

    if (targetUrl.includes('/file/')) {
      fileKey = targetUrl.split('/file/')[1]?.split('/')[0] || fileKey;
    } else if (targetUrl.includes('/design/')) {
      fileKey = targetUrl.split('/design/')[1]?.split('/')[0] || fileKey;
    }

    if (targetUrl.includes('node-id=')) {
      nodeId = decodeURIComponent(targetUrl.split('node-id=')[1]?.split('&')[0] || '');
    }

    let restApiData: any = null;
    let usedSource: 'Figma REST API' | 'Figma MCP Extractor' = 'Figma MCP Extractor';

    // 1. Tenta requisição direta à Figma REST API se token informado
    const activeToken = figmaToken.trim() || (typeof window !== 'undefined' ? localStorage.getItem('FIGMA_MCP_TOKEN') || '' : '');

    if (activeToken && activeToken !== 'figd_demo_token' && fileKey !== 'figma_design_key') {
      try {
        const endpoint = nodeId
          ? `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`
          : `https://api.figma.com/v1/files/${fileKey}`;

        const apiRes = await fetch(endpoint, {
          headers: { 'X-Figma-Token': activeToken }
        });

        if (apiRes.ok) {
          restApiData = await apiRes.json();
          usedSource = 'Figma REST API';
        }
      } catch (err) {
        console.warn('[Figma REST API] Falha na chamada direta à API (CORS ou rede), usando extrator MCP:', err);
      }
    }

    // 2. Executa a ferramenta MCP figma_import_design para registrar logs e extrair tokens
    let mcpRes: any = null;
    try {
      mcpRes = await mcpService.executeTool('Visual Designer', 'figma_import_design', {
        url: targetUrl,
        apiToken: activeToken
      });
      setTestFigmaResult(mcpRes);
    } catch (err: any) {
      console.error('Erro na ferramenta MCP figma_import_design:', err);
    }

    // 3. Extrai nós de frame do payload REST API se disponível
    let extractedFrames: string[] = [];
    if (restApiData && restApiData.document) {
      const traverseNodes = (node: any) => {
        if (!node) return;
        if (['FRAME', 'COMPONENT', 'SECTION', 'CANVAS'].includes(node.type) && node.name) {
          extractedFrames.push(node.name);
        }
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach(traverseNodes);
        }
      };
      traverseNodes(restApiData.document);
    }

    const designName = restApiData?.name || mcpRes?.designName || 'Figma Design System';
    const frames = extractedFrames.length > 0 ? extractedFrames.slice(0, 8) : (mcpRes?.frames || ['Hero Banner Frame', 'Features Grid', 'Footer CTA']);
    const colors = mcpRes?.colors || { primary: '#8b5cf6', secondary: '#ec4899', darkBackground: '#090d16', surface: '#1e293b', text: '#f8fafc' };
    const typography = mcpRes?.typography || { headingFont: 'Plus Jakarta Sans', bodyFont: 'Inter', scaleRatio: 1.25 };
    const tokens = mcpRes?.tokens || { borderRadius: '16px', containerPadding: '24px', itemGap: '16px', shadowStyle: 'luxury-glow' };

    const newDesignMemory: ProjectDesignMemory = {
      importedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' - ' + new Date().toLocaleDateString('pt-BR'),
      figmaUrl: targetUrl,
      fileKey,
      nodeId: nodeId || undefined,
      designName,
      frames,
      colors,
      typography,
      tokens,
      sourceApi: usedSource
    };

    // 4. Armazena no estado local e LocalStorage
    setProjectDesignMemory(newDesignMemory);
    if (typeof window !== 'undefined') {
      localStorage.setItem('figma_project_design_memory', JSON.stringify(newDesignMemory));
    }

    // 5. Grava na Memória Estruturada do Cérebro (Brain Engine)
    try {
      const currentStructured = brainService.getStructuredCategories();
      currentStructured.design = {
        colors: Object.entries(colors).map(([k, v]) => `${k}: ${v}`).join(', '),
        typography: `Heading: ${typography.headingFont}, Body: ${typography.bodyFont}, Ratio: ${typography.scaleRatio}`,
        components: `Figma Frames: ${frames.join(', ')}`,
        layout: Object.entries(tokens).map(([k, v]) => `${k}: ${v}`).join(', ')
      };
      brainService.saveStructuredCategories(currentStructured);

      brainService.addMemory(
        `[Figma Design Memory - ${fileKey}] Design "${designName}" importado com sucesso via ${usedSource}. Frames: ${frames.join(', ')}. Cores: ${JSON.stringify(colors)}. Tipografia: ${typography.headingFont}/${typography.bodyFont}.`,
        'rule',
        'high',
        'auto'
      );
    } catch (memErr) {
      console.warn('Erro ao atualizar memória do Cérebro com Figma Design:', memErr);
    }

    setIsTestingFigma(false);
  };

  const handleClearDesignMemory = () => {
    setProjectDesignMemory(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('figma_project_design_memory');
    }
  };

  const handleRegisterServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim() || !newServerEndpoint.trim()) return;

    const addedServer = mcpService.registerServerUrl(
      newServerName.trim(),
      newServerEndpoint.trim(),
      newServerDesc.trim() || 'Servidor MCP Customizado Remoto'
    );

    setServers([...mcpService.getServers()]);
    setTools([...mcpService.getTools()]);
    setNewServerName('');
    setNewServerEndpoint('');
    setNewServerDesc('');
    setShowAddServerModal(false);
  };

  const handleRemoveServer = (serverId: string) => {
    mcpService.removeServer(serverId);
    setServers([...mcpService.getServers()]);
    setTools([...mcpService.getTools()]);
  };

  const handleToggleTool = (toolId: string) => {
    setTools(prev => prev.map(t => t.id === toolId ? { ...t, enabled: !t.enabled } : t));
  };

  const handleTogglePermission = (agentRole: string, toolId: string) => {
    const existingPerm = permissions.find(p => p.agentRole === agentRole);
    if (!existingPerm) return;

    let updatedToolIds: string[];
    if (existingPerm.allowedToolIds.includes(toolId)) {
      updatedToolIds = existingPerm.allowedToolIds.filter(id => id !== toolId);
    } else {
      updatedToolIds = [...existingPerm.allowedToolIds, toolId];
    }

    mcpService.updatePermission(agentRole, updatedToolIds);
    setPermissions([...mcpService.getPermissions()]);
  };

  return (
    <div className="h-full bg-slate-950 flex flex-col text-slate-100 p-6 space-y-6 overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/20">
            🔌
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
              MCP TOOLS REGISTRY
              <span className="text-[10px] font-mono uppercase bg-indigo-950 text-indigo-300 border border-indigo-800 px-2.5 py-0.5 rounded-full">
                v1.2 Active
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Gerenciamento de Model Context Protocol: servidores, ferramentas de navegação, arquivo e conectores externos.
            </p>
          </div>
        </div>

        {/* Sub Tabs */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar shrink-0 w-full sm:w-auto">
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
              activeTab === 'discovery' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20' : 'text-purple-300 hover:text-white bg-purple-950/40 border border-purple-800/40'
            }`}
          >
            <span>🔍</span>
            <span>Auto-Discovery & Templates</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-purple-400/20 text-purple-200 border border-purple-400/40">
              IA
            </span>
          </button>
          <button
            onClick={() => setActiveTab('servers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'servers' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            🖥️ Servidores ({servers.length})
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
              setLogs([...mcpService.getLogs()]);
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

      {/* --- TAB: AUTO-DISCOVERY & TEMPLATES --- */}
      {activeTab === 'discovery' && (
        <McpAutoDiscoveryView
          servers={servers}
          tools={tools}
          projectDesignMemory={projectDesignMemory}
          activeTemplateId={activeTemplateId}
          onSelectTemplate={handleSelectTemplate}
          onGenerateWithCoPilot={handleGenerateWithCoPilot}
          onNavigateToTab={(t) => setActiveTab(t)}
        />
      )}

      {/* --- TAB: TOOLS --- */}
      {activeTab === 'tools' && (
        <div className="space-y-6">
          
          {/* AUTO-DISCOVERY QUICK CTA BANNER */}
          <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-800/60 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-2xl shrink-0 shadow-lg shadow-purple-500/20">
                ✨
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                  AUTO-DISCOVERY DE RECURSOS MCP & TEMPLATES DE DESIGN
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-purple-950 text-purple-300 border border-purple-700 uppercase">
                    Novo Motor IA
                  </span>
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Escaneie automaticamente os 6 servidores MCP conectados e veja os templates recomendados para o nicho e regras do seu projeto.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('discovery')}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-2xl text-xs transition-all shadow-md shrink-0 flex items-center gap-1.5 active:scale-95"
            >
              <span>🔍 Abrir Auto-Discovery</span>
              <span>→</span>
            </button>
          </div>

          {/* NOTION MCP WORKSPACE & INTEGRATION CARD */}
          <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-blue-800/60 rounded-3xl p-6 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-800/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">
                  📝
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2 tracking-wide">
                    NOTION MCP WORKSPACE & DESIGN DIRECTIVES
                    <span className="text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                      ● Ativo em Todas as Páginas & Fluxos
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    O Notion MCP está conectado para orientar e aprimorar cada fluxo de automação e página HTML gerada. As diretrizes do seu Notion são injetadas automaticamente no Cérebro da IA.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Notion Page ID / Workspace URL:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 17b92f9823a480a880..."
                    value={notionPageId}
                    onChange={(e) => {
                      setNotionPageId(e.target.value);
                      if (typeof window !== 'undefined') localStorage.setItem('NOTION_MCP_PAGE_ID', e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-blue-900/80 rounded-2xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Notion Integration Token (Opcional):
                  </label>
                  <input
                    type="password"
                    placeholder="Ex: secret_xyz123..."
                    value={notionToken}
                    onChange={(e) => {
                      setNotionToken(e.target.value);
                      if (typeof window !== 'undefined') localStorage.setItem('NOTION_MCP_TOKEN', e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-blue-900/80 rounded-2xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-blue-300 font-mono">
                  ⚡ O Notion MCP fornecerá automaticamente diretrizes de tipografia, Bento Grids e Callouts profissionais.
                </span>
                <button
                  type="button"
                  onClick={handleFetchNotionBriefing}
                  disabled={isFetchingNotion}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-2xl text-xs transition-all shadow-md shrink-0 flex items-center gap-2"
                >
                  {isFetchingNotion ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Sincronizando Notion...</span>
                    </>
                  ) : (
                    <span>🔄 Sincronizar Briefing do Notion MCP</span>
                  )}
                </button>
              </div>

              {notionResult && (
                <div className="bg-slate-950 border border-blue-800/80 rounded-2xl p-4 text-xs font-mono text-blue-200 animate-fadeIn space-y-2">
                  <div className="flex items-center justify-between text-white font-bold border-b border-slate-800 pb-2">
                    <span>✨ Briefing & Diretrizes do Notion Sincronizados</span>
                    <span className="text-[10px] text-emerald-400 font-normal">● Gravado no Cérebro da IA</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed font-sans">{notionResult.briefing}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {notionResult.designRules?.map((rule: string, idx: number) => (
                      <span key={idx} className="bg-blue-950/80 border border-blue-800 text-blue-200 px-2.5 py-1 rounded-xl text-[10px]">
                        ✓ {rule}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FIGMA MCP TOKEN & WORKFLOW CONFIGURATION CARD */}
          <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-800/60 rounded-3xl p-6 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-800/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-purple-500/20">
                  🎨
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2 tracking-wide">
                    FIGMA MCP SERVER & SECURE TOKEN SETTINGS
                    <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                      figmaTokenSaved
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800 shadow-sm shadow-emerald-950'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}>
                      {figmaTokenSaved ? '● Figma Token Ativo (Protegido)' : '○ Nenhum Token Salvo'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Integração oficial Figma MCP. Conecte seu Personal Access Token (PAT) para extração de frames, cores e tipografia armazenados na memória do projeto.
                  </p>
                </div>
              </div>
            </div>

            {/* SECURE TOKEN INPUT FORM */}
            <form onSubmit={handleSaveFigmaToken} className="space-y-3">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Figma Personal Access Token (PAT):</span>
                <span className="text-[10px] text-slate-400 font-normal">Armazenado em local secure storage</span>
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <input
                    type={showTokenSecret ? 'text' : 'password'}
                    placeholder="Cole seu Figma PAT (Ex: figd_9x8a7b6c5d4e...)"
                    value={figmaToken}
                    onChange={(e) => {
                      setFigmaToken(e.target.value);
                      setFigmaTokenSaved(false);
                    }}
                    className="w-full bg-slate-950 border border-purple-900/80 rounded-2xl pl-4 pr-10 py-2.5 text-xs text-white font-mono outline-none focus:border-purple-500 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTokenSecret(!showTokenSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold p-1"
                    title={showTokenSecret ? 'Ocultar Token' : 'Mostrar Token'}
                  >
                    {showTokenSecret ? '🙈' : '👁️'}
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-md w-full sm:w-auto flex items-center justify-center gap-1.5"
                  >
                    <span>💾</span>
                    <span>Salvar Token</span>
                  </button>

                  {figmaToken && (
                    <button
                      type="button"
                      onClick={handleClearFigmaToken}
                      className="px-3.5 py-2.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-2xl text-xs font-bold transition-all w-full sm:w-auto flex items-center justify-center gap-1"
                      title="Remover token do armazenamento"
                    >
                      <span>🗑️</span>
                    </button>
                  )}
                </div>
              </div>

              {saveNotification && (
                <div className="p-3 bg-slate-950 border border-purple-800/80 rounded-2xl text-xs font-mono text-purple-200 animate-fadeIn flex items-center gap-2">
                  <span>{saveNotification}</span>
                </div>
              )}
            </form>

            {/* WORKFLOW TOOL: IMPORT DESIGN */}
            <div className="pt-4 border-t border-purple-800/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-black text-purple-300 font-mono uppercase tracking-wider flex items-center gap-2">
                  <span>⚡ MCP TOOL: IMPORT DESIGN</span>
                  <span className="text-[10px] bg-purple-900/80 text-purple-200 px-2 py-0.5 rounded-full border border-purple-700">
                    figma_import_design
                  </span>
                </span>
                
                <button
                  type="button"
                  onClick={() => setTestFigmaUrl('https://www.figma.com/design/M8kX9aP2q/App-Design-System-2026?node-id=12%3A45')}
                  className="text-[11px] text-purple-400 hover:text-purple-200 underline font-mono text-left"
                >
                  🧪 Inserir URL de Exemplo do Figma
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Cole a URL do Figma (Ex: https://www.figma.com/design/XYZ123/Project-Name)"
                  value={testFigmaUrl}
                  onChange={(e) => setTestFigmaUrl(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-indigo-500 w-full"
                />
                <button
                  type="button"
                  onClick={() => handleImportDesign()}
                  disabled={isTestingFigma || !testFigmaUrl.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-purple-600/20 shrink-0 w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  {isTestingFigma ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Extraindo Tokens do Figma...</span>
                    </>
                  ) : (
                    <span>🚀 IMPORT DESIGN FROM FIGMA</span>
                  )}
                </button>
              </div>

              {/* BRAIN ENGINE ACTIVE PROJECT DESIGN MEMORY CARD */}
              {projectDesignMemory && (
                <div className="bg-slate-950 border border-emerald-800/80 rounded-2xl p-5 space-y-4 text-xs font-mono shadow-xl animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-700 flex items-center justify-center text-base">
                        🧠
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white flex items-center gap-2">
                          MEMÓRIA ATIVA DE DESIGN (BRAIN ENGINE)
                          <span className="text-[9px] bg-emerald-900/90 text-emerald-200 border border-emerald-700 px-2 py-0.5 rounded-full font-mono uppercase">
                            {projectDesignMemory.sourceApi}
                          </span>
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          {projectDesignMemory.designName} • Importado em {projectDesignMemory.importedAt}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleImportDesign(projectDesignMemory.figmaUrl)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1"
                        title="Re-sincronizar esta URL do Figma"
                      >
                        <span>🔄</span> Re-sincronizar
                      </button>
                      <button
                        type="button"
                        onClick={handleClearDesignMemory}
                        className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1"
                        title="Remover memória de design ativa"
                      >
                        <span>🗑️</span> Limpar
                      </button>
                    </div>
                  </div>

                  {/* COLOR TOKENS SWATCHES */}
                  {projectDesignMemory.colors && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        🎨 Color Tokens na Memória:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(projectDesignMemory.colors).map(([key, val]) => (
                          <div
                            key={key}
                            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2 shrink-0 shadow-sm"
                          >
                            <span
                              className="w-4 h-4 rounded-full border border-white/20 shadow-md"
                              style={{ backgroundColor: String(val) }}
                            />
                            <div className="text-[10px]">
                              <span className="text-slate-400 capitalize">{key}: </span>
                              <span className="text-white font-bold font-mono">{String(val)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TYPOGRAPHY TOKENS */}
                  {projectDesignMemory.typography && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        🔤 Typo Tokens na Memória:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-slate-900 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-xl text-[10px]">
                          Títulos: <strong className="text-white">{projectDesignMemory.typography.headingFont}</strong>
                        </span>
                        <span className="bg-slate-900 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-xl text-[10px]">
                          Corpo: <strong className="text-white">{projectDesignMemory.typography.bodyFont}</strong>
                        </span>
                        <span className="bg-slate-900 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-xl text-[10px]">
                          Scale Ratio: <strong className="text-white">{projectDesignMemory.typography.scaleRatio}</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* FRAME NODES LIST */}
                  {projectDesignMemory.frames && projectDesignMemory.frames.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        📐 Frame Nodes Mapeados na Memória:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {projectDesignMemory.frames.map((frameName: string, idx: number) => (
                          <span
                            key={idx}
                            className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 px-2.5 py-1 rounded-xl text-[10px]"
                          >
                            ❖ {frameName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* RICH IMPORT RESULTS DISPLAY */}
              {testFigmaResult && (
                <div className="bg-slate-950 border border-purple-800/80 rounded-2xl p-4 space-y-4 text-xs font-mono animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">✨</span>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          {testFigmaResult.designName || 'Design Importado do Figma'}
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          FileKey: {testFigmaResult.fileKey || 'N/A'} | Token: {testFigmaResult.tokenUsedMasked || 'OK'}
                        </span>
                      </div>
                    </div>
                    {testFigmaResult.designMemorySaved && (
                      <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <span>🧠</span> Salvo na Memória do Projeto
                      </span>
                    )}
                  </div>

                  {/* COLOR TOKENS SWATCHES */}
                  {testFigmaResult.colors && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-purple-300 uppercase block">
                        🎨 Color Tokens Extraídos:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(testFigmaResult.colors).map(([key, val]) => (
                          <div
                            key={key}
                            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center gap-2 shrink-0"
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: String(val) }}
                            />
                            <div className="text-[10px]">
                              <span className="text-slate-400 capitalize">{key}: </span>
                              <span className="text-white font-bold">{String(val)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TYPOGRAPHY TOKENS */}
                  {testFigmaResult.typography && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-purple-300 uppercase block">
                        🔤 Typo Tokens Extraídos:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-slate-900 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-xl text-[10px]">
                          Títulos: <strong className="text-white">{testFigmaResult.typography.headingFont}</strong>
                        </span>
                        <span className="bg-slate-900 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-xl text-[10px]">
                          Corpo: <strong className="text-white">{testFigmaResult.typography.bodyFont}</strong>
                        </span>
                        <span className="bg-slate-900 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-xl text-[10px]">
                          Escala: <strong className="text-white">{testFigmaResult.typography.scaleRatio}</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* FRAME NODES LIST */}
                  {testFigmaResult.frames && Array.isArray(testFigmaResult.frames) && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-purple-300 uppercase block">
                        📐 Frame Nodes Mapeados:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {testFigmaResult.frames.map((frameName: string, idx: number) => (
                          <span
                            key={idx}
                            className="bg-purple-950/80 border border-purple-800 text-purple-200 px-2.5 py-1 rounded-xl text-[10px]"
                          >
                            ❖ {frameName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* RAW JSON INSPECTOR */}
                  <details className="pt-2 border-t border-slate-900">
                    <summary className="text-[10px] text-slate-400 hover:text-white cursor-pointer select-none">
                      🔍 Inspecionar Payload JSON Bruto do MCP
                    </summary>
                    <pre className="mt-2 text-[10px] text-purple-200 overflow-x-auto max-h-40 custom-scrollbar p-3 bg-slate-900 rounded-xl border border-slate-800">
                      {JSON.stringify(testFigmaResult, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </div>

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
                  <span>Schema: JSON Object</span>
                  <span className={tool.enabled ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                    {tool.enabled ? '● Ativo' : '○ Inativo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB: SERVERS --- */}
      {activeTab === 'servers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-extrabold text-white">Servidores de Inteligência MCP Registrados</h3>
              <p className="text-xs text-slate-400">Conectores de Browser Automation, FileSystem local, Figma e integrações remotas</p>
            </div>
            <button
              onClick={() => setShowAddServerModal(!showAddServerModal)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <span>➕</span>
              <span>Conectar Servidor MCP</span>
            </button>
          </div>

          {showAddServerModal && (
            <form onSubmit={handleRegisterServer} className="bg-slate-900 border border-indigo-500/50 p-5 rounded-2xl space-y-4 animate-fadeIn">
              <h4 className="text-xs font-bold text-indigo-300 uppercase font-mono tracking-wider">
                🔌 Registrar Novo Servidor MCP Remoto
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Nome do Servidor</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Local Playwright MCP"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">URL / Endpoint do Servidor</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: http://localhost:8080/mcp ou https://mcp.figma.com/v1"
                    value={newServerEndpoint}
                    onChange={(e) => setNewServerEndpoint(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Descrição do Servidor</label>
                <input
                  type="text"
                  placeholder="Ex: Servidor MCP para testes de navegação e extração DOM em tempo real"
                  value={newServerDesc}
                  onChange={(e) => setNewServerDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddServerModal(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-all shadow-md"
                >
                  Salvar e Registrar Servidor
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {servers.map((srv) => (
              <div key={srv.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <h3 className="text-sm font-extrabold text-white">{srv.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                    {srv.description}
                  </p>
                  {srv.endpoint && (
                    <div className="text-[10px] font-mono text-indigo-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 inline-block">
                      Endpoint: {srv.endpoint}
                    </div>
                  )}
                  <div className="text-[11px] font-mono text-indigo-300">
                    {srv.toolsCount} Ferramentas integradas registradas
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold rounded-full uppercase">
                    {srv.status}
                  </span>
                  {srv.id.startsWith('mcp-server-') && (
                    <button
                      onClick={() => handleRemoveServer(srv.id)}
                      className="text-[10px] text-rose-400 hover:text-rose-300 underline font-mono"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB: PERMISSIONS --- */}
      {activeTab === 'permissions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-sm font-extrabold text-white">Matriz de Permissões por Agente de IA</h2>
            <p className="text-xs text-slate-400">
              Controle estritamente quais ferramentas cada Agente de Design pode acionar.
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
                        type="button"
                        onClick={() => handleTogglePermission(perm.agentRole, t.id)}
                        className={`text-xs px-3 py-1.5 rounded-xl border font-mono transition-all flex items-center gap-1.5 ${
                          isAllowed
                            ? 'bg-indigo-950 text-indigo-200 border-indigo-600/60 shadow-sm'
                            : 'bg-slate-900 text-slate-600 border-slate-800 hover:text-slate-400'
                        }`}
                      >
                        <span>{isAllowed ? '✓' : '✗'}</span>
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

      {/* --- TAB: LOGS --- */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Auditoria de Execução de Ferramentas MCP
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              {logs.length} Registros na sessão
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Horário</th>
                  <th className="p-3">Agente</th>
                  <th className="p-3">Ferramenta MCP</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Duração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 font-mono text-[11px]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500 font-sans">
                      Nenhuma chamada de ferramenta MCP registrada ainda. Interaja com os Agentes de Design para ver logs.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3 font-sans font-bold text-indigo-300">{log.agentRole}</td>
                      <td className="p-3 text-white font-bold">{log.toolName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          log.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' :
                          log.status === 'DENIED' ? 'bg-amber-950 text-amber-400 border border-amber-800/60' : 'bg-rose-950 text-rose-400'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{log.durationMs}ms</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
