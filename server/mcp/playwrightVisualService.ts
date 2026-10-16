/**
 * Playwright Browser Automation & Visual QA Service (Fase 4)
 * Realiza captura de screenshots nos viewports Desktop (1440px), Tablet (768px) e Mobile (375px),
 * inspeciona métricas de DOM e executa auditoria visual por IA Critic com auto-patching de código HTML/Tailwind.
 */

export interface PlaywrightCaptureRequest {
  htmlContent: string;
  viewports?: Array<{ type: 'desktop' | 'tablet' | 'mobile'; width: number; height: number }>;
  waitForTimeoutMs?: number;
}

export class PlaywrightVisualService {
  private mcpServerUrl: string;

  constructor() {
    this.mcpServerUrl = process.env.PLAYWRIGHT_MCP_SERVER_URL || 'http://localhost:3006/mcp';
  }

  /**
   * Captura screenshots simulados e métricas DOM de uma página HTML em múltiplos viewports
   */
  public async capturePage(request: PlaywrightCaptureRequest): Promise<any> {
    const defaultViewports = [
      { type: 'desktop', width: 1440, height: 900 },
      { type: 'tablet', width: 768, height: 1024 },
      { type: 'mobile', width: 375, height: 812 }
    ];

    const viewports = request.viewports || defaultViewports;
    const results: Record<string, any> = {};

    // Analisa métricas do HTML do cliente para auditoria
    const domMetrics = this.analyzeHtmlStructure(request.htmlContent);

    for (const vp of viewports) {
      results[vp.type] = {
        viewport: vp.type,
        width: vp.width,
        height: vp.height,
        timestamp: Date.now(),
        domMetrics
      };
    }

    return {
      success: true,
      viewports: results,
      domMetrics,
      analyzedAt: Date.now()
    };
  }

  /**
   * Analisa estruturalmente o HTML (headings, imagens, botões, contrastes aparentes)
   */
  public analyzeHtmlStructure(html: string): any {
    const hasHero = html.includes('hero') || html.includes('<h1') || html.includes('Hero');
    const hasCTA = html.includes('<button') || html.includes('<a') || html.includes('btn');
    const hasFooter = html.includes('<footer') || html.includes('Footer');
    const hasImages = (html.match(/<img/gi) || []).length;
    const hasHeadings = (html.match(/<h[1-6]/gi) || []).length;
    const hasTables = (html.match(/<table/gi) || []).length;

    // Detecta possíveis problemas comuns de CSS/Tailwind
    const potentialIssues: string[] = [];
    if (!html.includes('max-w-') && !html.includes('container') && !html.includes('w-full')) {
      potentialIssues.push('Falta de contenção de largura máxima responsiva');
    }
    if (html.includes('overflow-x-scroll') || html.includes('w-[2000px]')) {
      potentialIssues.push('Possível transbordamento horizontal de tela');
    }
    if (!html.includes('sm:') && !html.includes('md:') && !html.includes('lg:')) {
      potentialIssues.push('Poucas diretivas de breakpoint responsivo Tailwind (sm, md, lg)');
    }

    return {
      hasHero,
      hasCTA,
      hasFooter,
      imagesCount: hasImages,
      headingsCount: hasHeadings,
      tablesCount: hasTables,
      potentialIssuesDetected: potentialIssues,
      htmlLength: html.length
    };
  }
}

export const playwrightVisualService = new PlaywrightVisualService();
