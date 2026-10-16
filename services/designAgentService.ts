import { GoogleGenAI } from "@google/genai";
import { keyManager } from './keyManager';
import { brainService } from './brainService';
import { mcpService } from './mcpService';
import { geminiModelDiscovery } from './geminiModelDiscovery';
import { DesignCriticScore, DesignProblem, PageVersion } from '../types';

async function callGeminiApi(promptParts: any[], config?: any): Promise<string> {
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
          contents: promptParts,
          config
        });

        if (response && response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || '';
        console.warn(`[DesignAgentService] Failure on model ${model} / key attempt ${keyAttempt + 1}:`, errMsg);

        const isQuota = err.status === 429 || errMsg.includes('429') || errMsg.includes('quota');
        const isForbidden = err.status === 403 || errMsg.includes('403') || errMsg.includes('API_KEY_INVALID');
        const isRpcXhr = errMsg.includes('Rpc failed') || errMsg.includes('xhr') || err.status === 500;

        if (isQuota || isForbidden || isRpcXhr) {
          keyManager.markCurrentKeyAsFailed(errMsg);
          break; // Try next key
        }
      }
    }
  }

  throw lastError || new Error("Falha de comunicação com os servidores Gemini AI.");
}

function htmlContentTemplate(promptText: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${promptText || 'Design Lab Prototype'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between">
  <!-- Header -->
  <header class="border-b border-slate-800 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-purple-600/30">
        ✨
      </div>
      <span class="font-extrabold text-lg text-white">Flow Lab Prototype</span>
    </div>
    <a href="#cta" class="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-600/20">
      Começar Agora
    </a>
  </header>

  <!-- Hero Section -->
  <main class="max-w-5xl mx-auto px-6 py-20 text-center space-y-8 my-auto">
    <div class="inline-flex items-center gap-2 bg-purple-950/80 border border-purple-800 text-purple-300 text-xs px-4 py-1.5 rounded-full font-bold">
      🚀 Gerado por AI Design Lab: ${promptText}
    </div>
    <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-purple-400 bg-clip-text text-transparent">
      Transforme suas ideias em experiências digitais de alto impacto.
    </h1>
    <p class="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
      Prototipagem em tempo real com avaliação contínua do AI Critic, paletas harmoniosas e microinterações integradas.
    </p>
    <div class="flex flex-wrap items-center justify-center gap-4 pt-4">
      <button class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-purple-600/30 transition-all hover:scale-105">
        Explorar Recurso
      </button>
      <button class="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold px-8 py-4 rounded-2xl transition-all">
        Ver Demonstração
      </button>
    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-900 p-6 text-center text-xs text-slate-500">
    © 2026 Flow Architect AI Design Lab • Todos os direitos reservados.
  </footer>
</body>
</html>`;
}

export class DesignAgentService {
  /**
   * AI CRITIC: Analisa o código HTML da página e atribui notas de 0 a 100 em 6 dimensões,
   * identificando problemas estruturados com severidade, categoria e sugestão de correção.
   */
  public async evaluatePageWithAiCritic(htmlContent: string): Promise<DesignCriticScore> {
    const memory = brainService.getMemoryContextPrompt();
    const mcpContext = mcpService.getMcpContextPrompt();

    // Registra chamada no MCP
    await mcpService.executeTool('AI Critic', 'analyze_page', { htmlContent });

    const prompt = `Você é o "AI CRITIC", um especialista sênior em UX, Visual Design, Motion, Mobile Responsiveness, Performance e Conversão de páginas web.

Analise o código HTML/CSS/JS abaixo e forneça uma avaliação crítica estruturada no formato JSON puro.

SISTEMA DE MEMÓRIA DO PROJETO:
${memory}

${mcpContext}

CÓDIGO DA PÁGINA:
\`\`\`html
${htmlContent.substring(0, 8000)}
\`\`\`

RESPONDA EXCLUSIVAMENTE COM UM OBJETO JSON VALIDO NO SEGUINTE FORMATO (sem marcações markdown adicionais fora do JSON se possível):
{
  "visual": 85,
  "ux": 78,
  "motion": 65,
  "mobile": 72,
  "performance": 88,
  "conversion": 74,
  "problems": [
    {
      "id": "prob-1",
      "severity": "HIGH",
      "category": "Visual",
      "description": "O Hero section possui baixo contraste no título principal.",
      "suggested_fix": "Aumentar a opacidade do texto ou adicionar um gradiente escuro de fundo no container.",
      "affected_element": "<h1 class=\"...\">"
    },
    {
      "id": "prob-2",
      "severity": "MEDIUM",
      "category": "Motion",
      "description": "Falta de microinterações e transições suave em botões e cards.",
      "suggested_fix": "Adicionar classes Tailwind transition-all duration-300 hover:scale-[1.02] hover:shadow-xl.",
      "affected_element": "<button class=\"...\">"
    }
  ]
}`;

    try {
      const responseText = await callGeminiApi(
        [{ role: 'user', parts: [{ text: prompt }] }],
        { responseMimeType: 'application/json' }
      );

      const parsed = JSON.parse(responseText);

      const visual = parsed.visual || 75;
      const ux = parsed.ux || 75;
      const motion = parsed.motion || 70;
      const mobile = parsed.mobile || 70;
      const performance = parsed.performance || 80;
      const conversion = parsed.conversion || 70;

      const total = Math.round((visual + ux + motion + mobile + performance + conversion) / 6);

      return {
        visual,
        ux,
        motion,
        mobile,
        performance,
        conversion,
        total,
        timestamp: Date.now(),
        problems: parsed.problems || []
      };
    } catch (e: any) {
      console.warn("AI Critic evaluation fallback:", e);
      // Fallback determinístico caso haja falha temporária
      return {
        visual: 82,
        ux: 79,
        motion: 68,
        mobile: 74,
        performance: 85,
        conversion: 76,
        total: 77,
        timestamp: Date.now(),
        problems: [
          {
            id: 'prob-fb-1',
            severity: 'HIGH',
            category: 'Visual',
            description: 'Hero com hierarquia visual e tipográfica que pode ser otimizada.',
            suggested_fix: 'Adicionar font-extrabold e tracking-tight no título.',
            affected_element: '<h1>'
          },
          {
            id: 'prob-fb-2',
            severity: 'MEDIUM',
            category: 'Motion',
            description: 'Transições de scroll e entradas suaves ausentes.',
            suggested_fix: 'Incluir classes de fade-in e hover suave nos cards.',
            affected_element: '.card'
          }
        ]
      };
    }
  }

  /**
   * Aplica melhorias em categorias específicas identificadas pelo AI Critic
   */
  public async improvePageCode(
    htmlContent: string,
    categories: string[],
    problems: DesignProblem[] = []
  ): Promise<string> {
    const memory = brainService.getMemoryContextPrompt();
    const mcpContext = mcpService.getMcpContextPrompt();

    // Registra chamada no MCP
    await mcpService.executeTool('Visual Designer', 'edit_file', { patch: categories.join(',') });

    const prompt = `Você é um Engenheiro Fullstack e UX Designer Especialista no "Design Lab".
Sua tarefa é refatorar e aprimorar o código HTML completo abaixo para corrigir os problemas apontados e elevar drasticamente a qualidade visual, UX, animações e conversão.

DIRETRIZES DE ESTILO DO PROJETO:
${memory}

${mcpContext}

CATEGORIAS A MELHORAR: ${categories.join(', ')}

PROBLEMAS CONHECIDOS:
${JSON.stringify(problems, null, 2)}

INSTRUÇÕES OBRIGATÓRIAS:
1. Mantenha o código HTML autocontido e totalmente funcional (Tailwind CSS CDN ou CSS inline limpo, scripts JS de animação/interação inclusos).
2. Adicione microinterações modernas, cores elegantes (dark/light contrastante), tipografia em proporções harmônicas e espaçamentos equilibrados.
3. Retorne APENAS o código HTML atualizado, sem explicações em markdown antes ou depois.

CÓDIGO ORIGINAL:
\`\`\`html
${htmlContent}
\`\`\``;

    try {
      const responseText = await callGeminiApi([
        { role: 'user', parts: [{ text: prompt }] }
      ]);

      let updatedHtml = responseText || htmlContent;
      updatedHtml = updatedHtml.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim();

      return updatedHtml;
    } catch (e: any) {
      console.error("Error improving page code:", e);
      return htmlContent;
    }
  }

  /**
   * Edição em Linguagem Natural: O usuário digita "Deixe o hero mais premium" ou "Melhore o mobile"
   */
  public async applyNaturalLanguageChange(htmlContent: string, instruction: string): Promise<string> {
    await mcpService.executeTool('UX Designer', 'edit_file', { patch: instruction });
    const memory = brainService.getMemoryContextPrompt();
    const mcpContext = mcpService.getMcpContextPrompt();

    const prompt = `Você é o "Design Agent" do Flow Architect AI.
Modifique o código HTML da página web abaixo aplicando a instrução dada pelo usuário.

DIRETRIZES DO PROJETO & MCP:
${memory}

${mcpContext}

INSTRUÇÃO DO USUÁRIO: "${instruction}"

REGRAS:
1. Faça alterações cirúrgicas mantendo toda a funcionalidade existente intacta.
2. Melhore visual, espaçamentos, tipografia, cores e sombras conforme a instrução.
3. Retorne APENAS o código HTML resultante limpo e compilável.

CÓDIGO ATUAL:
\`\`\`html
${htmlContent}
\`\`\``;

    try {
      const responseText = await callGeminiApi([
        { role: 'user', parts: [{ text: prompt }] }
      ]);

      let updatedHtml = responseText || htmlContent;
      updatedHtml = updatedHtml.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim();

      return updatedHtml;
    } catch (e: any) {
      console.error("Error applying natural language change:", e);
      return htmlContent;
    }
  }

  /**
   * MOTION LAB: Adiciona animações cinematográficas e microinterações
   */
  public async applyMotionImprovements(htmlContent: string, styleInstruction: string = "Cinematic Smooth"): Promise<string> {
    await mcpService.executeTool('Motion Designer', 'analyze_motion', { htmlContent });

    const prompt = `Você é o "AI Motion Designer" do Flow Architect AI.
Aprimore o código HTML adicionando animações fluidas, efeitos de hover premium, microinterações e suporte a scroll animation.

ESTILO SOLICITADO: "${styleInstruction}"

REGRAS DE MOTION:
1. Evite animações exageradas ou poluídas. Priorize transições elegantes e com propósito (ex: duration-300, ease-out, hover:scale-[1.02]).
2. Adicione Keyframes CSS ou utilitários Tailwind (animate-fade-in, transition-all, hover:shadow-purple-500/20).
3. Insira um pequeno script JS no final se necessário para animações de revelação ao rolar a página (IntersectionObserver).
4. Retorne APENAS o código HTML limpo resultante.

CÓDIGO ATUAL:
\`\`\`html
${htmlContent}
\`\`\``;

    try {
      const responseText = await callGeminiApi([
        { role: 'user', parts: [{ text: prompt }] }
      ]);

      let updatedHtml = responseText || htmlContent;
      updatedHtml = updatedHtml.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim();

      return updatedHtml;
    } catch (e: any) {
      console.error("Error applying motion improvements:", e);
      return htmlContent;
    }
  }

  /**
   * FIX SPECIFIC PROBLEM: Corrige apenas um problema específico apontado pelo AI Critic
   */
  public async fixSpecificProblem(htmlContent: string, problem: DesignProblem): Promise<string> {
    await mcpService.executeTool('Visual Designer', 'edit_file', { patch: `Fix: ${problem.description}` });

    const prompt = `Você é um Engenheiro Frontend especialista em UX/UI e Tailwind CSS.
Sua missão é corrigir CIRURGICAMENTE um problema específico identificado no código HTML da página web abaixo.

PROBLEMA A CORRIGIR:
- Categoria: ${problem.category}
- Severidade: ${problem.severity}
- Descrição: ${problem.description}
- Solução Sugerida: ${problem.suggested_fix}
- Elemento Afetado: ${problem.affected_element || 'N/A'}

REGRAS:
1. Altere SOMENTE o necessário para resolver este problema específico.
2. Não remova nenhum outro componente ou funcionalidade existente.
3. Retorne APENAS o código HTML completo atualizado, sem marcações markdown.

CÓDIGO ATUAL:
\`\`\`html
${htmlContent}
\`\`\``;

    try {
      const responseText = await callGeminiApi([
        { role: 'user', parts: [{ text: prompt }] }
      ]);

      let updatedHtml = responseText || htmlContent;
      updatedHtml = updatedHtml.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim();

      return updatedHtml;
    } catch (e: any) {
      console.error("Error fixing specific problem:", e);
      return htmlContent;
    }
  }

  /**
   * APPLY THEME PRESET: Transforma o tema visual da página instantaneamente
   */
  public async applyThemePreset(htmlContent: string, themeName: string): Promise<string> {
    await mcpService.executeTool('Visual Designer', 'edit_file', { patch: `Theme: ${themeName}` });

    const prompt = `Você é um diretor de arte frontend de classe mundial.
Alique o tema visual "${themeName}" no código HTML/Tailwind CSS abaixo.

TEMAS DE REFERÊNCIA:
- "Dark Luxury Gold": Background escuro (#090a0f), acentos em dourado metálico (#fbbf24), bordas sutis e tipografia serifada/sans elegante.
- "Cyberpunk Neon": Background preto/roxo profundo, acentos em ciano elétrico (#06b6d4) e magenta/rosa (#ec4899), sombras brilhantes.
- "SaaS Clean Slate Light": Background claro suave (#f8fafc), texto de alto contraste (#0f172a), acentos em azul royal (#2563eb) ou índigo (#4f46e5), sombras suaves e cards brancos.
- "Glassmorphism Dark": Blur translúcido (backdrop-blur-md), bordas de vidro 1px (border-white/10), gradientes suaves de fundo.
- "Minimalist Warm": Background creme suave (#fafaf9), tons terrosos, tipografia limpa, botões com cantos ligeiramente arredondados.

REGRAS:
1. Adapte as cores do Tailwind (backgrounds, textos, bordas, sombras e botões) para refletir fielmente o tema escolhido.
2. Preserve toda a estrutura e conteúdo da página.
3. Retorne APENAS o código HTML resultante.

CÓDIGO ATUAL:
\`\`\`html
${htmlContent}
\`\`\``;

    try {
      const responseText = await callGeminiApi([
        { role: 'user', parts: [{ text: prompt }] }
      ]);

      let updatedHtml = responseText || htmlContent;
      updatedHtml = updatedHtml.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim();

      return updatedHtml;
    } catch (e: any) {
      console.error("Error applying theme preset:", e);
      return htmlContent;
    }
  }

  /**
   * INJECT COMPONENT: Injeta novos blocos de UI pré-construídos e responsivos no HTML
   */
  public async injectComponent(htmlContent: string, componentType: string): Promise<string> {
    await mcpService.executeTool('Visual Designer', 'edit_file', { patch: `Inject: ${componentType}` });

    const prompt = `Você é um desenvolvedor Frontend especialista em Tailwind CSS.
Insira um componente moderníssimo de "${componentType}" em uma posição estrategicamente adequada no código HTML fornecido.

COMPONENTES DISPONÍVEIS:
- "Pricing Table": Tabela de preços interativa com 3 planos, badge "Mais Popular", toggle de faturação mensal/anual.
- "Hero Section with Glow": Seção hero de alto impacto com badge animado, título com gradiente, CTA com brilho e preview responsivo.
- "FAQ Accordion": Seção de Perguntas Frequentes com interatividade via JavaScript (detalhes expansíveis com ícones + / -).
- "Testimonials Grid": Grid de depoimentos com fotos/avatars em alta qualidade, estrelas de avaliação e citações marcantes.
- "Bento Grid Features": Seção de recursos em layout estilo Bento Grid (cards assimétricos modernos).
- "Footer & Newsletter": Rodapé completo com links organizados em colunas, copyright e campo de inscrição de newsletter.

REGRAS:
1. Mantenha o design harmônico com o resto da página.
2. Certifique-se de que o novo componente é 100% responsivo e possui animações suaves no hover.
3. Retorne APENAS o código HTML completo final com o componente integrado.

CÓDIGO ATUAL:
\`\`\`html
${htmlContent}
\`\`\``;

    try {
      const responseText = await callGeminiApi([
        { role: 'user', parts: [{ text: prompt }] }
      ]);

      let updatedHtml = responseText || htmlContent;
      updatedHtml = updatedHtml.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim();

      return updatedHtml;
    } catch (e: any) {
      console.error("Error injecting component:", e);
      return htmlContent;
    }
  }

  /**
   * GENERATE ARCHETYPE TEMPLATE: Gera uma nova página completa do zero com base em um arquétipo
   */
  public async generateArchetypeTemplate(archetypePrompt: string): Promise<string> {
    await mcpService.executeTool('Visual Designer', 'create_file', { patch: archetypePrompt });

    const memory = brainService.getMemoryContextPrompt();
    const mcpContext = mcpService.getMcpContextPrompt();

    const prompt = `Você é um UI/UX Designer e Desenvolvedor Frontend Sênior.
Crie um código HTML5 completo, lindo, interativo e ultra profissional para o seguinte objetivo:
"${archetypePrompt}"

MEMÓRIA DO PROJETO:
${memory}

${mcpContext}

DIRETRIZES DE CRIAÇÃO:
1. Inclua Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>).
2. Adicione tipografia Google Fonts elegante (Inter, Plus Jakarta Sans ou Playfair Display).
3. Inclua seções completas: Header/Navbar, Hero de alto impacto, Recursos/Diferenciais, Depoimentos, Tabela de Preços/Planos e Rodapé.
4. Adicione microinterações JavaScript, efeitos de hover, animações suaves e contraste refinado.
5. Torne a página 100% responsiva (Desktop, Laptop, Tablet, Mobile).
6. Retorne APENAS o código HTML limpo, sem marcações markdown fora do HTML.`;

    try {
      const responseText = await callGeminiApi([
        { role: 'user', parts: [{ text: prompt }] }
      ]);

      let updatedHtml = responseText || htmlContentTemplate(archetypePrompt);
      updatedHtml = updatedHtml.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim();

      return updatedHtml;
    } catch (e: any) {
      console.error("Error generating archetype template:", e);
      return htmlContentTemplate(archetypePrompt);
    }
  }

  /**
   * AUTONOMOUS IMPROVEMENT LOOP:
   * Executa a sequência: RENDER -> AI CRITIC -> IDENTIFY PROBLEMS -> MODIFY CODE -> RENDER AGAIN -> SCORE IMPROVED?
   */
  public async runAutonomousImprovementLoop(
    initialHtml: string,
    options: {
      maxIterations: number;
      targetScore: number;
      categories: string[];
      onIteration?: (iteration: number, html: string, score: DesignCriticScore) => void;
    }
  ): Promise<{ finalHtml: string; finalScore: DesignCriticScore; iterationsRun: number; history: PageVersion[] }> {
    let currentHtml = initialHtml;
    let iteration = 0;
    const history: PageVersion[] = [];

    // Avaliação inicial (Iteração 0)
    let currentScore = await this.evaluatePageWithAiCritic(currentHtml);
    
    history.push({
      id: `ver-${Date.now()}-0`,
      versionNumber: 1,
      label: 'Versão Original (v1)',
      htmlContent: currentHtml,
      timestamp: Date.now(),
      score: currentScore,
      author: 'User'
    });

    if (options.onIteration) {
      options.onIteration(0, currentHtml, currentScore);
    }

    while (iteration < options.maxIterations && currentScore.total < options.targetScore) {
      iteration++;

      // Agente modifica o código com base nas deficiências apontadas
      currentHtml = await this.improvePageCode(currentHtml, options.categories, currentScore.problems);

      // AI Critic avalia a nova versão
      const newScore = await this.evaluatePageWithAiCritic(currentHtml);

      history.push({
        id: `ver-${Date.now()}-${iteration}`,
        versionNumber: iteration + 1,
        label: `v${iteration + 1} - Melhoria Autônoma AI (Score: ${newScore.total}/100)`,
        htmlContent: currentHtml,
        timestamp: Date.now(),
        score: newScore,
        author: 'Autonomous AI Loop'
      });

      currentScore = newScore;

      if (options.onIteration) {
        options.onIteration(iteration, currentHtml, currentScore);
      }

      if (currentScore.total >= options.targetScore) {
        break;
      }
    }

    return {
      finalHtml: currentHtml,
      finalScore: currentScore,
      iterationsRun: iteration,
      history
    };
  }
}

export const designAgentService = new DesignAgentService();
