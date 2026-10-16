import { AutoHealPatch, AutoHealScore8D, MotionAnalysisResult } from '../../types';

export class AutoHealService {
  private static instance: AutoHealService;

  public static getInstance(): AutoHealService {
    if (!AutoHealService.instance) {
      AutoHealService.instance = new AutoHealService();
    }
    return AutoHealService.instance;
  }

  /**
   * Valida sintaticamente e estruturalmente o Patch retornado pela IA antes de ser aplicado
   */
  public validatePatch(patch: AutoHealPatch, originalHtml: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!patch) {
      errors.push('Patch nulo ou inválido.');
      return { valid: false, errors };
    }

    if (!patch.reason || patch.reason.trim().length === 0) {
      errors.push('O patch deve conter uma justificativa clara (reason).');
    }

    if (!patch.files || !Array.isArray(patch.files) || patch.files.length === 0) {
      if (!patch.fullUpdatedHtml) {
        errors.push('O patch não contém alterações de arquivos ou HTML atualizado.');
      }
    }

    // Validação de limite de arquivos (MAX_FILE_CHANGES = 5)
    if (patch.files && patch.files.length > 5) {
      errors.push('Limite de segurança excedido: máximo de 5 arquivos por iteração de Auto-Heal.');
    }

    // Se fornecido HTML completo, validar estrutura básica do documento
    if (patch.fullUpdatedHtml) {
      const html = patch.fullUpdatedHtml;
      if (!html.includes('<html') && !html.includes('<body') && !html.includes('<div')) {
        errors.push('HTML do patch não contém estrutura de DOM válida.');
      }
      // Checar se não deletou acidentalmente todo o conteúdo (queda drástica de tamanho > 70%)
      if (originalHtml && html.length < originalHtml.length * 0.3) {
        errors.push('Segurança: O patch reduziu o tamanho do documento em mais de 70%, possível perda acidental de conteúdo.');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Avalia as 8 dimensões de qualidade (Scoring Engine 8D)
   */
  public calculateScore8D(domAnalysis: {
    html: string;
    domCount: number;
    headingsCount: number;
    hasH1: boolean;
    imagesWithoutAlt: number;
    contrastIssuesCount: number;
    mobileOverflow: boolean;
    motionMetrics: MotionAnalysisResult;
  }): AutoHealScore8D {
    const { html, domCount, hasH1, imagesWithoutAlt, contrastIssuesCount, mobileOverflow, motionMetrics } = domAnalysis;

    // 1. Visual (0-100)
    let visual = 90;
    if (contrastIssuesCount > 0) visual -= Math.min(contrastIssuesCount * 4, 20);
    if (!html.includes('bg-') || !html.includes('text-')) visual -= 15;

    // 2. UX (0-100)
    let ux = 88;
    if (!hasH1) ux -= 10;
    if (domCount < 10) ux -= 20;
    if (imagesWithoutAlt > 0) ux -= Math.min(imagesWithoutAlt * 3, 15);

    // 3. Responsive (0-100)
    let responsive = 92;
    if (mobileOverflow) responsive -= 25;
    if (!html.includes('md:') && !html.includes('sm:') && !html.includes('lg:')) responsive -= 20;

    // 4. Accessibility (0-100)
    let accessibility = 95;
    if (!hasH1) accessibility -= 15;
    if (imagesWithoutAlt > 0) accessibility -= Math.min(imagesWithoutAlt * 5, 25);
    if (contrastIssuesCount > 0) accessibility -= Math.min(contrastIssuesCount * 5, 20);

    // 5. Performance (0-100)
    let performance = 90;
    if (domCount > 800) performance -= 15;
    if (html.length > 150000) performance -= 10;

    // 6. Motion (0-100)
    const motion = Math.max(10, Math.min(100, motionMetrics.score || 85));

    // 7. Conversion (0-100)
    let conversion = 85;
    if (html.toLowerCase().includes('button') || html.toLowerCase().includes('cta') || html.toLowerCase().includes('começar')) {
      conversion += 10;
    }
    if (!html.includes('href=') && !html.includes('onclick')) conversion -= 10;

    // 8. Code Quality (0-100)
    let codeQuality = 92;
    if (!html.startsWith('<!DOCTYPE') && !html.includes('<html')) codeQuality -= 8;
    if (html.includes('style=')) codeQuality -= 5; // prefere Tailwind puro

    const overall = Math.round(
      (visual * 0.15) +
      (ux * 0.15) +
      (responsive * 0.15) +
      (accessibility * 0.15) +
      (performance * 0.1) +
      (motion * 0.1) +
      (conversion * 0.1) +
      (codeQuality * 0.1)
    );

    return {
      visual: Math.max(20, Math.min(100, visual)),
      ux: Math.max(20, Math.min(100, ux)),
      responsive: Math.max(20, Math.min(100, responsive)),
      accessibility: Math.max(20, Math.min(100, accessibility)),
      performance: Math.max(20, Math.min(100, performance)),
      motion: Math.max(20, Math.min(100, motion)),
      conversion: Math.max(20, Math.min(100, conversion)),
      codeQuality: Math.max(20, Math.min(100, codeQuality)),
      overall: Math.max(20, Math.min(100, overall))
    };
  }

  /**
   * Analisador específico de Motion e Animações
   */
  public analyzeMotion(html: string): MotionAnalysisResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const hasTransition = html.includes('transition') || html.includes('duration-');
    const hasAnimate = html.includes('animate-') || html.includes('@keyframes') || html.includes('motion.');
    const hasHover = html.includes('hover:');
    const hasExcessiveParallax = (html.match(/parallax/gi) || []).length > 8;

    let score = 85;

    if (!hasTransition && !hasAnimate) {
      score -= 20;
      issues.push('A página não possui micro-interações ou transições de estado visual.');
      recommendations.push('Adicione classes de transição suave (ex: transition-all duration-300 hover:scale-[1.02]) aos botões e cards.');
    }

    if (!hasHover) {
      score -= 15;
      issues.push('Falta de feedback visual em elementos interativos e botões.');
      recommendations.push('Inclua estados hover e active claros nos CTAs principais.');
    }

    if (hasExcessiveParallax) {
      score -= 10;
      issues.push('Excesso de efeitos de parallax detectado, risco de layout shift e lentidão no scroll mobile.');
      recommendations.push('Reduza animações pesadas no scroll e utilize GPU transforms.');
    }

    const hasAnimations = hasTransition || hasAnimate;

    return {
      score: Math.max(30, Math.min(100, score)),
      hasAnimations,
      excessiveMotion: hasExcessiveParallax,
      inadequateDuration: false,
      elementsEnteringOffscreen: false,
      layoutShiftRisk: hasExcessiveParallax,
      heavyEffectsDetected: hasExcessiveParallax,
      mobileMotionIssues: !html.includes('hover:'),
      parallaxIssues: hasExcessiveParallax,
      missingInteractiveFeedback: !hasHover,
      issues,
      recommendations
    };
  }
}

export const autoHealService = AutoHealService.getInstance();
