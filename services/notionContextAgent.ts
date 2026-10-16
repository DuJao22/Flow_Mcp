import { StructuredProjectContext, DesignMemory, NotionPageSummary, ProjectMemoryCategories } from '../types';
import { brainService } from './brainService';
import { userVariablesManager } from './userVariablesManager';

export class NotionContextAgent {
  private static instance: NotionContextAgent;

  private constructor() {}

  public static getInstance(): NotionContextAgent {
    if (!NotionContextAgent.instance) {
      NotionContextAgent.instance = new NotionContextAgent();
    }
    return NotionContextAgent.instance;
  }

  /**
   * Extrai e estrutura o contexto completo de uma ou mais páginas do Notion
   */
  public async extractProjectContext(
    page: NotionPageSummary, 
    rawContent?: string
  ): Promise<{
    structuredContext: StructuredProjectContext;
    designMemory: DesignMemory;
    brainIntegrationSummary: string;
  }> {
    let contentToAnalyze = rawContent;

    // Se o conteúdo bruto não foi fornecido, tenta buscar do backend/MCP Gateway
    if (!contentToAnalyze) {
      try {
        const res = await fetch(`/api/mcp/notion/page/${page.id}`);
        if (res.ok) {
          const data = await res.json();
          contentToAnalyze = typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2);
        }
      } catch (err) {
        console.warn('[NotionContextAgent] Falha ao obter blocos via MCP, usando resumo da página:', err);
      }
    }

    if (!contentToAnalyze || contentToAnalyze.trim().length === 0) {
      contentToAnalyze = `Título da Página: ${page.title}\nID: ${page.id}\nResumo/Excerpt: ${page.excerpt || 'Sem detalhes fornecidos.'}`;
    }

    // Tenta analisar usando o modelo Gemini via backend ou client-side
    let structuredContext: StructuredProjectContext;
    try {
      structuredContext = await this.runAiContextExtraction(page, contentToAnalyze);
    } catch (err) {
      console.warn('[NotionContextAgent] Fallback heurístico ativado para extração de contexto:', err);
      structuredContext = this.heuristicExtraction(page, contentToAnalyze);
    }

    // Cria e registra a Memória de Design
    const designMemory = this.generateDesignMemory(structuredContext, page);

    // Integração automática e vinculação de proveniência no Brain Engine
    const brainIntegrationSummary = this.syncWithBrainEngine(structuredContext, designMemory, page);

    return {
      structuredContext,
      designMemory,
      brainIntegrationSummary
    };
  }

  /**
   * Extração com IA utilizando o Prompt de Contexto do Notion MCP
   */
  private async runAiContextExtraction(page: NotionPageSummary, content: string): Promise<StructuredProjectContext> {
    const prompt = `Você é o NOTION CONTEXT AGENT especializado em analisar briefings, brand guidelines e documentações de projetos.
Analise os dados extraídos do Notion e retorne ESTRITAMENTE um objeto JSON válido (sem comentários, sem markdown em volta) correspondente ao schema exato.

DIRETRIZ CRÍTICA DE INTEGRIDADE:
- NÃO INVENTE NADA. Se uma informação (como cor, tipografia, restrições ou faq) NÃO existir no texto, use null ou array vazio [].
- O campo "source" DEVE ser obrigatoriamente "Notion".
- Extraia cores em formato hexadecimal (#RRGGBB) se mencionadas.
- Extraia o tom de voz, público-alvo, proposta de valor e seções requeridas com precisão cirúrgica.

DADOS BRUTOS DO NOTION:
Título: ${page.title}
Page ID: ${page.id}
Conteúdo da Página / Blocos:
${content.substring(0, 10000)}

SCHEMA JSON OBRIGATÓRIO:
{
  "project": "${page.title.replace(/"/g, '')}",
  "brand": string | null,
  "business": string | null,
  "audience": string[],
  "offer": string | null,
  "value_proposition": string | null,
  "tone": string[],
  "colors": string[],
  "typography": string[],
  "visual_style": string[],
  "references": string[],
  "sections": string[],
  "cta": string | null,
  "copy": {
    "headline": string | null,
    "subheadline": string | null,
    "benefits": string[],
    "guarantee": string | null,
    "faq": []
  },
  "requirements": string[],
  "restrictions": string[]
}`;

    let responseText = '';

    // Tenta rota segura de backend do Gemini com detecção dinâmica do modelo
    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: 'auto',
          systemInstruction: 'Você é um extrator de contexto JSON estrito. Responda apenas com o JSON puro.'
        })
      });

      if (res.ok) {
        const data = await res.json();
        responseText = data.text;
      }
    } catch (e) {
      console.warn('[NotionContextAgent] Falha na chamada server-side do Gemini, tentando SDK local:', e);
    }

    // Se backend falhou, tenta com chave local do usuário
    if (!responseText) {
      const apiKey = userVariablesManager.getValue('GEMINI_API_KEY') || localStorage.getItem('gemini_api_key');
      if (apiKey) {
        const { GoogleGenAI } = await import('@google/genai');
        const { geminiModelDiscovery } = await import('./geminiModelDiscovery');
        const resolvedModel = await geminiModelDiscovery.resolveModel(userVariablesManager.getValue('GEMINI_DEFAULT_MODEL'), apiKey);
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: resolvedModel,
          contents: prompt
        });
        responseText = response.text || '';
      }
    }

    if (!responseText) {
      throw new Error('Nenhuma chave de IA disponível para extração semântica.');
    }

    // Sanitiza e extrai JSON
    const cleanJson = responseText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleanJson);

    return {
      project: parsed.project || page.title,
      brand: parsed.brand || null,
      business: parsed.business || null,
      audience: Array.isArray(parsed.audience) ? parsed.audience : [],
      offer: parsed.offer || null,
      value_proposition: parsed.value_proposition || null,
      tone: Array.isArray(parsed.tone) ? parsed.tone : [],
      colors: Array.isArray(parsed.colors) ? parsed.colors : [],
      typography: Array.isArray(parsed.typography) ? parsed.typography : [],
      visual_style: Array.isArray(parsed.visual_style) ? parsed.visual_style : [],
      references: Array.isArray(parsed.references) ? parsed.references : [],
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      cta: parsed.cta || null,
      copy: {
        headline: parsed.copy?.headline || null,
        subheadline: parsed.copy?.subheadline || null,
        benefits: Array.isArray(parsed.copy?.benefits) ? parsed.copy.benefits : [],
        guarantee: parsed.copy?.guarantee || null,
        faq: Array.isArray(parsed.copy?.faq) ? parsed.copy.faq : []
      },
      requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
      restrictions: Array.isArray(parsed.restrictions) ? parsed.restrictions : [],
      source: 'Notion',
      page_id: page.id,
      page_title: page.title,
      retrieved_at: Date.now()
    };
  }

  /**
   * Extração determinística de fallback baseada em regex e heurísticas
   */
  private heuristicExtraction(page: NotionPageSummary, content: string): StructuredProjectContext {
    const colorMatches = content.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g) || [];
    const uniqueColors = Array.from(new Set(colorMatches));

    const audienceKeywords = ['desenvolvedores', 'designers', 'startups', 'empresas', 'b2b', 'criadores', 'estudantes', 'gestores'];
    const foundAudience = audienceKeywords.filter(k => content.toLowerCase().includes(k));

    return {
      project: page.title,
      brand: page.title.split(' ')[0] || null,
      business: page.excerpt || null,
      audience: foundAudience.length > 0 ? foundAudience : ['Profissionais e Usuários da Solução'],
      offer: page.excerpt || 'Solução apresentada na documentação do Notion',
      value_proposition: page.excerpt || null,
      tone: ['Profissional', 'Moderno', 'Objetivo'],
      colors: uniqueColors.length > 0 ? uniqueColors : ['#3b82f6', '#8b5cf6', '#0f172a'],
      typography: ['Plus Jakarta Sans', 'Inter'],
      visual_style: ['Clean Dark Luxury', 'Glassmorphism'],
      references: [],
      sections: ['Hero Section', 'Diferenciais', 'Prova Social', 'FAQ', 'Oferta Final'],
      cta: 'Começar Agora',
      copy: {
        headline: page.title,
        subheadline: page.excerpt || null,
        benefits: ['Eficiência máxima', 'Integração completa', 'Design moderno'],
        guarantee: 'Garantia de 7 dias ou seu dinheiro de volta',
        faq: []
      },
      requirements: [`Página baseada no Notion Document: ${page.title}`],
      restrictions: ['Não utilizar dados fictícios que contrariem o briefing do Notion.'],
      source: 'Notion',
      page_id: page.id,
      page_title: page.title,
      retrieved_at: Date.now()
    };
  }

  /**
   * Gera a Memória de Design padronizada a partir do contexto extraído
   */
  private generateDesignMemory(context: StructuredProjectContext, page: NotionPageSummary): DesignMemory {
    const primaryColor = context.colors[0] || '#6366f1';
    const secondaryColor = context.colors[1] || '#3b82f6';
    const accentColor = context.colors[2] || '#ec4899';

    const designMem: DesignMemory = {
      brand: context.brand || context.project || page.title,
      visualStyle: context.visual_style.length > 0 ? context.visual_style : ['Dark Luxury', 'Glassmorphism', 'Bento Grid'],
      colors: {
        primary: primaryColor,
        secondary: secondaryColor,
        accent: accentColor,
        background: '#090d16',
        text: '#f8fafc',
        raw: context.colors
      },
      typography: {
        headingFont: context.typography[0] || 'Plus Jakarta Sans',
        bodyFont: context.typography[1] || context.typography[0] || 'Plus Jakarta Sans',
        raw: context.typography
      },
      motion: {
        style: ['smooth-fade', 'hover-lift', 'pulse-glow'],
        entrance: 'fade-in-up',
        transitions: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      },
      source: `Notion Page (${page.title})`,
      page_id: page.id,
      updatedAt: Date.now()
    };

    // Salva no LocalStorage para que o Design Lab e templates possam consumir imediatamente
    if (typeof window !== 'undefined') {
      localStorage.setItem('figma_project_design_memory', JSON.stringify({
        importedAt: new Date().toISOString(),
        figmaUrl: page.url || '',
        fileKey: page.id,
        designName: designMem.brand,
        frames: context.sections,
        colors: {
          primary: primaryColor,
          secondary: secondaryColor,
          accent: accentColor,
          background: '#090d16',
          text: '#f8fafc'
        },
        typography: {
          headingFont: designMem.typography.headingFont,
          bodyFont: designMem.typography.bodyFont,
          scaleRatio: 1.25
        },
        tokens: {
          'color-primary': primaryColor,
          'color-secondary': secondaryColor,
          'border-radius': '16px',
          'font-display': designMem.typography.headingFont || 'Plus Jakarta Sans'
        },
        sourceApi: 'Notion MCP Extractor'
      }));
    }

    return designMem;
  }

  /**
   * Sincroniza dados no Brain Engine com metadados estritos de proveniência
   */
  private syncWithBrainEngine(
    context: StructuredProjectContext, 
    designMem: DesignMemory, 
    page: NotionPageSummary
  ): string {
    const timestampStr = new Date(context.retrieved_at).toLocaleString();

    // 1. Atualiza as categorias estruturadas do Brain Engine
    const currentStructured = brainService.getStructuredCategories();
    const updatedStructured: ProjectMemoryCategories = {
      design: {
        colors: context.colors.length > 0 ? context.colors.join(', ') : currentStructured.design.colors,
        typography: context.typography.length > 0 ? context.typography.join(' / ') : currentStructured.design.typography,
        components: context.sections.length > 0 ? `Seções requeridas: ${context.sections.join(' -> ')}` : currentStructured.design.components,
        layout: context.visual_style.length > 0 ? context.visual_style.join(', ') : currentStructured.design.layout
      },
      engineering: currentStructured.engineering,
      business: {
        rules: context.requirements.length > 0 ? context.requirements.join('; ') : currentStructured.business.rules,
        targetAudience: context.audience.length > 0 ? context.audience.join(', ') : currentStructured.business.targetAudience,
        goals: context.offer || context.value_proposition || currentStructured.business.goals,
        flows: currentStructured.business.flows
      },
      content: {
        tone: context.tone.length > 0 ? context.tone.join(', ') : currentStructured.content.tone,
        copyRules: context.restrictions.length > 0 ? `Restrições: ${context.restrictions.join('; ')}` : currentStructured.content.copyRules,
        ctas: context.cta || currentStructured.content.ctas
      }
    };
    brainService.saveStructuredCategories(updatedStructured);

    // 2. Adiciona memórias pontuais com TAG explícita de Proveniência Notion
    brainService.addMemory(
      `[NOTION CONTEXT | Source: Notion | PageID: ${page.id} | Retrieved: ${timestampStr}] Projeto: "${context.project}" | Proposta: "${context.offer || context.value_proposition || 'N/A'}" | Público: ${context.audience.join(', ')}`,
      'rule',
      'high',
      'auto'
    );

    if (context.colors.length > 0) {
      brainService.addMemory(
        `[NOTION DESIGN TOKENS | Source: Notion | PageID: ${page.id}] Paleta de Cores: ${context.colors.join(', ')} | Tipografia: ${context.typography.join(', ') || 'Plus Jakarta Sans'}`,
        'pattern',
        'high',
        'auto'
      );
    }

    if (context.copy.headline || context.cta) {
      brainService.addMemory(
        `[NOTION COPY & CTA | Source: Notion | PageID: ${page.id}] Headline: "${context.copy.headline || ''}" | CTA Principal: "${context.cta || ''}"`,
        'preference',
        'medium',
        'auto'
      );
    }

    return `Contexto do Notion da página "${page.title}" (ID: ${page.id}) sincronizado com o Cérebro da IA às ${timestampStr}.`;
  }
}

export const notionContextAgent = NotionContextAgent.getInstance();
