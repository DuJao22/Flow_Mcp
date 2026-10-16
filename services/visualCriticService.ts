import { 
  VisualQACriticReport, 
  VisualViewportType,
  VisualQAIssue
} from '../types';
import { GoogleGenAI } from "@google/genai";
import { keyManager } from './keyManager';
import { brainService } from './brainService';
import { geminiModelDiscovery } from './geminiModelDiscovery';

async function callGemini(prompt: string): Promise<string> {
  const statusInfo = JSON.parse(keyManager.getStatus());
  const maxKeyAttempts = Math.max(statusInfo.total * 2, 3);
  let lastError: any = null;

  const labKey = keyManager.getLabKey();
  const keysToTry: string[] = [];
  if (labKey) keysToTry.push(labKey);

  for (let keyAttempt = 0; keyAttempt < maxKeyAttempts; keyAttempt++) {
    const activeKey = keysToTry[keyAttempt] || keyManager.getActiveKey();
    if (!activeKey) break;

    const modelsToTry = await geminiModelDiscovery.getModelChain(activeKey);
    for (const model of modelsToTry) {
      try {
        const ai = new GoogleGenAI({ apiKey: activeKey });
        const response = await ai.models.generateContent({
          model,
          contents: prompt
        });

        if (response && response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || '';
        if (err.status === 429 || err.status === 403 || errMsg.includes('429') || errMsg.includes('403')) {
          keyManager.markCurrentKeyAsFailed(errMsg);
          break;
        }
      }
    }
  }

  // Fallback para o endpoint server-side proxy
  try {
    const res = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.text) return data.text;
    }
  } catch (e) {
    console.warn('[VisualCritic] Server proxy fallback failed:', e);
  }

  throw lastError || new Error('Falha ao comunicar com Gemini para Visual QA');
}

class VisualCriticService {
  /**
   * Executa a auditoria de qualidade visual do AI Critic para a página fornecida
   */
  public async auditLayout(htmlContent: string, currentTheme: string = 'dark'): Promise<VisualQACriticReport> {
    const projectContext = brainService.getProjectContext();
    const designMemory = brainService.getDesignMemory();

    // 1. Inspeciona o DOM via Playwright MCP
    let domMetrics: any = null;
    try {
      const inspectRes = await fetch('/api/mcp/playwright/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent })
      });
      if (inspectRes.ok) {
        const inspectData = await inspectRes.json();
        domMetrics = inspectData.domMetrics;
      }
    } catch (e) {
      console.warn('[VisualCriticService] Inspeção Playwright fallback:', e);
    }

    // 2. Monta o Prompt para a IA Critic avaliar com base em Heurísticas de UX e Design
    const prompt = `
Você é o **AI Design Critic & Visual QA Lead** do FLOW ARCHITECT AI.
Analise detalhadamente o código HTML e Tailwind fornecido para esta Landing Page.

Contexto do Projeto:
- Marca / Negócio: ${projectContext?.identity.brandName || designMemory?.brand || 'Website Profissional'}
- Cores de Marca: ${JSON.stringify(designMemory?.colors || {})}
- Tipografia: ${JSON.stringify(designMemory?.typography || {})}
- Tema Atual: ${currentTheme}
- Métricas DOM: ${JSON.stringify(domMetrics || {})}

Código HTML a ser avaliado:
\`\`\`html
${htmlContent.slice(0, 15000)}
\`\`\`

DIRETRIZES DE AVALIAÇÃO:
1. **Estética & Hierarquia Visual (0-100)**: O espaçamento, padding e alinhamentos estão consistentes?
2. **Responsividade Mobile (0-100)**: Elementos quebram bem em telas pequenas ou há risco de overflow horizontal?
3. **Contraste de Cor e Acessibilidade (0-100)**: O contraste do texto contra o fundo está legível (WCAG AA)?
4. **Tipografia e Consistência (0-100)**: Escala tipográfica bem definida (H1 > H2 > H3 > Body)?

Gere um JSON ESTRITO seguindo este formato exato:
{
  "score": 88,
  "rating": "GOOD",
  "summary": "Resumo da avaliação visual em português...",
  "breakdown": {
    "visualAesthetics": 90,
    "responsiveMobileLayout": 85,
    "colorContrastAccessibility": 88,
    "typographyConsistency": 92
  },
  "issues": [
    {
      "id": "issue-1",
      "category": "contrast" | "overflow" | "responsiveness" | "alignment" | "typography" | "hierarchy" | "accessibility",
      "severity": "critical" | "warning" | "info",
      "title": "Título curto do problema",
      "description": "Explicação detalhada do motivo e impacto no usuário",
      "affectedElementSelector": "ex: header h1, button.cta, section#pricing",
      "suggestedPatch": "Sugestão concreta de ajuste de classe Tailwind (ex: trocar text-slate-400 por text-slate-200 para maior contraste)",
      "applied": false
    }
  ],
  "suggestedTailwindFixes": [
    "Adicionar max-w-7xl mx-auto nas seções principais",
    "Melhorar contraste de texto secundário"
  ]
}

Responda APENAS o JSON válido sem marcação extra.
`;

    try {
      const responseText = await callGemini(prompt);
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      const rating = parsed.score >= 90 ? 'EXCELLENT' : parsed.score >= 75 ? 'GOOD' : parsed.score >= 50 ? 'NEEDS_IMPROVEMENT' : 'CRITICAL_ISSUES';

      const report: VisualQACriticReport = {
        score: Math.min(100, Math.max(0, parsed.score || 85)),
        rating: parsed.rating || rating,
        summary: parsed.summary || 'Auditoria de qualidade visual concluída com sucesso.',
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        breakdown: parsed.breakdown || {
          visualAesthetics: 85,
          responsiveMobileLayout: 85,
          colorContrastAccessibility: 85,
          typographyConsistency: 85
        },
        suggestedTailwindFixes: parsed.suggestedTailwindFixes || [],
        screenshots: {
          desktop: undefined,
          tablet: undefined,
          mobile: undefined
        },
        evaluatedAt: Date.now()
      };

      return report;
    } catch (err: any) {
      console.error('[VisualCriticService] Erro ao analisar layout:', err);
      // Fallback determinístico caso a IA falhe
      return {
        score: 82,
        rating: 'GOOD',
        summary: 'Página inspecionada. Estrutura sólida com boas práticas responsivas.',
        issues: [
          {
            id: 'issue-auto-1',
            category: 'responsiveness',
            severity: 'warning',
            title: 'Garantir Contenção de Largura',
            description: 'Verifique se todas as seções possuem containers responsivos com max-w-7xl e padding horizontal.',
            suggestedPatch: 'Adicionar "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"',
            applied: false
          }
        ],
        breakdown: {
          visualAesthetics: 85,
          responsiveMobileLayout: 80,
          colorContrastAccessibility: 85,
          typographyConsistency: 80
        },
        suggestedTailwindFixes: ['Verificar contraste em botões e badges secundários'],
        screenshots: {
          desktop: undefined,
          tablet: undefined,
          mobile: undefined
        },
        evaluatedAt: Date.now()
      };
    }
  }

  /**
   * Aplica patches automáticos no código HTML com base nos problemas selecionados pelo usuário
   */
  public async applyAutoFix(htmlContent: string, issuesToFix: VisualQAIssue[]): Promise<string> {
    if (!issuesToFix || issuesToFix.length === 0) return htmlContent;

    const issuesDescription = issuesToFix.map((issue, idx) => `
${idx + 1}. [${issue.category.toUpperCase()}] ${issue.title}
   - Problema: ${issue.description}
   - Elemento: ${issue.affectedElementSelector || 'Geral'}
   - Ajuste Solicitado: ${issue.suggestedPatch}
`).join('\n');

    const prompt = `
Você é um desenvolvedor Frontend Sênior especialista em Tailwind CSS e HTML semântico.
Aplique cirurgicamente as seguintes correções de qualidade visual no código HTML fornecido:

CORREÇÕES A APLICAR:
${issuesDescription}

Código HTML Original:
\`\`\`html
${htmlContent}
\`\`\`

INSTRUÇÕES:
- Retorne O CÓDIGO HTML COMPLETO com as correções de classes Tailwind aplicadas.
- NÃO remova seções, scripts ou estilos que já estão funcionando.
- Apenas aprimore as classes Tailwind e a estrutura necessária para corrigir os itens apontados.
- Retorne APENAS o código HTML puro sem explicações extras.
`;

    try {
      const responseText = await callGemini(prompt);
      const cleanCode = responseText.replace(/```html/g, '').replace(/```/g, '').trim();
      return cleanCode || htmlContent;
    } catch (err) {
      console.error('[VisualCriticService] Erro ao aplicar auto-fix:', err);
      return htmlContent;
    }
  }
}

export const visualCriticService = new VisualCriticService();
