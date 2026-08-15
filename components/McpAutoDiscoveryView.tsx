import React, { useState, useEffect } from 'react';
import { MCPServer, MCPTool } from '../types';
import { mcpDiscoveryService, AutoDiscoveryResult, DiscoveredCapability, TemplateRecommendation } from '../services/mcpDiscoveryService';
import { ProfessionalTemplate } from '../services/templateRegistry';
import { ProjectDesignMemory } from './McpToolsPanel';

interface McpAutoDiscoveryViewProps {
  servers: MCPServer[];
  tools: MCPTool[];
  projectDesignMemory: ProjectDesignMemory | null;
  activeTemplateId: string;
  onSelectTemplate: (template: ProfessionalTemplate) => void;
  onGenerateWithCoPilot: (template: ProfessionalTemplate) => void;
  onNavigateToTab?: (tab: 'tools' | 'servers' | 'permissions' | 'logs') => void;
}

export const McpAutoDiscoveryView: React.FC<McpAutoDiscoveryViewProps> = ({
  servers,
  tools,
  projectDesignMemory,
  activeTemplateId,
  onSelectTemplate,
  onGenerateWithCoPilot,
  onNavigateToTab
}) => {
  const [discoveryResult, setDiscoveryResult] = useState<AutoDiscoveryResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepMessage, setScanStepMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCapabilityFilter, setSelectedCapabilityFilter] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ProfessionalTemplate | null>(null);
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const runScan = () => {
    setIsScanning(true);
    setScanStepMessage('🔍 1/5: Escaneando servidores MCP conectados (Notion, Figma, Browser, Design)...');

    setTimeout(() => {
      setScanStepMessage('🎨 2/5: Analisando tokens de design Figma e memória do projeto...');
    }, 300);

    setTimeout(() => {
      setScanStepMessage('📝 3/5: Extraindo diretrizes do Notion MCP e regras de Bento Grid 3x3...');
    }, 650);

    setTimeout(() => {
      setScanStepMessage('🌐 4/5: Auditando capacidades do Browser MCP e motor de micro-interações...');
    }, 1000);

    setTimeout(() => {
      setScanStepMessage('⚡ 5/5: Cruzando sinais do projeto e calculando aderência dos templates...');
    }, 1300);

    setTimeout(() => {
      const result = mcpDiscoveryService.scanCapabilitiesAndContext(servers, tools, projectDesignMemory);
      setDiscoveryResult(result);
      setIsScanning(false);
      setScanStepMessage('');
      showNotification('✨ Scan de capacidades MCP e contexto do projeto concluído!');
    }, 1600);
  };

  useEffect(() => {
    const initial = mcpDiscoveryService.scanCapabilitiesAndContext(servers, tools, projectDesignMemory);
    setDiscoveryResult(initial);
  }, [servers, tools, projectDesignMemory]);

  const handleCopyPrompt = (template: ProfessionalTemplate) => {
    const promptText = `### DIRETIVAS DO TEMPLATE PROFISSIONAL NOTION MCP (${template.title})\n\n` +
      `Título: ${template.title}\n` +
      `Categoria: ${template.category}\n` +
      `Esquema de Cores: ${template.colorScheme}\n` +
      `Especificações de Layout: ${template.specs}\n` +
      `Componentes Chave: ${(template.sampleComponents || []).join(', ')}\n` +
      `Recursos MCP Integrados: ${(template.detectedMcpCapabilities || []).join(', ')}\n` +
      `Regra Obrigatória: Gerar página HTML5 completa, standalone, com Tailwind CSS CDN, Google Fonts (Plus Jakarta Sans/Inter), Bento Grid 3x3, Callouts destacados e animações suaves.`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(promptText);
      setCopiedTemplateId(template.id);
      showNotification(`📋 Diretrizes do template "${template.title}" copiadas para a área de transferência!`);
      setTimeout(() => setCopiedTemplateId(null), 3000);
    }
  };

  const categories = [
    { id: 'all', label: 'Todos os Templates', icon: '🌟' },
    { id: 'SaaS & AI Technology', label: 'SaaS & AI', icon: '🚀' },
    { id: 'Developer & Workflow Automation', label: 'Automação', icon: '🤖' },
    { id: 'Presentation & Pitch Decks', label: 'Apresentação', icon: '🎬' },
    { id: 'E-Commerce & Digital Goods', label: 'E-Commerce', icon: '🛍️' },
    { id: 'Finance & Data Analytics', label: 'Fintech', icon: '📊' },
    { id: 'Services & B2B Consulting', label: 'Agência', icon: '🏢' },
    { id: 'Personal Branding & Creative', label: 'Portfólio', icon: '💼' },
    { id: 'Mobile & Consumer Apps', label: 'Mobile App', icon: '📱' }
  ];

  const filteredRecommendations = (discoveryResult?.recommendedTemplates || []).filter((rec) => {
    const matchesCategory = selectedCategory === 'all' || rec.template.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      rec.template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.template.specs.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.detectedTags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCap =
      !selectedCapabilityFilter ||
      rec.requiredMcpCapabilities.some(c => c.toLowerCase().includes(selectedCapabilityFilter.toLowerCase()));

    return matchesCategory && matchesSearch && matchesCap;
  });

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-950 border border-indigo-500/80 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-mono flex items-center gap-3 animate-slideUp">
          <span>⚡</span>
          <span>{notification}</span>
        </div>
      )}

      {/* --- HERO HEADER & SCAN TRIGGER --- */}
      <div className="bg-gradient-to-r from-purple-950/90 via-slate-900 to-indigo-950/90 border border-purple-800/60 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase bg-purple-950 text-purple-300 border border-purple-700/80 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                Live MCP Scanner & Co-Pilot Engine
              </span>
              <span className="text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 border border-emerald-700/80 px-2.5 py-0.5 rounded-full font-bold">
                ● {discoveryResult?.capabilitiesCount || 11} Recursos Detectados
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white tracking-wide flex items-center gap-2">
              <span>🔍 AUTO-DISCOVERY DE RECURSOS & TEMPLATES MCP</span>
            </h2>
            
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              O motor de Auto-Discovery analisa em tempo real todos os servidores MCP conectados (Notion, Figma, Browser, FileSystem, Design), identifica os sinais do seu projeto e recomenda os templates com maior aderência estrutural e conversão.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={runScan}
              disabled={isScanning}
              className={`px-5 py-3 rounded-2xl font-bold text-xs transition-all shadow-xl flex items-center justify-center gap-2.5 ${
                isScanning
                  ? 'bg-purple-950/80 text-purple-300 border border-purple-700/50 cursor-wait'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-purple-500/20 active:scale-95'
              }`}
            >
              {isScanning ? (
                <>
                  <div className="w-4 h-4 border-2 border-purple-300/40 border-t-purple-200 rounded-full animate-spin" />
                  <span>Escaneando Recursos MCP...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>Executar Novo Scan de Recursos</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scan Progress Bar & Live Status */}
        {isScanning && (
          <div className="mt-5 pt-4 border-t border-purple-800/40 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-mono text-purple-300">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                {scanStepMessage}
              </span>
              <span className="text-[10px] text-purple-400 font-bold">Auto-Discovery Ativo</span>
            </div>
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 animate-pulse rounded-full w-full" />
            </div>
          </div>
        )}
      </div>

      {/* --- LIVE PROJECT CONTEXT & SIGNALS DASHBOARD --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Detected Niche */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg hover:border-purple-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
              <span>🎯</span> Nicho Detectado
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-800 rounded-full">
              {discoveryResult?.projectContextSummary.nicheConfidence || 95}% Match
            </span>
          </div>
          <h4 className="text-sm font-extrabold text-white">
            {discoveryResult?.projectContextSummary.niche || 'SaaS & AI Technology'}
          </h4>
          <p className="text-[11px] text-slate-400 leading-snug">
            Inferido a partir das regras de negócio, nós ativos no Canvas e palavras-chave do projeto.
          </p>
        </div>

        {/* Card 2: Figma Design Memory */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg hover:border-pink-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
              <span>🎨</span> Figma Dev Mode MCP
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              discoveryResult?.projectContextSummary.figmaDesignActive
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {discoveryResult?.projectContextSummary.figmaDesignActive ? '● Sincronizado' : '○ Não Conectado'}
            </span>
          </div>
          <h4 className="text-sm font-extrabold text-white truncate">
            {discoveryResult?.projectContextSummary.figmaDetails || 'Paleta Padrão: #8b5cf6 / #3b82f6'}
          </h4>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Tokens de cores & fontes</span>
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('tools')}
                className="text-pink-400 hover:text-pink-300 font-bold"
              >
                Configurar →
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Notion MCP Briefing */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg hover:border-blue-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
              <span>📝</span> Notion MCP Workspace
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              discoveryResult?.projectContextSummary.notionBriefingActive
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-blue-950 text-blue-300 border-blue-800'
            }`}>
              {discoveryResult?.projectContextSummary.notionBriefingActive ? '● Ativo' : '● Directives Ready'}
            </span>
          </div>
          <h4 className="text-sm font-extrabold text-white truncate">
            {discoveryResult?.projectContextSummary.notionDetails || 'Bento Grid 3x3 + Callouts'}
          </h4>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">PRD & Especificações</span>
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('tools')}
                className="text-blue-400 hover:text-blue-300 font-bold"
              >
                Configurar →
              </button>
            )}
          </div>
        </div>

        {/* Card 4: Brain Engine Knowledge */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
              <span>🧠</span> Memória do Cérebro
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded-full">
              {discoveryResult?.projectContextSummary.memoryRulesCount || 6} Regras
            </span>
          </div>
          <h4 className="text-sm font-extrabold text-white">
            Anti-Slop & Design Enforced
          </h4>
          <p className="text-[11px] text-slate-400 leading-snug">
            {discoveryResult?.projectContextSummary.canvasNodesDetectedCount || 4} nós de fluxo ativos no Canvas.
          </p>
        </div>

      </div>

      {/* --- DISCOVERED MCP CAPABILITIES MATRIX --- */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-indigo-950 border border-indigo-700 flex items-center justify-center text-sm">
              ⚡
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Matriz de Recursos & Ferramentas MCP Detectadas
              </h3>
              <p className="text-[11px] text-slate-400">
                Capacidades fornecidas pelos servidores ativos e disponíveis para a orquestração dos templates.
              </p>
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            {discoveryResult?.capabilities.length || 0} recursos operacionais
          </div>
        </div>

        {/* Capabilities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(discoveryResult?.capabilities || []).map((cap) => (
            <div
              key={cap.id}
              onClick={() => setSelectedCapabilityFilter(selectedCapabilityFilter === cap.capabilityName ? null : cap.capabilityName)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                selectedCapabilityFilter === cap.capabilityName
                  ? 'bg-purple-950/80 border-purple-500 shadow-md shadow-purple-500/20'
                  : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{cap.icon}</span>
                  <span className="text-xs font-bold text-white leading-tight">
                    {cap.capabilityName}
                  </span>
                </div>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                  cap.status === 'SYNCED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                  cap.status === 'ACTIVE' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                  'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {cap.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                {cap.description}
              </p>
              {cap.detectedData && (
                <div className="text-[10px] font-mono text-indigo-300 truncate bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800">
                  {cap.detectedData}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* --- CONTEXT-AWARE RECOMMENDED TEMPLATES SECTION --- */}
      <div className="space-y-4">
        
        {/* Section Title & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-white tracking-wide flex items-center gap-2">
              <span>✨ TEMPLATES SUGERIDOS COM BASE NO CONTEXTO DO PROJETO</span>
              <span className="text-[10px] font-mono uppercase bg-indigo-950 text-indigo-300 border border-indigo-800 px-2.5 py-0.5 rounded-full font-bold">
                {filteredRecommendations.length} Disponíveis
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Templates profissionais ranqueados por relevância e orquestrados com os servidores Notion, Figma e Design MCP.
            </p>
          </div>

          {/* Search Box */}
          <div className="w-full md:w-72 relative">
            <input
              type="text"
              placeholder="Buscar template, nicho ou recurso..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}

          {selectedCapabilityFilter && (
            <button
              type="button"
              onClick={() => setSelectedCapabilityFilter(null)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700 shrink-0 flex items-center gap-1"
            >
              <span>Filtro: {selectedCapabilityFilter}</span>
              <span>✕</span>
            </button>
          )}
        </div>

        {/* Recommendations Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredRecommendations.map((rec) => {
            const isTop = rec.priorityBadge === 'RECOMENDADO TOP 1';
            const isActive = activeTemplateId === rec.template.id;

            return (
              <div
                key={rec.template.id}
                className={`bg-slate-900/90 border rounded-3xl p-5 space-y-4 transition-all flex flex-col justify-between shadow-xl relative overflow-hidden ${
                  isActive
                    ? 'border-emerald-500/80 ring-2 ring-emerald-500/30'
                    : isTop
                    ? 'border-purple-600/80 shadow-purple-950/40 ring-1 ring-purple-500/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top Accent Gradient Bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${rec.template.bgGradient || 'from-indigo-600 to-purple-600'}`} />

                <div className="space-y-3.5">
                  {/* Card Header: Icon, Title, Badges & Match Score */}
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-md shrink-0">
                        {rec.template.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                          {rec.template.title}
                          {isActive && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 uppercase">
                              ✓ Ativo
                            </span>
                          )}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {rec.template.category}
                        </span>
                      </div>
                    </div>

                    {/* Match Score Badge */}
                    <div className="flex flex-col items-end shrink-0">
                      <div className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono border flex items-center gap-1.5 ${
                        rec.matchScore >= 96
                          ? 'bg-purple-950 text-purple-200 border-purple-500/80 shadow-md shadow-purple-500/20'
                          : rec.matchScore >= 90
                          ? 'bg-indigo-950 text-indigo-200 border-indigo-600/80'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        <span>🔥</span>
                        <span>{rec.matchScore}% MATCH</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">
                        {rec.priorityBadge}
                      </span>
                    </div>
                  </div>

                  {/* Tagline */}
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    {rec.template.tagline}
                  </p>

                  {/* Match Rationale / Why Recommended Box */}
                  <div className="bg-slate-950 border border-purple-900/60 rounded-2xl p-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-purple-300 font-bold font-mono text-[11px]">
                      <span>💡</span>
                      <span>Por que este template é recomendado?</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {rec.matchReason}
                    </p>
                  </div>

                  {/* MCP Capabilities Badges */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                      Recursos MCP Orquestrados:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {rec.requiredMcpCapabilities.map((cap, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-950 text-indigo-200 border border-indigo-900/60 px-2 py-0.5 rounded-lg text-[10px] font-mono flex items-center gap-1"
                        >
                          <span>⚡</span> {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Component Badges */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                      Componentes & Estrutura:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {rec.suggestedFeatures.map((feat, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-950/80 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-lg text-[10px]"
                        >
                          ✓ {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions Footer Bar */}
                <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(rec.template)}
                      className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-mono transition-all flex items-center gap-1.5"
                    >
                      <span>👁️</span>
                      <span>Especificações</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyPrompt(rec.template)}
                      className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-mono transition-all flex items-center gap-1.5"
                    >
                      <span>{copiedTemplateId === rec.template.id ? '✓' : '📋'}</span>
                      <span>{copiedTemplateId === rec.template.id ? 'Copiado!' : 'Prompt'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTemplate(rec.template);
                        showNotification(`📌 Template "${rec.template.title}" ativado como padrão no Notion MCP!`);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 cursor-default'
                          : 'bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60'
                      }`}
                    >
                      {isActive ? '✓ Template Ativo' : '📌 Ativar no Notion'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onGenerateWithCoPilot(rec.template);
                        showNotification(`🚀 Gerando mega página com o template "${rec.template.title}" via Co-Pilot...`);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                    >
                      <span>🚀</span>
                      <span>Gerar com IA</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {filteredRecommendations.length === 0 && (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <span className="text-3xl">🔍</span>
            <h4 className="text-sm font-bold text-white">Nenhum template encontrado</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Nenhum template corresponde aos filtros atuais. Tente buscar por outro termo ou selecione a categoria "Todos os Templates".
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
                setSelectedCapabilityFilter(null);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              Limpar Filtros
            </button>
          </div>
        )}

      </div>

      {/* --- TEMPLATE SPECS PREVIEW MODAL --- */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-scaleUp max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-3xl shadow-lg">
                  {previewTemplate.icon}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {previewTemplate.title}
                  </h3>
                  <span className="text-xs text-indigo-400 font-mono">
                    {previewTemplate.category}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Description & Tagline */}
            <div className="space-y-2">
              <p className="text-xs text-slate-200 font-medium">
                {previewTemplate.tagline}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {previewTemplate.description}
              </p>
            </div>

            {/* Color Scheme & Gradient */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">Esquema de Cores & Tokens:</span>
                <span className="text-indigo-300 font-bold">{previewTemplate.colorScheme}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">Recomendado para:</span>
                <span className="text-slate-200 font-medium">{previewTemplate.recommendedFor}</span>
              </div>
            </div>

            {/* Specifications Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
                Especificações Técnicas de Layout (Notion MCP Enforced):
              </h4>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-300 leading-relaxed">
                {previewTemplate.specs}
              </div>
            </div>

            {/* Sample Components */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
                Componentes Inclusos na Geração:
              </h4>
              <div className="flex flex-wrap gap-2">
                {(previewTemplate.sampleComponents || []).map((comp, idx) => (
                  <span
                    key={idx}
                    className="bg-indigo-950/80 border border-indigo-800 text-indigo-200 px-3 py-1 rounded-xl text-xs font-mono"
                  >
                    ✓ {comp}
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTemplate(previewTemplate);
                  setPreviewTemplate(null);
                  showNotification(`📌 Template "${previewTemplate.title}" ativado como padrão no Notion MCP!`);
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                📌 Ativar como Template do Notion MCP
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = previewTemplate;
                  setPreviewTemplate(null);
                  onGenerateWithCoPilot(target);
                  showNotification(`🚀 Gerando mega página com o template "${target.title}" via Co-Pilot...`);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-1.5"
              >
                <span>🚀</span>
                <span>Gerar Página com Co-Pilot</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
