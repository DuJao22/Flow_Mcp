import React, { useState, useEffect } from 'react';
import { GeneratedFile, DesignCriticScore, PageVersion, DesignProblem, ActiveMcpConsultation } from '../types';
import { designAgentService } from '../services/designAgentService';
import { mcpService } from '../services/mcpService';
import { keyManager } from '../services/keyManager';
import { brainService } from '../services/brainService';
import { ProfessionalTemplate, PROFESSIONAL_TEMPLATES } from '../services/templateRegistry';

export type { ProfessionalTemplate };
export { PROFESSIONAL_TEMPLATES };

interface DesignLabViewProps {
  files: GeneratedFile[];
  onUpdateFile: (fileId: string, newContent: string) => void;
  onAddFile?: (file: GeneratedFile) => void;
}

export const DesignLabView: React.FC<DesignLabViewProps> = ({ files, onUpdateFile, onAddFile }) => {
  // HTML Files Selection
  const htmlFiles = files.filter(f => f.extension === 'html' || f.name.endsWith('.html'));

  const [selectedFileId, setSelectedFileId] = useState<string>(
    htmlFiles.length > 0 ? htmlFiles[0].id : ''
  );

  const currentFile = htmlFiles.find(f => f.id === selectedFileId) || htmlFiles[0] || null;

  const DEFAULT_STARTER_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flow Architect AI — Design Lab Prototype</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between">
  <!-- Navigation Header -->
  <header class="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md p-5 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg shadow-purple-600/30">
          ✨
        </div>
        <span class="font-extrabold text-lg bg-gradient-to-r from-white via-slate-200 to-purple-300 bg-clip-text text-transparent">
          Flow Design Lab
        </span>
      </div>
      <nav class="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
        <a href="#recursos" class="hover:text-purple-300 transition-colors">Recursos</a>
        <a href="#planos" class="hover:text-purple-300 transition-colors">Planos</a>
        <a href="#depoimentos" class="hover:text-purple-300 transition-colors">Depoimentos</a>
      </nav>
      <button class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-purple-600/25 transition-all hover:scale-105">
        Solicitar Proposta
      </button>
    </div>
  </header>

  <!-- Hero Section -->
  <main class="max-w-5xl mx-auto px-6 py-20 text-center space-y-8 my-auto">
    <div class="inline-flex items-center gap-2 bg-purple-950/80 border border-purple-800 text-purple-300 text-xs px-4 py-1.5 rounded-full font-bold">
      ✨ Flow Architect AI Design Lab 2.0
    </div>
    <h1 class="text-5xl sm:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-purple-400 bg-clip-text text-transparent leading-tight">
      Agência Digital de Alto Impacto
    </h1>
    <p class="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
      Crie, analise, melhore e aplique animações cinematográficas automaticamente com nossos Agentes de Inteligência Artificial em tempo real.
    </p>
    <div class="flex flex-wrap items-center justify-center gap-4 pt-4">
      <button class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm px-8 py-3.5 rounded-2xl shadow-xl shadow-purple-600/30 transition-all hover:scale-105">
        Começar Agora
      </button>
      <button class="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-sm px-8 py-3.5 rounded-2xl transition-all">
        Ver Portfólio
      </button>
    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-900 p-6 text-center text-xs text-slate-500">
    © 2026 Flow Architect AI • Criado para alta conversão.
  </footer>
</body>
</html>`;

  const [htmlContent, setHtmlContent] = useState<string>(
    currentFile ? currentFile.content : DEFAULT_STARTER_HTML
  );

  // Sync selected file content
  useEffect(() => {
    if (currentFile) {
      setHtmlContent(currentFile.content);
    }
  }, [selectedFileId]);

  // Main Active Tab inside Canvas Area: 'preview' | 'code' | 'styles'
  const [activeCanvasTab, setActiveCanvasTab] = useState<'preview' | 'code' | 'styles'>('preview');

  // Viewport Presets
  const [viewport, setViewport] = useState<'desktop' | 'laptop' | 'tablet' | 'mobile'>('desktop');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // AI Critic State
  const [criticScore, setCriticScore] = useState<DesignCriticScore | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fixingProblemId, setFixingProblemId] = useState<string | null>(null);

  // Autonomous Loop State
  const [isImproving, setIsImproving] = useState(false);
  const [loopStatusText, setLoopStatusText] = useState('');

  // Page Versions
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string>('');

  // Toast / Status Message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Expand / Wide View Mode State
  const [expandPreview, setExpandPreview] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);

  // Design Lab Dedicated API Key Modal State
  const [showLabKeyModal, setShowLabKeyModal] = useState(false);
  const [labKeyInput, setLabKeyInput] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('design_lab_gemini_key') || '' : ''
  );
  const [isLabKeySaved, setIsLabKeySaved] = useState<boolean>(
    typeof window !== 'undefined' ? !!localStorage.getItem('design_lab_gemini_key') : false
  );
  const [isTestingLabKey, setIsTestingLabKey] = useState(false);
  const [labKeyTestResult, setLabKeyTestResult] = useState<string | null>(null);

  const handleSaveLabKey = (e: React.FormEvent) => {
    e.preventDefault();
    keyManager.setLabKey(labKeyInput.trim());
    setIsLabKeySaved(!!labKeyInput.trim());
    setLabKeyTestResult('✅ Chave do Design Lab salva com sucesso!');
  };

  const handleRemoveLabKey = () => {
    keyManager.setLabKey('');
    setLabKeyInput('');
    setIsLabKeySaved(false);
    setLabKeyTestResult('ℹ️ Chave removida. O Design Lab utilizará a rotação de chaves padrão do sistema.');
  };

  const handleTestLabKey = async () => {
    if (!labKeyInput.trim()) {
      setLabKeyTestResult('⚠️ Insira uma chave de API para testar.');
      return;
    }
    setIsTestingLabKey(true);
    setLabKeyTestResult(null);
    try {
      keyManager.setLabKey(labKeyInput.trim());
      const score = await designAgentService.evaluatePageWithAiCritic(htmlContent);
      setLabKeyTestResult(`🎉 Conexão estabelecida com sucesso! AI Critic respondeu com nota ${score.total}/100.`);
      setIsLabKeySaved(true);
    } catch (err: any) {
      setLabKeyTestResult(`❌ Erro no teste com esta chave: ${err.message || 'Verifique a chave informada'}`);
    } finally {
      setIsTestingLabKey(false);
    }
  };

  // Natural Language Input
  const [nlPrompt, setNlPrompt] = useState('');
  const [isApplyingNl, setIsApplyingNl] = useState(false);

  // Before / After Compare
  const [compareMode, setCompareMode] = useState(false);

  // Figma Import Modal / State
  const [showFigmaModal, setShowFigmaModal] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState('');
  const [isImportingFigma, setIsImportingFigma] = useState(false);

  // New Page Modal / State
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [selectedArchetype, setSelectedArchetype] = useState('SaaS Landing Page');
  const [isGeneratingArchetype, setIsGeneratingArchetype] = useState(false);

  // Component Injector Dropdown
  const [showInjectorDropdown, setShowInjectorDropdown] = useState(false);
  const [isInjectingComponent, setIsInjectingComponent] = useState(false);

  // Theme Preset Switcher State
  const [isApplyingTheme, setIsApplyingTheme] = useState(false);

  // Real-Time "IA em Ação" MCP Co-Pilot Monitor State
  const [mcpConsultations, setMcpConsultations] = useState<ActiveMcpConsultation[]>([]);
  const [showMcpMonitorModal, setShowMcpMonitorModal] = useState(false);

  useEffect(() => {
    const unsubscribe = mcpService.subscribeToMcpActivity((consultations) => {
      setMcpConsultations(consultations);
    });
    return () => unsubscribe();
  }, []);

  // Notion MCP Professional Page Template Selector State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('NOTION_MCP_PAGE_TEMPLATE_ID') || 'saas_ai_platform' : 'saas_ai_platform'
  );
  const [activeTemplateLabel, setActiveTemplateLabel] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('NOTION_MCP_PAGE_TEMPLATE_LABEL') || 'SaaS AI Platform & Dashboard' : 'SaaS AI Platform & Dashboard'
  );
  const [isGeneratingFromTemplate, setIsGeneratingFromTemplate] = useState(false);

  // Handle Set Active Notion MCP Template
  const handleSelectActiveTemplate = async (template: ProfessionalTemplate) => {
    setActiveTemplateId(template.id);
    setActiveTemplateLabel(template.title);

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

    showToast(`📌 Template "${template.title}" ativo para todos os nós de geração (Notion MCP)!`);
  };

  // Handle Generate Page From Template
  const handleGeneratePageFromTemplate = async (template: ProfessionalTemplate) => {
    setIsGeneratingFromTemplate(true);
    await handleSelectActiveTemplate(template);

    // Trigger real-time MCP Co-Pilot session visual indicators
    mcpService.triggerMcpCoPilotBuildSession(`Gerando mega página com o template ${template.title}`);

    try {
      const generatedHtml = await designAgentService.generateArchetypeTemplate(template.title);
      const fileName = `page_${template.id}.html`;

      const newFileObj: GeneratedFile = {
        id: `html-${Date.now()}`,
        name: fileName,
        content: generatedHtml,
        extension: 'html',
        timestamp: Date.now(),
        nodeId: 'design-lab'
      };

      if (onAddFile) {
        onAddFile(newFileObj);
      }
      setSelectedFileId(newFileObj.id);
      setHtmlContent(generatedHtml);

      const score = await designAgentService.evaluatePageWithAiCritic(generatedHtml);
      setCriticScore(score);

      setShowTemplateModal(false);
      showToast(`🚀 Nova página criada com o template "${template.title}"!`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingFromTemplate(false);
    }
  };

  // Handle Apply Template Structure To Current Page
  const handleApplyTemplateToCurrentPage = async (template: ProfessionalTemplate) => {
    setIsGeneratingFromTemplate(true);
    await handleSelectActiveTemplate(template);

    // Trigger real-time MCP Co-Pilot session visual indicators
    mcpService.triggerMcpCoPilotBuildSession(`Reestruturando página com o template ${template.title}`);

    try {
      const prompt = `Reconstrua a estrutura e o layout da página web abaixo seguindo o template profissional do Notion MCP '${template.title}': ${template.specs}. Mantenha o conteúdo existente, porém organizando-o com Bento Grid 3x3, Callouts de alta visibilidade, tipografia impecável, cores ${template.colorScheme} e animações suaves.`;
      
      const updatedHtml = await designAgentService.applyNaturalLanguageChange(htmlContent, prompt);
      setHtmlContent(updatedHtml);
      if (currentFile) onUpdateFile(currentFile.id, updatedHtml);

      const score = await designAgentService.evaluatePageWithAiCritic(updatedHtml);
      setCriticScore(score);

      setShowTemplateModal(false);
      showToast(`🎨 Layout reestruturado de acordo com o template "${template.title}"!`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingFromTemplate(false);
    }
  };

  // Handle Create New Page File
  const handleCreateNewPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim()) return;

    setIsGeneratingArchetype(true);
    try {
      const generatedHtml = await designAgentService.generateArchetypeTemplate(selectedArchetype);
      const cleanFileName = newPageName.toLowerCase().endsWith('.html') ? newPageName : `${newPageName.toLowerCase().replace(/\s+/g, '_')}.html`;

      const newFileObj: GeneratedFile = {
        id: `html-${Date.now()}`,
        name: cleanFileName,
        content: generatedHtml,
        extension: 'html',
        timestamp: Date.now(),
        nodeId: 'design-lab'
      };

      if (onAddFile) {
        onAddFile(newFileObj);
      }
      setSelectedFileId(newFileObj.id);
      setHtmlContent(generatedHtml);

      const score = await designAgentService.evaluatePageWithAiCritic(generatedHtml);
      setCriticScore(score);

      setShowNewPageModal(false);
      setNewPageName('');
      showToast(`✨ Nova página "${cleanFileName}" criada com sucesso!`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingArchetype(false);
    }
  };

  // Handle Figma Design Import via Figma MCP
  const handleImportFigmaDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!figmaUrl.trim()) return;
    setIsImportingFigma(true);
    try {
      const figmaResult = await mcpService.executeTool('Visual Designer', 'figma_import_design', { url: figmaUrl });
      const generatedFromFigma = await designAgentService.applyNaturalLanguageChange(
        htmlContent,
        `Reconstrua a página com base no contexto importado do Figma: ${JSON.stringify(figmaResult)}. Crie seções limpas, responsivas, com tipografia moderna, cores harmônicas e cards sofisticados.`
      );
      setHtmlContent(generatedFromFigma);
      if (currentFile) onUpdateFile(currentFile.id, generatedFromFigma);

      const score = await designAgentService.evaluatePageWithAiCritic(generatedFromFigma);
      setCriticScore(score);
      setShowFigmaModal(false);
      setFigmaUrl('');
      showToast('🎉 Página reconstruída a partir dos tokens do Figma!');
    } catch (err) {
      console.error(err);
    } finally {
      setIsImportingFigma(false);
    }
  };

  // Run AI Critic Analysis
  const handleRunCritic = async () => {
    setIsAnalyzing(true);
    try {
      const score = await designAgentService.evaluatePageWithAiCritic(htmlContent);
      setCriticScore(score);

      // Record Version if empty
      if (versions.length === 0) {
        const v1: PageVersion = {
          id: `v-1-${Date.now()}`,
          versionNumber: 1,
          label: 'v1 - Original',
          htmlContent,
          timestamp: Date.now(),
          score,
          author: 'User'
        };
        setVersions([v1]);
        setActiveVersionId(v1.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    handleRunCritic();
  }, [selectedFileId]);

  // Handle Fix Specific AI Critic Problem Surgically
  const handleFixSpecificProblem = async (problem: DesignProblem) => {
    setFixingProblemId(problem.id);
    try {
      const updated = await designAgentService.fixSpecificProblem(htmlContent, problem);
      setHtmlContent(updated);
      if (currentFile) onUpdateFile(currentFile.id, updated);

      const newScore = await designAgentService.evaluatePageWithAiCritic(updated);
      setCriticScore(newScore);

      const newVer: PageVersion = {
        id: `v-${versions.length + 1}-${Date.now()}`,
        versionNumber: versions.length + 1,
        label: `v${versions.length + 1} - Fix: ${problem.category}`,
        htmlContent: updated,
        timestamp: Date.now(),
        score: newScore,
        author: 'AI Critic Fix'
      };
      setVersions(prev => [...prev, newVer]);
      setActiveVersionId(newVer.id);
      showToast(`🔧 Correção para "${problem.category}" aplicada!`);
    } catch (e) {
      console.error(e);
    } finally {
      setFixingProblemId(null);
    }
  };

  // Handle Inject UI Component
  const handleInjectComponent = async (componentType: string) => {
    setShowInjectorDropdown(false);
    setIsInjectingComponent(true);
    try {
      const updated = await designAgentService.injectComponent(htmlContent, componentType);
      setHtmlContent(updated);
      if (currentFile) onUpdateFile(currentFile.id, updated);

      const score = await designAgentService.evaluatePageWithAiCritic(updated);
      setCriticScore(score);
      showToast(`📦 Componente "${componentType}" injetado na página!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsInjectingComponent(false);
    }
  };

  // Handle Apply Theme Preset
  const handleApplyThemePreset = async (themeName: string) => {
    setIsApplyingTheme(true);
    try {
      const updated = await designAgentService.applyThemePreset(htmlContent, themeName);
      setHtmlContent(updated);
      if (currentFile) onUpdateFile(currentFile.id, updated);

      const score = await designAgentService.evaluatePageWithAiCritic(updated);
      setCriticScore(score);
      showToast(`🎨 Tema "${themeName}" aplicado com sucesso!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsApplyingTheme(false);
    }
  };

  // Handle Natural Language Instruction Apply
  const handleApplyNlChange = async (overridePrompt?: string) => {
    const promptToUse = overridePrompt || nlPrompt;
    if (!promptToUse.trim() || isApplyingNl) return;

    setIsApplyingNl(true);
    try {
      const updated = await designAgentService.applyNaturalLanguageChange(htmlContent, promptToUse);
      setHtmlContent(updated);
      if (currentFile) onUpdateFile(currentFile.id, updated);

      // Create new version
      const newScore = await designAgentService.evaluatePageWithAiCritic(updated);
      setCriticScore(newScore);

      const newVer: PageVersion = {
        id: `v-${versions.length + 1}-${Date.now()}`,
        versionNumber: versions.length + 1,
        label: `v${versions.length + 1} - ${promptToUse.substring(0, 20)}...`,
        htmlContent: updated,
        timestamp: Date.now(),
        score: newScore,
        author: 'AI Agent'
      };
      setVersions(prev => [...prev, newVer]);
      setActiveVersionId(newVer.id);
      if (!overridePrompt) setNlPrompt('');
      showToast('✨ Alteração aplicada pela IA com sucesso!');
    } catch (e) {
      console.error(e);
    } finally {
      setIsApplyingNl(false);
    }
  };

  // Autonomous Loop Execution
  const handleRunAutonomousLoop = async () => {
    setIsImproving(true);
    setLoopStatusText('Iniciando ciclo autônomo: RENDER ➔ ANALYZE ➔ IMPROVE...');

    try {
      const result = await designAgentService.runAutonomousImprovementLoop(htmlContent, {
        maxIterations: 3,
        targetScore: 90,
        categories: ['Visual', 'UX', 'Motion', 'Mobile', 'Performance', 'Conversion'],
        onIteration: (iter, html, score) => {
          setLoopStatusText(`Iteração ${iter}: Score obtido ${score.total}/100. Refinando...`);
        }
      });

      setHtmlContent(result.finalHtml);
      setCriticScore(result.finalScore);
      if (currentFile) onUpdateFile(currentFile.id, result.finalHtml);

      setVersions(prev => [...prev, ...result.history]);
      if (result.history.length > 0) {
        setActiveVersionId(result.history[result.history.length - 1].id);
      }
      showToast('🚀 Ciclo Autônomo concluído! Nota aprimorada.');
    } catch (e) {
      console.error(e);
    } finally {
      setIsImproving(false);
      setLoopStatusText('');
    }
  };

  // Motion Lab Execution
  const handleRunMotionLab = async (style: string) => {
    setIsApplyingNl(true);
    try {
      const updated = await designAgentService.applyMotionImprovements(htmlContent, style);
      setHtmlContent(updated);
      if (currentFile) onUpdateFile(currentFile.id, updated);

      const score = await designAgentService.evaluatePageWithAiCritic(updated);
      setCriticScore(score);
      showToast(`🎬 Transições "${style}" injetadas!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsApplyingNl(false);
    }
  };

  // Copy HTML Code to Clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(htmlContent);
    showToast('📋 Código HTML copiado para a área de transferência!');
  };

  // Download HTML File
  const handleDownloadHtml = () => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentFile?.name || 'index.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('💾 Arquivo .html baixado com sucesso!');
  };

  // Viewport Size Maps
  const viewportStyles = {
    desktop: 'w-full h-full min-h-[600px] max-w-[1920px]',
    laptop: 'w-[1280px] h-[800px] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden shrink-0 my-auto',
    tablet: 'w-[768px] h-[1024px] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden shrink-0 my-auto',
    mobile: 'w-[390px] h-[844px] border-[8px] border-slate-800 rounded-[40px] shadow-2xl overflow-hidden shrink-0 my-auto'
  };

  return (
    <div className="h-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto md:overflow-hidden custom-scrollbar relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 right-6 z-50 bg-purple-950 border border-purple-500 text-purple-100 px-4 py-2.5 rounded-2xl shadow-2xl font-mono text-xs flex items-center gap-2 animate-bounce">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Controls Bar */}
      <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-600 to-pink-500 flex items-center justify-center text-xl shadow-lg shadow-purple-500/20 shrink-0">
            🎨
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white flex items-center gap-2">
              DESIGN LAB 2.1
              <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-full font-mono whitespace-nowrap">
                AI Website & UX Builder
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 leading-tight">
              Análise em tempo real, refinamento cirúrgico de código e prototipagem inteligente.
            </p>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 shrink-0 w-full md:w-auto">
          
          {/* Page / File Selector + Add Page */}
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 pl-1 whitespace-nowrap">Página:</span>
            {htmlFiles.length > 0 ? (
              <select
                value={selectedFileId}
                onChange={(e) => setSelectedFileId(e.target.value)}
                className="bg-slate-900 text-xs font-mono text-purple-300 rounded-lg px-2 py-1 outline-none border border-slate-800 focus:border-purple-500 shrink-0 whitespace-nowrap"
              >
                {htmlFiles.map(f => (
                  <option key={f.id} value={f.id}>📄 {f.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-slate-500 font-mono italic px-2">Nenhuma página HTML</span>
            )}
            <button
              onClick={() => setShowNewPageModal(true)}
              className="p-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded-lg text-xs font-bold transition-all"
              title="Criar nova página HTML do zero ou via Arquétipo"
            >
              ➕
            </button>
          </div>

          {/* Version Selector */}
          {versions.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-400 pl-1 whitespace-nowrap">Versão:</span>
              <select
                value={activeVersionId}
                onChange={(e) => {
                  setActiveVersionId(e.target.value);
                  const ver = versions.find(v => v.id === e.target.value);
                  if (ver) {
                    setHtmlContent(ver.htmlContent);
                    if (ver.score) setCriticScore(ver.score);
                  }
                }}
                className="bg-slate-900 text-xs font-mono text-indigo-300 rounded-lg px-2 py-1 outline-none border border-slate-800 shrink-0 whitespace-nowrap"
              >
                {versions.map(v => (
                  <option key={v.id} value={v.id}>🔖 {v.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Component Injector Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowInjectorDropdown(!showInjectorDropdown)}
              disabled={isInjectingComponent}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-indigo-300 border border-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <span>📦</span>
              <span>Injetar UI</span>
              <span className="text-[10px]">▼</span>
            </button>

            {showInjectorDropdown && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-fadeIn">
                <span className="text-[9px] font-bold uppercase text-slate-500 px-2 py-1 block">Componentes Prontos</span>
                {[
                  { name: 'Pricing Table', icon: '💳' },
                  { name: 'Hero Section with Glow', icon: '🚀' },
                  { name: 'FAQ Accordion', icon: '❓' },
                  { name: 'Testimonials Grid', icon: '⭐' },
                  { name: 'Bento Grid Features', icon: '🍱' },
                  { name: 'Footer & Newsletter', icon: '📬' }
                ].map((comp) => (
                  <button
                    key={comp.name}
                    onClick={() => handleInjectComponent(comp.name)}
                    className="w-full text-left px-3 py-2 hover:bg-purple-950/80 hover:text-purple-200 text-slate-300 rounded-xl text-xs font-medium transition-all flex items-center gap-2"
                  >
                    <span>{comp.icon}</span>
                    <span>{comp.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Figma Import Button */}
          <button
            onClick={() => setShowFigmaModal(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            <span>🎨</span>
            <span>Figma MCP</span>
          </button>

          {/* Notion MCP Professional Templates Selector Button */}
          <button
            onClick={() => setShowTemplateModal(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            title="Selecionar Template Profissional consumido pelos nós de geração de página via Notion MCP"
          >
            <span>📋</span>
            <span>Templates Notion MCP</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase bg-blue-950 text-blue-200 border border-blue-700/60">
              {activeTemplateId ? activeTemplateId.split('_')[0].toUpperCase() : 'NOTION'}
            </span>
          </button>

          {/* Compare Toggle */}
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 whitespace-nowrap ${
              compareMode
                ? 'bg-purple-900/60 border-purple-500 text-purple-200'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            📊 Comparar
          </button>

          {/* Wide Preview Toggle */}
          <button
            onClick={() => setExpandPreview(!expandPreview)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              expandPreview
                ? 'bg-indigo-900/80 border-indigo-400 text-indigo-100 shadow-md shadow-indigo-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Expandir área de visualização da página"
          >
            <span>{expandPreview ? '◀ Painel' : '🔍 Vista Ampla'}</span>
          </button>

          {/* Design Lab Dedicated API Key Gear Button */}
          <button
            onClick={() => setShowLabKeyModal(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              isLabKeySaved
                ? 'bg-amber-950/80 border-amber-500/80 text-amber-200 shadow-md shadow-amber-950/40'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Configurar chave de API exclusiva para o Design Lab"
          >
            <span>⚙️</span>
            <span>{isLabKeySaved ? 'Chave Lab (Ativa)' : 'Chave Lab'}</span>
            <span className={`w-2 h-2 rounded-full ${isLabKeySaved ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
          </button>
        </div>
      </div>

      {/* REAL-TIME "IA EM AÇÃO" MULTI-MCP MONITOR BANNER BAR */}
      <div className="bg-gradient-to-r from-slate-950 via-purple-950/80 to-slate-950 border-b border-purple-800/40 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-200 shrink-0 gap-2">
        <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar py-0.5">
          {/* Live Pulsing Badge */}
          <div className="flex items-center gap-1.5 bg-purple-900/90 border border-purple-500/80 text-purple-100 px-2.5 py-1 rounded-xl text-[11px] font-black tracking-wide shrink-0 shadow-md shadow-purple-900/50">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>⚡ IA EM AÇÃO:</span>
            <span className="text-[9px] bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded font-mono border border-purple-700/60 uppercase">
              MCP Co-Pilot Live
            </span>
          </div>

          <span className="text-slate-400 text-[11px] font-medium hidden md:inline">
            MCPs Consultados em Tempo Real:
          </span>

          {/* Real-Time Consulted MCP Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            {mcpConsultations.length > 0 ? (
              mcpConsultations.map((mcp) => {
                const isBusy = mcp.status === 'CONSULTING' || mcp.status === 'EXECUTING';
                const isSuccess = mcp.status === 'COMPLETED';
                const isErr = mcp.status === 'ERROR';

                return (
                  <div
                    key={mcp.mcpId}
                    onClick={() => setShowMcpMonitorModal(true)}
                    className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all shrink-0 hover:scale-105 ${
                      isBusy
                        ? 'bg-amber-950/90 border-amber-500 text-amber-200 animate-pulse shadow-md shadow-amber-950/50'
                        : isSuccess
                        ? 'bg-emerald-950/80 border-emerald-700/90 text-emerald-200'
                        : isErr
                        ? 'bg-rose-950/80 border-rose-700/90 text-rose-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                    title={`${mcp.mcpName}: ${mcp.currentAction}`}
                  >
                    <span>{mcp.icon}</span>
                    <span className="font-extrabold text-white">{mcp.mcpName.replace(' Server', '').replace(' Workspace', '')}</span>
                    <span className={`text-[8px] font-mono px-1 py-0.2 rounded uppercase ${
                      isBusy ? 'bg-amber-500/30 text-amber-300' :
                      isSuccess ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isBusy ? '⚡ CONSULTANDO' : isSuccess ? '✓ CONCLUÍDO' : 'PAUSADO'}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono italic">
                <span>📝 Notion MCP</span>
                <span>•</span>
                <span>🎨 Figma MCP</span>
                <span>•</span>
                <span>✨ Design MCP</span>
                <span>•</span>
                <span>🌐 Browser MCP</span>
                <span>•</span>
                <span>📁 FileSystem MCP</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button to Open Detailed Monitor Modal */}
        <button
          onClick={() => setShowMcpMonitorModal(true)}
          className="px-3 py-1 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl text-[11px] font-extrabold transition-all shadow-md shadow-purple-900/30 flex items-center gap-1.5 shrink-0 active:scale-95"
        >
          <span>🔍 Painel IA em Ação</span>
          <span className="text-[9px] bg-purple-950 text-purple-200 px-1.5 py-0.2 rounded-full font-mono">
            {mcpConsultations.filter(c => c.status === 'CONSULTING' || c.status === 'EXECUTING').length > 0 ? 'ATIVO ⚡' : '5 MCPs OK'}
          </span>
        </button>
      </div>

      {/* Active Notion MCP Template Banner Bar */}
      <div className="bg-gradient-to-r from-blue-950/90 via-slate-900 to-indigo-950/90 border-b border-blue-900/40 px-4 py-2 flex items-center justify-between text-xs text-blue-200 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="text-base">📝</span>
          <span className="font-bold text-white whitespace-nowrap">Template Notion MCP Ativo para Nós de Geração:</span>
          <span className="font-extrabold bg-blue-900/70 border border-blue-700/80 text-blue-100 px-2.5 py-0.5 rounded-lg truncate text-[11px]">
            {activeTemplateLabel}
          </span>
        </div>
        <button
          onClick={() => setShowTemplateModal(true)}
          className="text-[11px] text-blue-300 hover:text-white underline font-semibold whitespace-nowrap pl-2 transition-colors flex items-center gap-1"
        >
          <span>⚡ Alterar Template</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden min-h-0">
        
        {/* LEFT PANEL: AI CRITIC & AGENTS */}
        <div className={`transition-all duration-300 bg-slate-900/80 border-b md:border-b-0 md:border-r border-slate-800 p-4 space-y-5 overflow-y-auto custom-scrollbar shrink-0 ${
          expandPreview ? 'hidden md:hidden' : 'w-full md:w-80 lg:w-96 max-h-[50vh] md:max-h-none'
        }`}>
          
          {/* Autonomous Improvement CTA */}
          <button
            onClick={handleRunAutonomousLoop}
            disabled={isImproving}
            className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isImproving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                <span>Melhorando Página...</span>
              </>
            ) : (
              <>
                <span>✨ IMPROVE PAGE (LOOP AUTÔNOMO)</span>
              </>
            )}
          </button>

          {loopStatusText && (
            <div className="p-3 bg-purple-950/80 border border-purple-800 rounded-xl text-[11px] text-purple-200 font-mono animate-pulse">
              ⚡ {loopStatusText}
            </div>
          )}

          {/* AI CRITIC SCORES BREAKDOWN */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-extrabold text-white flex items-center gap-2">
                🔍 AI CRITIC SCORE
              </span>
              <button
                onClick={handleRunCritic}
                disabled={isAnalyzing}
                className="text-[10px] text-purple-300 hover:underline"
              >
                {isAnalyzing ? 'Analisando...' : 'Re-avaliar'}
              </button>
            </div>

            {criticScore ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs font-bold text-slate-300">SCORE GERAL</span>
                  <span className={`text-xl font-black ${
                    criticScore.total >= 80 ? 'text-emerald-400' :
                    criticScore.total >= 60 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {criticScore.total}/100
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">Visual</span>
                    <span className="font-bold text-purple-300">{criticScore.visual}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">UX</span>
                    <span className="font-bold text-indigo-300">{criticScore.ux}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">Motion</span>
                    <span className="font-bold text-pink-300">{criticScore.motion}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">Mobile</span>
                    <span className="font-bold text-blue-300">{criticScore.mobile}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">Performance</span>
                    <span className="font-bold text-emerald-300">{criticScore.performance}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">Conversão</span>
                    <span className="font-bold text-amber-300">{criticScore.conversion}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-4 text-center">
                Aguardando avaliação da IA...
              </div>
            )}
          </div>

          {/* AI CRITIC PROBLEMS LIST WITH SURGICAL FIX BUTTON */}
          {criticScore && criticScore.problems.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Problemas Identificados ({criticScore.problems.length})
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {criticScore.problems.map((prob) => (
                  <div key={prob.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                        prob.severity === 'HIGH' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        prob.severity === 'MEDIUM' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {prob.severity} • {prob.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 font-medium leading-tight">
                      {prob.description}
                    </p>
                    <p className="text-[10px] text-purple-300 leading-tight">
                      💡 Fix: {prob.suggested_fix}
                    </p>
                    
                    {/* Surgical AI Fix Button */}
                    <button
                      onClick={() => handleFixSpecificProblem(prob)}
                      disabled={fixingProblemId === prob.id}
                      className="w-full py-1.5 bg-slate-900 hover:bg-purple-950/80 text-purple-200 border border-purple-800/60 hover:border-purple-500 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {fixingProblemId === prob.id ? (
                        <>
                          <div className="w-2.5 h-2.5 border-2 border-purple-300 border-t-transparent animate-spin rounded-full"></div>
                          <span>Corrigindo com IA...</span>
                        </>
                      ) : (
                        <>
                          <span>🔧 Corrigir com IA</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MOTION LAB PRESETS */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
            <span className="text-xs font-black uppercase text-pink-400 tracking-wider block">
              🎬 MOTION LAB (ANIMAÇÕES)
            </span>
            <p className="text-[11px] text-slate-400">
              Injete microinterações e transições cinematográficas na página:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleRunMotionLab("Cinematic Smooth Scroll")}
                disabled={isApplyingNl}
                className="bg-slate-900 hover:bg-pink-950/60 text-slate-200 hover:text-pink-200 border border-slate-800 hover:border-pink-800 p-2 rounded-xl text-xs font-bold transition-all text-left"
              >
                ✨ Cinematic Scroll
              </button>
              <button
                onClick={() => handleRunMotionLab("Premium Microinteractions")}
                disabled={isApplyingNl}
                className="bg-slate-900 hover:bg-purple-950/60 text-slate-200 hover:text-purple-200 border border-slate-800 hover:border-purple-800 p-2 rounded-xl text-xs font-bold transition-all text-left"
              >
                💎 Microinteractions
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: CANVAS PREVIEW, CODE EDITOR & STYLE INSPECTOR */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden min-h-[500px] md:min-h-0">
          
          {/* Top Bar: Viewport + Canvas Mode Tabs */}
          <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            
            {/* View Canvas Tabs (Preview vs Code vs Styles) */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveCanvasTab('preview')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeCanvasTab === 'preview' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>👁️</span>
                <span>Visual</span>
              </button>
              <button
                onClick={() => setActiveCanvasTab('code')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeCanvasTab === 'code' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>💻</span>
                <span>Código HTML</span>
              </button>
              <button
                onClick={() => setActiveCanvasTab('styles')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeCanvasTab === 'styles' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🎨</span>
                <span>Temas & Estilo</span>
              </button>
            </div>

            {/* Viewport Toolbar (Only visible on preview mode) */}
            {activeCanvasTab === 'preview' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setViewport('desktop')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      viewport === 'desktop' ? 'bg-slate-800 text-purple-300' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🖥️ Desktop
                  </button>
                  <button
                    onClick={() => setViewport('laptop')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      viewport === 'laptop' ? 'bg-slate-800 text-purple-300' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    💻 Laptop
                  </button>
                  <button
                    onClick={() => setViewport('tablet')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      viewport === 'tablet' ? 'bg-slate-800 text-purple-300' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📱 Tablet
                  </button>
                  <button
                    onClick={() => setViewport('mobile')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      viewport === 'mobile' ? 'bg-slate-800 text-purple-300' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📲 Mobile
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs text-slate-400">
                  <button onClick={() => setZoomLevel(prev => Math.max(prev - 10, 50))} className="px-2 hover:text-white font-bold">-</button>
                  <span className="font-mono text-[10px] w-8 text-center">{zoomLevel}%</span>
                  <button onClick={() => setZoomLevel(prev => Math.min(prev + 10, 150))} className="px-2 hover:text-white font-bold">+</button>
                </div>
              </div>
            )}

            {/* Quick Export / View Controls */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleCopyCode}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                title="Copiar Código HTML"
              >
                <span>📋 Copiar</span>
              </button>
              <button
                onClick={handleDownloadHtml}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                title="Baixar arquivo HTML"
              >
                <span>💾 Baixar</span>
              </button>
              <button
                onClick={() => setIsFullscreenPreview(true)}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md transition-all flex items-center gap-1.5"
                title="Abrir em Tela Cheia"
              >
                <span>🖥️ Tela Cheia</span>
              </button>
            </div>
          </div>

          {/* Main Display Body */}
          <div className="flex-1 p-4 flex items-center justify-center overflow-auto custom-scrollbar bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
            
            {/* COMPARE MODE */}
            {compareMode ? (
              <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col border border-slate-800 rounded-2xl overflow-hidden bg-slate-900">
                  <div className="p-2 bg-slate-950 text-[10px] font-bold text-slate-400 uppercase text-center border-b border-slate-800">
                    Versão Original (v1)
                  </div>
                  <iframe
                    srcDoc={versions[0]?.htmlContent || htmlContent}
                    className="w-full flex-1 border-none"
                    title="Original"
                  />
                </div>
                <div className="flex flex-col border border-purple-800 rounded-2xl overflow-hidden bg-slate-900">
                  <div className="p-2 bg-purple-950 text-[10px] font-bold text-purple-300 uppercase text-center border-b border-purple-800">
                    Versão Atual Refinada com IA
                  </div>
                  <iframe
                    srcDoc={htmlContent}
                    className="w-full flex-1 border-none"
                    title="Refined"
                  />
                </div>
              </div>
            ) : activeCanvasTab === 'preview' ? (
              
              /* VISUAL PREVIEW MODE */
              <div
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
                className={`transition-all duration-300 bg-white ${viewportStyles[viewport]}`}
              >
                <iframe
                  srcDoc={htmlContent}
                  className="w-full h-full border-none"
                  title="Live Preview"
                />
              </div>

            ) : activeCanvasTab === 'code' ? (

              /* LIVE CODE EDITOR MODE */
              <div className="w-full h-full bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col font-mono text-xs overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <span className="text-slate-400 flex items-center gap-2">
                    <span>📄 {currentFile?.name || 'index.html'}</span>
                    <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded-full">
                      {htmlContent.length} caracteres
                    </span>
                  </span>
                  <button
                    onClick={() => {
                      if (currentFile) onUpdateFile(currentFile.id, htmlContent);
                      showToast('💾 Código sincronizado com os arquivos do projeto!');
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    Sincronizar Arquivo
                  </button>
                </div>
                <textarea
                  value={htmlContent}
                  onChange={(e) => {
                    const newCode = e.target.value;
                    setHtmlContent(newCode);
                    if (currentFile) onUpdateFile(currentFile.id, newCode);
                  }}
                  className="flex-1 w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl p-4 font-mono text-xs outline-none focus:border-purple-500 resize-none leading-relaxed custom-scrollbar"
                  spellCheck={false}
                />
              </div>

            ) : (

              /* STYLE & THEME INSPECTOR MODE */
              <div className="w-full h-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 overflow-y-auto custom-scrollbar my-auto shadow-2xl">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>🎨</span>
                    <span>Transformação Instantânea de Temas do Design Lab</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Escolha um tema estético para adaptar automaticamente a paleta de cores, contrastes, sombras e tipografia da página:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      name: 'Dark Luxury Gold',
                      desc: 'Background escuro luxuoso (#090a0f), acentos em dourado (#fbbf24) e tipografia refinada.',
                      colors: ['bg-[rgb(9,10,15)]', 'bg-amber-400', 'bg-slate-800']
                    },
                    {
                      name: 'Cyberpunk Neon',
                      desc: 'Preto profundo, acentos em ciano elétrico e rosa neon brilhante com sombras futuristas.',
                      colors: ['bg-slate-950', 'bg-cyan-400', 'bg-pink-500']
                    },
                    {
                      name: 'SaaS Clean Slate Light',
                      desc: 'Background claro limpo, texto de alto contraste, acentos em azul royal e cards brancos.',
                      colors: ['bg-slate-100', 'bg-blue-600', 'bg-slate-800']
                    },
                    {
                      name: 'Glassmorphism Dark',
                      desc: 'Efeitos de vidro translúcido, gradientes suaves e bordas iluminadas.',
                      colors: ['bg-purple-950', 'bg-indigo-500', 'bg-white/20']
                    },
                    {
                      name: 'Minimalist Warm',
                      desc: 'Background creme suave, tons terrosos e tipografia limpa em harmonia.',
                      colors: ['bg-stone-200', 'bg-amber-800', 'bg-stone-700']
                    }
                  ].map((theme) => (
                    <div
                      key={theme.name}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-purple-500 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white group-hover:text-purple-300">
                          {theme.name}
                        </span>
                        <div className="flex items-center gap-1">
                          {theme.colors.map((c, idx) => (
                            <span key={idx} className={`w-3.5 h-3.5 rounded-full border border-white/20 ${c}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        {theme.desc}
                      </p>
                      <button
                        onClick={() => handleApplyThemePreset(theme.name)}
                        disabled={isApplyingTheme}
                        className="w-full py-2 bg-slate-900 hover:bg-purple-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-800 hover:border-purple-500"
                      >
                        {isApplyingTheme ? 'Aplicando...' : 'Aplicar este Tema'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            )}
          </div>

          {/* Natural Language Edit Bar */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-2 shrink-0">
            {/* Quick Prompt Pill Suggestions */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px]">
              <span className="text-slate-500 font-bold uppercase shrink-0 text-[9px]">Sugestões:</span>
              {[
                'Deixar o Hero mais chamativo com gradiente e badge',
                'Adicionar tabela de preços interativa',
                'Melhorar contraste de cores e tipografia',
                'Adicionar efeito glassmorphism nos cards',
                'Tornar a página responsiva para telas mobile'
              ].map((sug) => (
                <button
                  key={sug}
                  onClick={() => handleApplyNlChange(sug)}
                  disabled={isApplyingNl}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-purple-950 text-slate-300 hover:text-purple-200 border border-slate-800 hover:border-purple-800 rounded-full text-[10px] transition-all shrink-0 whitespace-nowrap"
                >
                  ⚡ {sug}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xl">✨</span>
              <input
                type="text"
                value={nlPrompt}
                onChange={(e) => setNlPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyNlChange()}
                placeholder="Diga à IA o que alterar na página... (Ex: Deixe os cards mais sofisticados e altere as cores para tom escuro luxury)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <button
                onClick={() => handleApplyNlChange()}
                disabled={isApplyingNl || !nlPrompt.trim()}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-2xl transition-all uppercase tracking-wider shrink-0"
              >
                {isApplyingNl ? 'Aplicando...' : 'Aplicar Alteração'}
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* NEW PAGE MODAL */}
      {showNewPageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/50 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📄</span>
                <h3 className="text-sm font-extrabold text-white">Criar Nova Página no Design Lab</h3>
              </div>
              <button
                onClick={() => setShowNewPageModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewPage} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Nome do Arquivo HTML
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: pricing.html ou landing_v2"
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Selecione o Arquétipo Inicial (Starter Kit)
                </label>
                <select
                  value={selectedArchetype}
                  onChange={(e) => setSelectedArchetype(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-purple-300 font-medium outline-none focus:border-purple-500"
                >
                  <option value="SaaS Landing Page">🚀 SaaS AI Platform & Dashboard</option>
                  <option value="Landing Page Agência">🏢 Agência de Marketing Digital & Soluções</option>
                  <option value="E-Commerce Storefront">🛍️ E-Commerce & Vitrine de Produtos</option>
                  <option value="Portfolio Criativo">💼 Portfólio Minimalista & Serviços</option>
                  <option value="Mobile App Showcase">📱 Aplicativo Mobile & Pre-Launch Waitlist</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPageModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingArchetype || !newPageName.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2"
                >
                  {isGeneratingArchetype ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                      <span>Gerando Código via IA...</span>
                    </>
                  ) : (
                    <span>🚀 Criar Página com IA</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FIGMA IMPORT MODAL */}
      {showFigmaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/50 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎨</span>
                <h3 className="text-sm font-extrabold text-white">Importar Contexto de Design do Figma</h3>
              </div>
              <button
                onClick={() => setShowFigmaModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              O conector <strong>Figma MCP Server</strong> extrai variáveis de cores, hierarquia de frames, design tokens e componentes para guiar a IA na recriação fiel da landing page.
            </p>

            <form onSubmit={handleImportFigmaDesign} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  URL do Arquivo ou Frame do Figma
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: https://www.figma.com/file/ABC123xyz/Landing-Page-Design"
                  value={figmaUrl}
                  onChange={(e) => setFigmaUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFigmaModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isImportingFigma || !figmaUrl.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2"
                >
                  {isImportingFigma ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                      <span>Extraindo Tokens via Figma MCP...</span>
                    </>
                  ) : (
                    <span>🚀 Gerar Código do Figma</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DESIGN LAB DEDICATED API KEY MODAL */}
      {showLabKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⚙️</span>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    Chave API Exclusiva do Design Lab
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    isLabKeySaved
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {isLabKeySaved ? '● Usando Chave Exclusiva do Lab' : '○ Usando Rotação Padrão do Sistema'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowLabKeyModal(false)}
                className="text-slate-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Defina uma chave de API do Google Gemini dedicada <strong>apenas para o Design Lab</strong> (utilizada pelos agentes de AI Critic, Motion Lab e Refatoração em Tempo Real).
            </p>

            <form onSubmit={handleSaveLabKey} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Gemini API Key do Design Lab
                </label>
                <input
                  type="password"
                  placeholder="Cole sua chave AI Studio (Ex: AIzaSy...)"
                  value={labKeyInput}
                  onChange={(e) => setLabKeyInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-amber-500"
                />
              </div>

              {labKeyTestResult && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-slate-200">
                  {labKeyTestResult}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                {isLabKeySaved && (
                  <button
                    type="button"
                    onClick={handleRemoveLabKey}
                    className="px-3 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-xl text-xs font-bold transition-all"
                  >
                    🗑️ Remover Chave
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={handleTestLabKey}
                    disabled={isTestingLabKey || !labKeyInput.trim()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    {isTestingLabKey ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-amber-300/40 border-t-amber-300 rounded-full animate-spin"></div>
                        <span>Testando...</span>
                      </>
                    ) : (
                      <span>🧪 Testar Conexão</span>
                    )}
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-amber-600/20"
                  >
                    💾 Salvar Chave Lab
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN PREVIEW MODAL */}
      {isFullscreenPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-fadeIn">
          {/* Top Bar */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xl">🖥️</span>
              <div>
                <h3 className="text-xs font-extrabold text-white flex items-center gap-2">
                  VISUALIZAÇÃO AMPLA DA PÁGINA (TELA CHEIA)
                  <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded-full font-mono">
                    {currentFile?.name || 'index.html'}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">Modo Foco em Alta Resolução</p>
              </div>
            </div>

            {/* Viewport controls inside Fullscreen */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setViewport('desktop')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    viewport === 'desktop' ? 'bg-purple-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Desktop
                </button>
                <button
                  onClick={() => setViewport('laptop')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    viewport === 'laptop' ? 'bg-purple-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Laptop
                </button>
                <button
                  onClick={() => setViewport('tablet')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    viewport === 'tablet' ? 'bg-purple-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Tablet
                </button>
                <button
                  onClick={() => setViewport('mobile')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    viewport === 'mobile' ? 'bg-purple-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Mobile
                </button>
              </div>

              <button
                onClick={() => setIsFullscreenPreview(false)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <span>✕</span>
                <span>Fechar Tela Cheia</span>
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 p-4 bg-slate-950 flex items-center justify-center overflow-auto custom-scrollbar">
            <div className={`transition-all duration-300 bg-white shadow-2xl ${viewportStyles[viewport]}`}>
              <iframe
                srcDoc={htmlContent}
                className="w-full h-full border-none"
                title="Fullscreen Live Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* NOTION MCP PROFESSIONAL PAGE TEMPLATES MODAL */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-blue-600/50 rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col space-y-5 shadow-2xl animate-scaleUp overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-blue-500/20">
                  📋
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    SELETOR VISUAL DE TEMPLATES DE PÁGINA PROFISSIONAL
                    <span className="text-[9px] bg-blue-950 text-blue-300 border border-blue-800 px-2.5 py-0.5 rounded-full font-bold uppercase">
                      ● Notion MCP Connector Enabled
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Escolha a estrutura profissional que os nós de geração de página (aiBrain, designAgent) e o Notion MCP devem consumir automaticamente ao criar ou atualizar páginas.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-slate-400 hover:text-white font-bold p-1 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Templates Grid Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROFESSIONAL_TEMPLATES.map((tmpl) => {
                  const isSelected = activeTemplateId === tmpl.id;

                  return (
                    <div
                      key={tmpl.id}
                      className={`relative bg-gradient-to-b ${tmpl.bgGradient} border rounded-3xl p-5 transition-all flex flex-col justify-between space-y-4 shadow-xl ${
                        isSelected
                          ? 'border-blue-400 ring-2 ring-blue-500/40 shadow-blue-500/20'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Active Badge */}
                      {isSelected && (
                        <div className="absolute top-4 right-4 bg-emerald-950 text-emerald-300 border border-emerald-700 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1 shadow-md">
                          <span>✓</span>
                          <span>Template Ativo no Notion MCP</span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{tmpl.icon}</span>
                          <div>
                            <h4 className="text-sm font-extrabold text-white">{tmpl.title}</h4>
                            <span className="text-[10px] text-blue-300 font-medium uppercase tracking-wider block">
                              {tmpl.category}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-200 font-medium leading-relaxed">
                          {tmpl.tagline}
                        </p>

                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {tmpl.description}
                        </p>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {tmpl.badges.map((badge, bIdx) => (
                            <span
                              key={bIdx}
                              className="bg-slate-950/80 border border-blue-900/60 text-blue-200 text-[10px] font-mono px-2 py-0.5 rounded-lg"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>

                        {/* Specs Box */}
                        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 text-[11px] text-slate-300 space-y-1">
                          <span className="font-bold text-blue-300 block text-[10px] uppercase">
                            📐 Arquitetura de Seções:
                          </span>
                          <p className="text-slate-400 text-[10px] leading-normal">{tmpl.specs}</p>
                        </div>
                      </div>

                      {/* Actions Footer for each Card */}
                      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        <button
                          onClick={() => handleSelectActiveTemplate(tmpl)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-700'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          <span>📌</span>
                          <span>{isSelected ? 'Definido como Ativo' : 'Ativar no Notion MCP'}</span>
                        </button>

                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            onClick={() => handleApplyTemplateToCurrentPage(tmpl)}
                            disabled={isGeneratingFromTemplate}
                            className="px-3 py-2 bg-indigo-900/80 hover:bg-indigo-800 text-indigo-100 border border-indigo-700 rounded-xl text-[11px] font-bold transition-all"
                            title="Aplicar estrutura deste template na página atualmente aberta"
                          >
                            🎨 Aplicar na Página
                          </button>

                          <button
                            onClick={() => handleGeneratePageFromTemplate(tmpl)}
                            disabled={isGeneratingFromTemplate}
                            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-[11px] font-bold transition-all shadow-md flex items-center gap-1"
                          >
                            <span>🚀</span>
                            <span>Criar Página</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-400 shrink-0">
              <span>
                💡 Dica: Todos os nós do tipo <strong>aiBrain</strong> e geradores de página utilizarão as especificações do template ativo via Notion MCP.
              </span>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
              >
                Concluído
              </button>
            </div>

          </div>
        </div>
      )}

      {/* REAL-TIME "IA EM AÇÃO" MCP CO-PILOT MONITOR MODAL */}
      {showMcpMonitorModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-purple-800/80 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl shadow-purple-900/50 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border-b border-purple-800/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600/30 border border-purple-500/80 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-purple-600/30">
                  ⚡
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    INDICADOR DE IA EM AÇÃO & SERVIDORES MCP
                    <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 font-mono px-2 py-0.5 rounded-full uppercase">
                      Ao Vivo • Real-Time
                    </span>
                  </h3>
                  <p className="text-xs text-purple-200/80">
                    Acompanhe em tempo real quais servidores MCP estão sendo consultados durante a construção da página.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMcpMonitorModal(false)}
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1 bg-slate-950">
              
              {/* Test / Manual Trigger Banner */}
              <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-800/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                <div>
                  <h4 className="text-xs font-extrabold text-purple-200 flex items-center gap-2">
                    <span>🚀 TESTE DE CONSULTA CO-PILOT MULTI-MCP</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Dispare uma verificação completa e simultânea em todos os MCPs conectados para visualizar a transmissão ao vivo.
                  </p>
                </div>
                <button
                  onClick={() => mcpService.triggerMcpCoPilotBuildSession('Simulação em Tempo Real no Monitor MCP')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-600/30 shrink-0 flex items-center gap-1.5 active:scale-95"
                >
                  <span>⚡ Testar Consulta Multi-MCP</span>
                </button>
              </div>

              {/* Grid of Connected MCP Servers & Real-time Status */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>🌐 Servidores MCP Conectados & Estado Atual</span>
                  <span className="text-[10px] text-purple-400 font-mono">5/5 Servidores Ativos</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  
                  {/* Notion MCP Card */}
                  <div className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-4 space-y-2.5 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📝</span>
                        <span className="font-extrabold text-xs text-white">Notion MCP Workspace</span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border ${
                        mcpConsultations.find(c => c.mcpId === 'mcp-notion')?.status === 'CONSULTING' || mcpConsultations.find(c => c.mcpId === 'mcp-notion')?.status === 'EXECUTING'
                          ? 'bg-amber-950/90 border-amber-500 text-amber-200 animate-pulse'
                          : mcpConsultations.find(c => c.mcpId === 'mcp-notion')?.status === 'COMPLETED'
                          ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                          : 'bg-blue-950/80 border-blue-800 text-blue-300'
                      }`}>
                        {mcpConsultations.find(c => c.mcpId === 'mcp-notion')?.status || 'CONECTADO ⚡'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono">
                      {mcpConsultations.find(c => c.mcpId === 'mcp-notion')?.currentAction || `Briefing & Template: '${activeTemplateLabel}'. Regras de Callout e Bento Grid 3x3.`}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Endpoint: developers.notion.com/mcp</span>
                      <span className="text-purple-300 font-mono">Status: 2 Tools Disponíveis</span>
                    </div>
                  </div>

                  {/* Figma Dev Mode MCP Card */}
                  <div className="bg-slate-900/90 border border-slate-800 hover:border-pink-500/50 rounded-2xl p-4 space-y-2.5 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎨</span>
                        <span className="font-extrabold text-xs text-white">Figma Dev Mode MCP</span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border ${
                        mcpConsultations.find(c => c.mcpId === 'mcp-figma')?.status === 'CONSULTING' || mcpConsultations.find(c => c.mcpId === 'mcp-figma')?.status === 'EXECUTING'
                          ? 'bg-amber-950/90 border-amber-500 text-amber-200 animate-pulse'
                          : mcpConsultations.find(c => c.mcpId === 'mcp-figma')?.status === 'COMPLETED'
                          ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                          : 'bg-pink-950/80 border-pink-800 text-pink-300'
                      }`}>
                        {mcpConsultations.find(c => c.mcpId === 'mcp-figma')?.status || 'CONECTADO ⚡'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono">
                      {mcpConsultations.find(c => c.mcpId === 'mcp-figma')?.currentAction || 'Tokens: #8b5cf6 / Plus Jakarta Sans / Inter / rounded-2xl / padding 24px.'}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Figma Token: Ativo</span>
                      <span className="text-pink-300 font-mono">Status: Design System Sincronizado</span>
                    </div>
                  </div>

                  {/* Design & Motion MCP Card */}
                  <div className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-4 space-y-2.5 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">✨</span>
                        <span className="font-extrabold text-xs text-white">Design & Motion MCP</span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border ${
                        mcpConsultations.find(c => c.mcpId === 'mcp-design')?.status === 'CONSULTING' || mcpConsultations.find(c => c.mcpId === 'mcp-design')?.status === 'EXECUTING'
                          ? 'bg-amber-950/90 border-amber-500 text-amber-200 animate-pulse'
                          : mcpConsultations.find(c => c.mcpId === 'mcp-design')?.status === 'COMPLETED'
                          ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                          : 'bg-purple-950/80 border-purple-800 text-purple-300'
                      }`}>
                        {mcpConsultations.find(c => c.mcpId === 'mcp-design')?.status || 'CONECTADO ⚡'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono">
                      {mcpConsultations.find(c => c.mcpId === 'mcp-design')?.currentAction || 'Auditoria de Motion: backdrop-blur-md, hover scale-105 e contraste WCAG AA.'}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Critérios: Anti-Slop Enforced</span>
                      <span className="text-purple-300 font-mono">Status: Motion & Layout OK</span>
                    </div>
                  </div>

                  {/* Browser & DOM Inspector MCP Card */}
                  <div className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 space-y-2.5 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🌐</span>
                        <span className="font-extrabold text-xs text-white">Browser & DOM Inspector MCP</span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border ${
                        mcpConsultations.find(c => c.mcpId === 'mcp-browser')?.status === 'CONSULTING' || mcpConsultations.find(c => c.mcpId === 'mcp-browser')?.status === 'EXECUTING'
                          ? 'bg-amber-950/90 border-amber-500 text-amber-200 animate-pulse'
                          : mcpConsultations.find(c => c.mcpId === 'mcp-browser')?.status === 'COMPLETED'
                          ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                          : 'bg-indigo-950/80 border-indigo-800 text-indigo-300'
                      }`}>
                        {mcpConsultations.find(c => c.mcpId === 'mcp-browser')?.status || 'CONECTADO ⚡'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono">
                      {mcpConsultations.find(c => c.mcpId === 'mcp-browser')?.currentAction || 'Inspecção Virtual: Árvore DOM semântica HTML5 e viewport responsivo.'}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Navegador: Chromium Virtual</span>
                      <span className="text-indigo-300 font-mono">Status: 0 Erros DOM</span>
                    </div>
                  </div>

                  {/* FileSystem MCP Card */}
                  <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 space-y-2.5 transition-all col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📁</span>
                        <span className="font-extrabold text-xs text-white">FileSystem MCP Server</span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border ${
                        mcpConsultations.find(c => c.mcpId === 'mcp-filesystem')?.status === 'CONSULTING' || mcpConsultations.find(c => c.mcpId === 'mcp-filesystem')?.status === 'EXECUTING'
                          ? 'bg-amber-950/90 border-amber-500 text-amber-200 animate-pulse'
                          : mcpConsultations.find(c => c.mcpId === 'mcp-filesystem')?.status === 'COMPLETED'
                          ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                          : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                      }`}>
                        {mcpConsultations.find(c => c.mcpId === 'mcp-filesystem')?.status || 'CONECTADO ⚡'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono">
                      {mcpConsultations.find(c => c.mcpId === 'mcp-filesystem')?.currentAction || 'Workspace FileSystem: Gravação e substituição segura de arquivos HTML.'}
                    </p>
                  </div>

                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400 font-mono">
                Co-Pilot Multi-MCP Ativo • Todos os MCPs sincronizados
              </span>
              <button
                onClick={() => setShowMcpMonitorModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Fechar Monitor
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
