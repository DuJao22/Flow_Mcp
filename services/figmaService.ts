import { 
  FigmaFileSummary, 
  FigmaDesignTokens, 
  FigmaDevModeInspection, 
  FigmaSyncReport, 
  DesignMemory 
} from '../types';
import { userVariablesManager } from './userVariablesManager';
import { brainService } from './brainService';

class FigmaService {
  private activeTokens: FigmaDesignTokens | null = null;
  private activeFile: FigmaFileSummary | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedTokens = localStorage.getItem('figma_active_design_tokens');
      if (savedTokens) {
        try {
          this.activeTokens = JSON.parse(savedTokens);
        } catch (e) {
          console.warn('[FigmaService] Erro ao carregar tokens salvos:', e);
        }
      }

      const savedFile = localStorage.getItem('figma_active_file');
      if (savedFile) {
        try {
          this.activeFile = JSON.parse(savedFile);
        } catch (e) {
          console.warn('[FigmaService] Erro ao carregar arquivo salvo:', e);
        }
      }
    }
  }

  public getToken(): string {
    return userVariablesManager.getValue('FIGMA_PERSONAL_ACCESS_TOKEN') || 
           userVariablesManager.getValue('FIGMA_ACCESS_TOKEN') || '';
  }

  public getActiveFileKey(): string {
    return userVariablesManager.getValue('FIGMA_FILE_KEY') || '';
  }

  public getActiveTokens(): FigmaDesignTokens | null {
    return this.activeTokens;
  }

  public getActiveFile(): FigmaFileSummary | null {
    return this.activeFile;
  }

  /**
   * Valida conexão e autenticação com o Figma
   */
  public async checkAuth(tokenOverride?: string): Promise<{ ok: boolean; user?: any; error?: string }> {
    const token = tokenOverride || this.getToken();
    if (!token) {
      return { ok: false, error: 'Token do Figma não configurado nas variáveis.' };
    }

    try {
      const res = await fetch('/api/mcp/figma/check-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await res.json();
      return data;
    } catch (err: any) {
      return { ok: false, error: err.message || 'Erro de conexão com o servidor Figma MCP.' };
    }
  }

  /**
   * Busca os dados do arquivo Figma (páginas, frames, dimensões)
   */
  public async fetchFile(fileKeyOrUrl: string, tokenOverride?: string): Promise<FigmaFileSummary> {
    const token = tokenOverride || this.getToken();
    const res = await fetch('/api/mcp/figma/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileKey: fileKeyOrUrl, token })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha na requisição ao Figma' }));
      throw new Error(err.error || `Erro HTTP ${res.status}`);
    }

    const fileSummary: FigmaFileSummary = await res.json();
    this.activeFile = fileSummary;

    if (typeof window !== 'undefined') {
      localStorage.setItem('figma_active_file', JSON.stringify(fileSummary));
      userVariablesManager.setValue('FIGMA_FILE_KEY', fileSummary.key);
    }

    return fileSummary;
  }

  /**
   * Extrai tokens semânticos do arquivo Figma ou nó selecionado
   */
  public async extractTokens(fileKeyOrUrl: string, nodeId?: string, tokenOverride?: string): Promise<FigmaDesignTokens> {
    const token = tokenOverride || this.getToken();
    const res = await fetch('/api/mcp/figma/extract-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileKey: fileKeyOrUrl, nodeId, token })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao extrair tokens do Figma' }));
      throw new Error(err.error || `Erro HTTP ${res.status}`);
    }

    const tokens: FigmaDesignTokens = await res.json();
    this.activeTokens = tokens;

    if (typeof window !== 'undefined') {
      localStorage.setItem('figma_active_design_tokens', JSON.stringify(tokens));
    }

    return tokens;
  }

  /**
   * Sincroniza os tokens extraídos com o Brain Engine e Memória de Design
   */
  public async syncWithBrainAndDesignLab(tokens: FigmaDesignTokens): Promise<FigmaSyncReport> {
    // 1. Constrói a Memória de Design a partir dos tokens do Figma
    const primaryColor = tokens.colors.find(c => c.semanticRole === 'primary')?.hex || tokens.colors[0]?.hex || '#3b82f6';
    const secondaryColor = tokens.colors.find(c => c.semanticRole === 'secondary')?.hex || tokens.colors[1]?.hex || '#6366f1';
    const accentColor = tokens.colors.find(c => c.semanticRole === 'accent')?.hex || tokens.colors[2]?.hex || '#ec4899';
    const backgroundColor = tokens.colors.find(c => c.semanticRole === 'background')?.hex || '#0f172a';
    const textColor = tokens.colors.find(c => c.semanticRole === 'text')?.hex || '#f8fafc';

    const headingFont = tokens.typography.find(t => t.usage === 'heading1' || t.usage === 'heading2')?.fontFamily || 'Inter';
    const bodyFont = tokens.typography.find(t => t.usage === 'body')?.fontFamily || 'Inter';

    const designMemory: DesignMemory = {
      brand: tokens.source.fileName || 'Figma Project',
      visualStyle: ['Figma Design System', 'High-Precision UI', 'Auto-Layout Components'],
      colors: {
        primary: primaryColor,
        secondary: secondaryColor,
        accent: accentColor,
        background: backgroundColor,
        text: textColor,
        raw: tokens.colors.map(c => c.hex)
      },
      typography: {
        headingFont,
        bodyFont,
        raw: tokens.typography.map(t => t.name)
      },
      motion: {
        style: ['Smooth Transitions', 'Figma Smart Animate Feel'],
        entrance: 'fade-in-up',
        transitions: '300ms ease-in-out'
      },
      source: `Figma MCP [File: ${tokens.source.fileName} | Key: ${tokens.source.fileKey}]`,
      page_id: tokens.source.nodeId || tokens.source.fileKey,
      updatedAt: Date.now()
    };

    // 2. Salva no Brain Engine
    brainService.updateDesignMemory(designMemory);

    // 3. Persiste no localStorage do Design Lab para consumo instantâneo do visualizador
    if (typeof window !== 'undefined') {
      localStorage.setItem('flow_architect_design_memory', JSON.stringify(designMemory));
      localStorage.setItem('figma_synced_design_memory', JSON.stringify(designMemory));
      window.dispatchEvent(new CustomEvent('figma_tokens_synced', { detail: { tokens, designMemory } }));
    }

    return {
      fileKey: tokens.source.fileKey,
      fileName: tokens.source.fileName,
      tokensCount: {
        colors: tokens.colors.length,
        typography: tokens.typography.length,
        spacings: tokens.spacings.length,
        radii: tokens.borders.length
      },
      brainUpdated: true,
      designLabApplied: true,
      syncedAt: Date.now()
    };
  }

  /**
   * Inspeciona um nó específico no Dev Mode
   */
  public async inspectNode(fileKey: string, nodeId: string, tokenOverride?: string): Promise<FigmaDevModeInspection> {
    const token = tokenOverride || this.getToken();
    const res = await fetch('/api/mcp/figma/inspect-node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileKey, nodeId, token })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao inspecionar nó do Figma' }));
      throw new Error(err.error || `Erro HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Obtém imagens renderizadas de nós do Figma
   */
  public async getImages(fileKey: string, nodeIds: string[], format: 'png' | 'svg' = 'png', scale: number = 2, tokenOverride?: string): Promise<Record<string, string>> {
    const token = tokenOverride || this.getToken();
    const res = await fetch('/api/mcp/figma/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileKey, nodeIds, format, scale, token })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Falha ao renderizar imagens do Figma' }));
      throw new Error(err.error || `Erro HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.images || {};
  }
}

export const figmaService = new FigmaService();
