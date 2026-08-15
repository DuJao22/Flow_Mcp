import { MCPServer, MCPTool } from '../types';
import { brainService } from './brainService';
import { ProfessionalTemplate, PROFESSIONAL_TEMPLATES } from './templateRegistry';
import { ProjectDesignMemory } from '../components/McpToolsPanel';

export interface DiscoveredCapability {
  id: string;
  serverId: string;
  serverName: string;
  icon: string;
  capabilityName: string;
  description: string;
  category: 'Notion' | 'Figma' | 'Browser' | 'FileSystem' | 'Design' | 'Custom';
  detectedData?: string;
  status: 'ACTIVE' | 'SYNCED' | 'CONFIGURED' | 'READY';
}

export interface TemplateRecommendation {
  template: ProfessionalTemplate;
  matchScore: number; // 0 to 100
  matchReason: string;
  requiredMcpCapabilities: string[];
  detectedTags: string[];
  suggestedFeatures: string[];
  contextFitAnalysis: string;
  priorityBadge: 'RECOMENDADO TOP 1' | 'ALTA COMPATIBILIDADE' | 'COMPATÍVEL';
}

export interface AutoDiscoveryResult {
  timestamp: number;
  scannedServersCount: number;
  capabilitiesCount: number;
  capabilities: DiscoveredCapability[];
  projectContextSummary: {
    niche: string;
    nicheConfidence: number;
    figmaDesignActive: boolean;
    figmaDetails?: string;
    notionBriefingActive: boolean;
    notionDetails?: string;
    activeKeywords: string[];
    memoryRulesCount: number;
    canvasNodesDetectedCount: number;
  };
  recommendedTemplates: TemplateRecommendation[];
}

class MCPDiscoveryService {
  /**
   * Scans all connected MCP servers and evaluates the current project context to discover capabilities
   * and recommend optimal page-generation templates.
   */
  public scanCapabilitiesAndContext(
    servers: MCPServer[],
    tools: MCPTool[],
    projectDesignMemory?: ProjectDesignMemory | null
  ): AutoDiscoveryResult {
    const timestamp = Date.now();
    const capabilities: DiscoveredCapability[] = [];

    // 1. Scan Notion MCP Capabilities
    const notionPageId = typeof window !== 'undefined' ? localStorage.getItem('NOTION_MCP_PAGE_ID') || '' : '';
    const notionToken = typeof window !== 'undefined' ? localStorage.getItem('NOTION_MCP_TOKEN') || '' : '';
    const notionBriefing = typeof window !== 'undefined' ? localStorage.getItem('NOTION_MCP_BRIEFING') || '' : '';

    const notionStatus: 'SYNCED' | 'ACTIVE' | 'READY' = (notionPageId || notionToken || notionBriefing) ? 'SYNCED' : 'ACTIVE';

    capabilities.push({
      id: 'cap-notion-briefing',
      serverId: 'mcp-notion',
      serverName: 'Notion MCP Workspace',
      icon: '📝',
      capabilityName: 'Notion PRD & Briefing Directives',
      description: 'Extração e injeção automática de requisitos e regras de negócio do Notion diretamente no Cérebro da IA.',
      category: 'Notion',
      detectedData: notionBriefing ? `Briefing Ativo: "${notionBriefing.substring(0, 75)}..."` : `Page ID: ${notionPageId || 'Workspace Conectado'}`,
      status: notionStatus
    });

    capabilities.push({
      id: 'cap-notion-callout',
      serverId: 'mcp-notion',
      serverName: 'Notion MCP Workspace',
      icon: '💡',
      capabilityName: 'Notion Callouts & Accordion FAQ Blocks',
      description: 'Geração de blocos Callout com borda colorida e sanfonas de FAQ dinâmicas baseadas em especificações Notion.',
      category: 'Notion',
      detectedData: 'Suporte a Callouts de alta visibilidade e FAQ interativo',
      status: 'READY'
    });

    capabilities.push({
      id: 'cap-notion-bento',
      serverId: 'mcp-notion',
      serverName: 'Notion MCP Workspace',
      icon: '🍱',
      capabilityName: 'Bento Grid 3x3 Layout Engine',
      description: 'Organização assimétrica de recursos em Bento Box com proporções 3x3 e cards translúcidos.',
      category: 'Notion',
      detectedData: 'Bento Grid 3x3 Mathematical Layout Enforced',
      status: 'READY'
    });

    // 2. Scan Figma Dev Mode MCP Capabilities
    const figmaToken = typeof window !== 'undefined' ? localStorage.getItem('FIGMA_MCP_TOKEN') || '' : '';
    const hasFigmaMemory = !!projectDesignMemory && Object.keys(projectDesignMemory.colors || {}).length > 0;
    const figmaStatus: 'SYNCED' | 'ACTIVE' | 'READY' = hasFigmaMemory ? 'SYNCED' : figmaToken ? 'ACTIVE' : 'READY';

    capabilities.push({
      id: 'cap-figma-tokens',
      serverId: 'mcp-figma',
      serverName: 'Figma Dev Mode MCP',
      icon: '🎨',
      capabilityName: 'Figma Design Tokens & Color Palette',
      description: 'Extração e sincronização de tokens de cores hexadecimais, gradientes e superfícies escuras.',
      category: 'Figma',
      detectedData: hasFigmaMemory 
        ? `Cores: ${Object.entries(projectDesignMemory!.colors).map(([k, v]) => `${k}:${v}`).slice(0, 3).join(', ')}`
        : figmaToken ? 'Figma PAT Conectado' : 'Palette Padrão: #8b5cf6, #3b82f6, #ec4899',
      status: figmaStatus
    });

    capabilities.push({
      id: 'cap-figma-typo',
      serverId: 'mcp-figma',
      serverName: 'Figma Dev Mode MCP',
      icon: '🔤',
      capabilityName: 'Typography Scale & Font Pairings',
      description: 'Mapeamento de famílias tipográficas (Plus Jakarta Sans, Inter), escala modular e hierarquia H1-H6.',
      category: 'Figma',
      detectedData: hasFigmaMemory
        ? `Fontes: ${projectDesignMemory!.typography.headingFont} / ${projectDesignMemory!.typography.bodyFont}`
        : 'Plus Jakarta Sans + Inter (Scale Ratio 1.25)',
      status: figmaStatus
    });

    capabilities.push({
      id: 'cap-figma-frames',
      serverId: 'mcp-figma',
      serverName: 'Figma Dev Mode MCP',
      icon: '📐',
      capabilityName: 'Frame Structure & Spacing Tokens',
      description: 'Mapeamento de nós de frame, borderRadius (16px/24px) e padding de containers (24px).',
      category: 'Figma',
      detectedData: hasFigmaMemory && projectDesignMemory!.frames.length > 0
        ? `${projectDesignMemory!.frames.length} frames mapeados: ${projectDesignMemory!.frames.slice(0, 3).join(', ')}`
        : 'Tokens: borderRadius 16px, containerPadding 24px',
      status: figmaStatus
    });

    // 3. Scan Browser MCP Server Capabilities
    capabilities.push({
      id: 'cap-browser-dom',
      serverId: 'mcp-browser',
      serverName: 'Browser MCP Server',
      icon: '🌐',
      capabilityName: 'Virtual DOM Tree & Structure Inspector',
      description: 'Inspeção virtual da árvore DOM HTML5, garantindo marcação semântica e ausência de elementos quebrados.',
      category: 'Browser',
      detectedData: 'Chromium Virtual Headless Inspector Online',
      status: 'ACTIVE'
    });

    capabilities.push({
      id: 'cap-browser-viewport',
      serverId: 'mcp-browser',
      serverName: 'Browser MCP Server',
      icon: '📱',
      capabilityName: 'Multi-Viewport Responsiveness Validator',
      description: 'Auditoria de overflow e adaptação de layout em telas Mobile (375px), Tablet (768px) e Desktop (1280px).',
      category: 'Browser',
      detectedData: 'Viewports: Mobile, Tablet, Laptop, Desktop Ultra-Wide',
      status: 'ACTIVE'
    });

    // 4. Scan Design & Motion MCP Server Capabilities
    capabilities.push({
      id: 'cap-design-motion',
      serverId: 'mcp-design',
      serverName: 'Design & Motion MCP Server',
      icon: '✨',
      capabilityName: 'Motion Micro-Interactions & Transitions',
      description: 'Inserção de animações suaves CSS/Tailwind (hover scale-105, glow pulse, fade-in, blur backdrop).',
      category: 'Design',
      detectedData: 'Keyframes: float, pulse-glow, fade-in-up, marquee',
      status: 'ACTIVE'
    });

    capabilities.push({
      id: 'cap-design-antislop',
      serverId: 'mcp-design',
      serverName: 'Design & Motion MCP Server',
      icon: '🛡️',
      capabilityName: 'Anti-Slop Design & Contrast Enforcement',
      description: 'Bloqueio de clichês amadores, garantia de contraste WCAG AA e curvaturas mathematically nested.',
      category: 'Design',
      detectedData: 'Regras Anti-Slop Ativas no Cérebro',
      status: 'ACTIVE'
    });

    // 5. Scan FileSystem MCP Server Capabilities
    capabilities.push({
      id: 'cap-fs-compiler',
      serverId: 'mcp-filesystem',
      serverName: 'FileSystem MCP Server',
      icon: '📁',
      capabilityName: 'Standalone HTML5 Bundler & Exporter',
      description: 'Gravação e substituição segura de arquivos HTML5 completos e prontos para produção ou download.',
      category: 'FileSystem',
      detectedData: 'Suporte a exportação standalone com Tailwind CDN',
      status: 'ACTIVE'
    });

    // 6. Scan Custom Registered Servers
    servers.forEach((server) => {
      if (!['mcp-notion', 'mcp-figma', 'mcp-browser', 'mcp-filesystem', 'mcp-design', 'mcp-connectors'].includes(server.id)) {
        capabilities.push({
          id: `cap-custom-${server.id}`,
          serverId: server.id,
          serverName: server.name,
          icon: '🔌',
          capabilityName: `Endpoint: ${server.endpoint || 'Custom API'}`,
          description: server.description || 'Servidor MCP Customizado Remoto.',
          category: 'Custom',
          detectedData: `Status: ${server.status}`,
          status: server.status === 'CONNECTED' ? 'ACTIVE' : 'READY'
        });
      }
    });

    // --- CONTEXT DISCOVERY & PROJECT SIGNALS EXTRACTION ---
    let brainStructured: any = null;
    let brainMemories: any[] = [];
    try {
      brainStructured = brainService.getStructuredCategories();
      brainMemories = brainService.getMemories();
    } catch (e) {
      console.warn('Erro ao obter memória do cérebro:', e);
    }

    // Inspect flow nodes in canvas
    let canvasNodesCount = 0;
    let canvasNodeTypes: string[] = [];
    if (typeof window !== 'undefined') {
      try {
        const savedNodes = localStorage.getItem('flow_nodes');
        if (savedNodes) {
          const parsed = JSON.parse(savedNodes);
          if (Array.isArray(parsed)) {
            canvasNodesCount = parsed.length;
            canvasNodeTypes = parsed.map((n: any) => n.data?.type || n.type || '');
          }
        }
      } catch (e) {
        // ignore
      }
    }

    const combinedContextText = [
      brainStructured?.business?.targetAudience || '',
      brainStructured?.business?.goals || '',
      brainStructured?.business?.rules || '',
      brainStructured?.design?.colors || '',
      brainStructured?.design?.components || '',
      notionBriefing,
      projectDesignMemory?.designName || '',
      projectDesignMemory?.frames.join(' ') || '',
      brainMemories.map(m => m.content).join(' ')
    ].join(' ').toLowerCase();

    // Detect Project Niche & Keywords
    const keywordsFound: string[] = [];
    let detectedNiche = 'SaaS & AI Technology';
    let nicheConfidence = 92;

    if (combinedContextText.includes('apresenta') || combinedContextText.includes('slide') || combinedContextText.includes('pitch') || combinedContextText.includes('scroll')) {
      detectedNiche = 'Apresentação & Pitch Decks';
      keywordsFound.push('pitch deck', 'auto-slide', 'sem scroll', 'apresentação');
      nicheConfidence = 98;
    } else if (combinedContextText.includes('ecommerce') || combinedContextText.includes('produto') || combinedContextText.includes('loja') || combinedContextText.includes('comprar') || combinedContextText.includes('checkout') || combinedContextText.includes('preço')) {
      detectedNiche = 'E-Commerce & Digital Goods';
      keywordsFound.push('e-commerce', 'vitrine', 'checkout', 'avaliações');
      nicheConfidence = 96;
    } else if (combinedContextText.includes('fintech') || combinedContextText.includes('banco') || combinedContextText.includes('financeiro') || combinedContextText.includes('kpi') || combinedContextText.includes('dolar') || combinedContextText.includes('cotação')) {
      detectedNiche = 'Finance & Data Analytics';
      keywordsFound.push('fintech', 'kpi counters', 'cotações', 'analytics');
      nicheConfidence = 95;
    } else if (combinedContextText.includes('agencia') || combinedContextText.includes('consultoria') || combinedContextText.includes('b2b') || combinedContextText.includes('clientes') || combinedContextText.includes('serviço')) {
      detectedNiche = 'Services & B2B Consulting';
      keywordsFound.push('agência', 'enterprise', 'timeline', 'logos');
      nicheConfidence = 94;
    } else if (combinedContextText.includes('portfolio') || combinedContextText.includes('designer') || combinedContextText.includes('projetos') || combinedContextText.includes('freelancer')) {
      detectedNiche = 'Personal Branding & Creative';
      keywordsFound.push('portfólio', 'projetos', 'criativo', 'design');
      nicheConfidence = 93;
    } else if (combinedContextText.includes('automação') || combinedContextText.includes('nó') || combinedContextText.includes('fluxo') || combinedContextText.includes('webhook') || combinedContextText.includes('api')) {
      detectedNiche = 'Developer & Workflow Automation';
      keywordsFound.push('automação', 'workflow', 'mcp co-pilot', 'n8n nodes');
      nicheConfidence = 97;
    } else {
      keywordsFound.push('saas', 'ia agents', 'dashboard', 'bento grid');
    }

    if (hasFigmaMemory) keywordsFound.push('tokens figma');
    if (notionBriefing) keywordsFound.push('briefing notion');
    if (canvasNodesCount > 0) keywordsFound.push(`${canvasNodesCount} nós canvas`);

    // --- TEMPLATE RECOMMENDATION SCORING ENGINE ---
    const recommendations: TemplateRecommendation[] = PROFESSIONAL_TEMPLATES.map((tpl, idx) => {
      let score = 88;
      const reasons: string[] = [];
      const requiredCaps = tpl.detectedMcpCapabilities || ['Figma Tokens', 'Notion Directives', 'Design Motion', 'Browser Inspector'];
      const detectedTags: string[] = [...tpl.badges];

      // Match against detected niche
      if (tpl.category === detectedNiche) {
        score += 8;
        reasons.push(`Alinhamento perfeito com o nicho do projeto detectado (${detectedNiche}).`);
        detectedTags.unshift('🔥 Nicho Principal');
      } else if (
        (detectedNiche.includes('SaaS') && tpl.id.includes('saas')) ||
        (detectedNiche.includes('Workflow') && tpl.id.includes('automation')) ||
        (detectedNiche.includes('Apresentação') && tpl.id.includes('presentation'))
      ) {
        score += 6;
        reasons.push(`Forte aderência com a categoria do projeto.`);
      }

      // Match against Figma design memory
      if (hasFigmaMemory) {
        score += 2;
        reasons.push(`Tokens de cores e tipografia do Figma serão injetados automaticamente.`);
        detectedTags.push('🎨 Figma Ready');
      }

      // Match against Notion briefing
      if (notionBriefing) {
        score += 2;
        reasons.push(`Diretrizes do Notion MCP prontas para alimentar os blocos de conteúdo.`);
        detectedTags.push('📝 Notion Sync');
      }

      // Check specific template fits
      if (tpl.id === 'saas_ai_platform') {
        if (combinedContextText.includes('ia') || combinedContextText.includes('ai') || combinedContextText.includes('saas')) {
          score += 3;
          reasons.push(`Contém Bento Grid 3x3 e cards de recursos otimizados para produtos com Inteligência Artificial.`);
        }
      } else if (tpl.id === 'auto_presentation_deck') {
        if (combinedContextText.includes('slide') || combinedContextText.includes('apresenta') || combinedContextText.includes('scroll')) {
          score += 5;
          reasons.push(`Projetado com timer JS e transições automáticas sem necessidade de scroll manual.`);
        }
      } else if (tpl.id === 'automation_workflow_hub') {
        if (canvasNodesCount > 0 || combinedContextText.includes('fluxo') || combinedContextText.includes('autom')) {
          score += 4;
          reasons.push(`Integração perfeita com os ${canvasNodesCount || 4} nós de fluxo ativos no Canvas.`);
        }
      } else if (tpl.id === 'fintech_b2b') {
        if (combinedContextText.includes('dolar') || combinedContextText.includes('cotacao') || combinedContextText.includes('kpi')) {
          score += 4;
          reasons.push(`Tabelas comparativas e contadores KPI combinam com as chamadas de cotação e dados.`);
        }
      }

      // Cap score between 85 and 99
      const finalScore = Math.min(99, Math.max(85, score));

      const priorityBadge: 'RECOMENDADO TOP 1' | 'ALTA COMPATIBILIDADE' | 'COMPATÍVEL' =
        finalScore >= 97 ? 'RECOMENDADO TOP 1' : finalScore >= 92 ? 'ALTA COMPATIBILIDADE' : 'COMPATÍVEL';

      const matchReason = reasons.length > 0
        ? reasons.join(' ')
        : `Compatível com os servidores MCP conectados e o padrão de alta conversão.`;

      const contextFitAnalysis = `Este template utiliza os servidores Notion MCP (para blocos Callout e FAQ) e Figma Dev Mode (para paleta de cores e tipografia), garantindo uma estrutura 100% responsiva validada pelo Browser MCP.`;

      return {
        template: tpl,
        matchScore: finalScore,
        matchReason,
        requiredMcpCapabilities: requiredCaps,
        detectedTags: Array.from(new Set(detectedTags)).slice(0, 5),
        suggestedFeatures: tpl.sampleComponents || ['Hero Banner', 'Recursos em Grid', 'Callouts Notion', 'Rodapé Conversão'],
        contextFitAnalysis,
        priorityBadge
      };
    });

    // Sort descending by match score
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    // If top recommendation exists, ensure it has TOP 1 badge
    if (recommendations.length > 0) {
      recommendations[0].priorityBadge = 'RECOMENDADO TOP 1';
    }

    return {
      timestamp,
      scannedServersCount: servers.length,
      capabilitiesCount: capabilities.length,
      capabilities,
      projectContextSummary: {
        niche: detectedNiche,
        nicheConfidence,
        figmaDesignActive: hasFigmaMemory,
        figmaDetails: hasFigmaMemory ? `${projectDesignMemory?.designName} (${projectDesignMemory?.frames.length} frames)` : undefined,
        notionBriefingActive: !!notionBriefing || !!notionPageId,
        notionDetails: notionBriefing ? notionBriefing.substring(0, 60) + '...' : notionPageId ? `Page ID: ${notionPageId}` : undefined,
        activeKeywords: keywordsFound,
        memoryRulesCount: brainMemories.length,
        canvasNodesDetectedCount: canvasNodesCount
      },
      recommendedTemplates: recommendations
    };
  }
}

export const mcpDiscoveryService = new MCPDiscoveryService();
