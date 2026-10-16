/**
 * Figma MCP & REST API Client (Fase 3)
 * Conexão com Figma MCP Server (Streamable HTTP) e Fallback direto com Figma REST API v1.
 */

export interface FigmaColorValue {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function figmaColorToHex(c: FigmaColorValue): string {
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function figmaColorToRgba(c: FigmaColorValue): string {
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  const a = Math.round(c.a * 100) / 100;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export class FigmaClient {
  private mcpServerUrl: string;
  private personalAccessToken: string;

  constructor(token?: string, mcpServerUrl?: string) {
    this.mcpServerUrl = mcpServerUrl || process.env.FIGMA_MCP_SERVER_URL || 'http://localhost:3005/mcp';
    this.personalAccessToken = token || process.env.FIGMA_PERSONAL_ACCESS_TOKEN || process.env.FIGMA_ACCESS_TOKEN || '';
  }

  public setToken(token: string) {
    this.personalAccessToken = token;
  }

  public getToken(): string {
    return this.personalAccessToken;
  }

  public setMcpServerUrl(url: string) {
    this.mcpServerUrl = url;
  }

  /**
   * Extrai o fileKey e nodeId de uma URL qualquer do Figma.
   * Suporta formatos:
   * - https://www.figma.com/design/:fileKey/:fileName?node-id=:nodeId
   * - https://www.figma.com/file/:fileKey/:fileName?node-id=:nodeId
   * - :fileKey puro
   */
  public parseFigmaUrl(input: string): { fileKey: string; nodeId?: string } {
    const trimmed = input.trim();
    if (!trimmed.includes('figma.com/')) {
      // Se não tem figma.com, assume que é o fileKey puro
      return { fileKey: trimmed };
    }

    try {
      const url = new URL(trimmed);
      const pathname = url.pathname; // /design/abc123xyz/Title ou /file/abc123xyz/Title
      const parts = pathname.split('/').filter(Boolean);
      let fileKey = '';
      if ((parts[0] === 'design' || parts[0] === 'file') && parts[1]) {
        fileKey = parts[1];
      } else if (parts[0]) {
        fileKey = parts[0];
      }

      const nodeIdParam = url.searchParams.get('node-id');
      let nodeId: string | undefined;
      if (nodeIdParam) {
        // Figma usa '-' na URL para representar ':' no ID interno (ex: 123-456 -> 123:456)
        nodeId = nodeIdParam.replace('-', ':');
      }

      return { fileKey, nodeId };
    } catch {
      return { fileKey: trimmed };
    }
  }

  /**
   * Testa a autenticação do token do Figma
   */
  public async checkAuth(tokenOverride?: string): Promise<{ ok: boolean; user?: any; error?: string }> {
    const token = tokenOverride || this.personalAccessToken;
    if (!token) {
      return { ok: false, error: 'FIGMA_PERSONAL_ACCESS_TOKEN não configurado.' };
    }

    try {
      const res = await fetch('https://api.figma.com/v1/me', {
        headers: {
          'X-Figma-Token': token
        }
      });

      if (!res.ok) {
        const errText = await res.text();
        return { ok: false, error: `Figma API Error (${res.status}): ${errText}` };
      }

      const user = await res.json();
      return { ok: true, user };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Erro ao conectar à API do Figma.' };
    }
  }

  /**
   * Obtém os dados completos ou resumidos de um arquivo do Figma
   */
  public async getFile(fileKey: string, depth: number = 2, tokenOverride?: string): Promise<any> {
    const token = tokenOverride || this.personalAccessToken;
    if (!token) {
      throw new Error('Figma Access Token não informado.');
    }

    const cleanKey = this.parseFigmaUrl(fileKey).fileKey;
    const url = `https://api.figma.com/v1/files/${cleanKey}?depth=${depth}`;

    const res = await fetch(url, {
      headers: {
        'X-Figma-Token': token
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Erro ao obter arquivo do Figma (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Obtém nós específicos com suporte a renderização de imagens
   */
  public async getNodes(fileKey: string, nodeIds: string[], tokenOverride?: string): Promise<any> {
    const token = tokenOverride || this.personalAccessToken;
    if (!token) {
      throw new Error('Figma Access Token não informado.');
    }

    const cleanKey = this.parseFigmaUrl(fileKey).fileKey;
    const idsParam = nodeIds.join(',');
    const url = `https://api.figma.com/v1/files/${cleanKey}/nodes?ids=${encodeURIComponent(idsParam)}`;

    const res = await fetch(url, {
      headers: {
        'X-Figma-Token': token
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Erro ao obter nós do Figma (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Gera URLs de imagens renderizadas para nós do Figma (PNG/SVG)
   */
  public async getImageUrls(fileKey: string, nodeIds: string[], format: 'png' | 'svg' = 'png', scale: number = 2, tokenOverride?: string): Promise<Record<string, string>> {
    const token = tokenOverride || this.personalAccessToken;
    if (!token) {
      throw new Error('Figma Access Token não informado.');
    }

    const cleanKey = this.parseFigmaUrl(fileKey).fileKey;
    const idsParam = nodeIds.join(',');
    const url = `https://api.figma.com/v1/images/${cleanKey}?ids=${encodeURIComponent(idsParam)}&format=${format}&scale=${scale}`;

    const res = await fetch(url, {
      headers: {
        'X-Figma-Token': token
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Erro ao renderizar imagens do Figma (${res.status}): ${errText}`);
    }

    const json = await res.json();
    return json.images || {};
  }

  /**
   * Extrai Design Tokens semânticos a partir de um documento Figma (Cores, Fontes, Spacing, Borders, Shadows)
   */
  public async extractTokens(fileKey: string, targetNodeId?: string, tokenOverride?: string): Promise<any> {
    const cleanKey = this.parseFigmaUrl(fileKey).fileKey;
    const fileData = await this.getFile(cleanKey, 4, tokenOverride);

    const colorsMap = new Map<string, { hex: string; rgba: string; count: number; name?: string }>();
    const typographyMap = new Map<string, any>();
    const spacingSet = new Set<number>();
    const radiusSet = new Set<number>();
    const shadowsMap = new Map<string, string>();

    let componentsDetected = 0;
    let rawStylesCount = 0;

    // Se temos estilos definidos no documento
    if (fileData.styles) {
      rawStylesCount = Object.keys(fileData.styles).length;
    }

    // Função recursiva de inspeção de nós
    const inspectNode = (node: any) => {
      if (!node) return;

      if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' || node.type === 'INSTANCE') {
        componentsDetected++;
      }

      // 1. Extração de Cores em Fills
      if (Array.isArray(node.fills)) {
        for (const fill of node.fills) {
          if (fill.visible !== false && fill.type === 'SOLID' && fill.color) {
            const hex = figmaColorToHex(fill.color);
            const rgba = figmaColorToRgba({ ...fill.color, a: fill.opacity ?? fill.color.a ?? 1 });
            const existing = colorsMap.get(hex);
            if (existing) {
              existing.count++;
            } else {
              colorsMap.set(hex, { hex, rgba, count: 1 });
            }
          }
        }
      }

      // 2. Extração de Cores em Strokes
      if (Array.isArray(node.strokes)) {
        for (const stroke of node.strokes) {
          if (stroke.visible !== false && stroke.type === 'SOLID' && stroke.color) {
            const hex = figmaColorToHex(stroke.color);
            const rgba = figmaColorToRgba({ ...stroke.color, a: stroke.opacity ?? stroke.color.a ?? 1 });
            const existing = colorsMap.get(hex);
            if (existing) {
              existing.count++;
            } else {
              colorsMap.set(hex, { hex, rgba, count: 1 });
            }
          }
        }
      }

      // 3. Extração de Tipografia
      if (node.type === 'TEXT' && node.style) {
        const s = node.style;
        const fontKey = `${s.fontFamily || 'Sans'}-${s.fontWeight || 400}-${s.fontSize || 16}`;
        if (!typographyMap.has(fontKey)) {
          typographyMap.set(fontKey, {
            name: `${s.fontFamily} ${s.fontWeight || 'Regular'} ${s.fontSize}px`,
            fontFamily: s.fontFamily || 'Inter',
            fontWeight: s.fontWeight || 400,
            fontSize: s.fontSize || 16,
            lineHeight: s.lineHeightPx ? Math.round(s.lineHeightPx) : (s.lineHeightPercentFontSize ? `${Math.round(s.lineHeightPercentFontSize)}%` : 1.5),
            letterSpacing: s.letterSpacing ? `${Math.round(s.letterSpacing * 100) / 100}px` : undefined,
            usage: s.fontSize >= 32 ? 'heading1' : s.fontSize >= 24 ? 'heading2' : s.fontSize >= 18 ? 'heading3' : s.fontSize <= 12 ? 'caption' : 'body'
          });
        }
      }

      // 4. Extração de Espaçamentos & Auto-Layout
      if (typeof node.itemSpacing === 'number' && node.itemSpacing > 0) {
        spacingSet.add(node.itemSpacing);
      }
      if (typeof node.paddingLeft === 'number' && node.paddingLeft > 0) spacingSet.add(node.paddingLeft);
      if (typeof node.paddingTop === 'number' && node.paddingTop > 0) spacingSet.add(node.paddingTop);

      // 5. Extração de Corner Radius (Bordas)
      if (typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
        radiusSet.add(node.cornerRadius);
      }

      // 6. Extração de Efeitos / Sombras
      if (Array.isArray(node.effects)) {
        for (const eff of node.effects) {
          if (eff.visible !== false && (eff.type === 'DROP_SHADOW' || eff.type === 'INNER_SHADOW') && eff.color) {
            const x = eff.offset?.x || 0;
            const y = eff.offset?.y || 0;
            const radius = eff.radius || 0;
            const spread = eff.spread || 0;
            const color = figmaColorToRgba(eff.color);
            const shadowStr = `${eff.type === 'INNER_SHADOW' ? 'inset ' : ''}${x}px ${y}px ${radius}px ${spread}px ${color}`;
            shadowsMap.set(`shadow-${radius}px`, shadowStr);
          }
        }
      }

      // Percorre filhos
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          inspectNode(child);
        }
      }
    };

    // Ponto de partida da busca
    const rootDoc = fileData.document;
    if (targetNodeId) {
      // Se um nó específico foi alvo
      const findTarget = (curr: any): any => {
        if (!curr) return null;
        if (curr.id === targetNodeId) return curr;
        if (Array.isArray(curr.children)) {
          for (const c of curr.children) {
            const found = findTarget(c);
            if (found) return found;
          }
        }
        return null;
      };
      const targeted = findTarget(rootDoc);
      if (targeted) {
        inspectNode(targeted);
      } else {
        inspectNode(rootDoc);
      }
    } else {
      inspectNode(rootDoc);
    }

    // Organiza e classifica cores semânticas
    const sortedColors = Array.from(colorsMap.values()).sort((a, b) => b.count - a.count);
    const colorTokens = sortedColors.map((c, index) => {
      let role: any = 'surface';
      if (index === 0) role = 'primary';
      else if (index === 1) role = 'secondary';
      else if (index === 2) role = 'accent';
      else if (c.hex.toLowerCase() === '#ffffff' || c.hex.toLowerCase() === '#0f172a' || c.hex.toLowerCase() === '#020617') role = 'background';
      else if (index > 2 && index < 6) role = 'border';

      return {
        name: `color-${role}-${index + 1}`,
        hex: c.hex,
        rgba: c.rgba,
        usageCount: c.count,
        semanticRole: role
      };
    });

    // Tipografia formatada
    const typographyTokens = Array.from(typographyMap.values());

    // Spacings ordenados e convertidos para Tailwind classes
    const spacingTokens = Array.from(spacingSet).sort((a, b) => a - b).map((px) => {
      const rem = px / 16;
      return {
        name: `space-${px}px`,
        valuePx: px,
        tailwindClass: px % 4 === 0 ? `p-${px / 4}` : `p-[${px}px]`
      };
    });

    // Borders ordenados
    const borderTokens = Array.from(radiusSet).sort((a, b) => a - b).map((r) => {
      let tailwindRadius = `rounded-[${r}px]`;
      if (r === 4) tailwindRadius = 'rounded-sm';
      else if (r === 8) tailwindRadius = 'rounded-lg';
      else if (r === 12) tailwindRadius = 'rounded-xl';
      else if (r === 16) tailwindRadius = 'rounded-2xl';
      else if (r === 24) tailwindRadius = 'rounded-3xl';
      else if (r >= 999) tailwindRadius = 'rounded-full';

      return {
        name: `radius-${r}px`,
        radiusPx: r,
        tailwindRadius
      };
    });

    // Shadows
    const shadowTokens = Array.from(shadowsMap.entries()).map(([name, cssBoxShadow]) => ({
      name,
      cssBoxShadow
    }));

    // Cria Tailwind Theme Extension
    const tailwindThemeExtension: Record<string, any> = {
      colors: {},
      fontFamily: {},
      borderRadius: {},
      boxShadow: {}
    };

    colorTokens.slice(0, 8).forEach((ct, i) => {
      tailwindThemeExtension.colors[`figma-${ct.semanticRole || 'color'}-${i + 1}`] = ct.hex;
    });

    borderTokens.slice(0, 5).forEach((bt) => {
      tailwindThemeExtension.borderRadius[`figma-${bt.name}`] = `${bt.radiusPx}px`;
    });

    return {
      colors: colorTokens,
      typography: typographyTokens,
      spacings: spacingTokens,
      borders: borderTokens,
      shadows: shadowTokens,
      tailwindThemeExtension,
      rawStylesCount,
      componentsDetected,
      source: {
        fileKey: cleanKey,
        fileName: fileData.name || 'Figma Design',
        nodeId: targetNodeId,
        extractedAt: Date.now()
      }
    };
  }

  /**
   * Inspeciona um nó no estilo Figma Dev Mode gerando CSS e Tailwind
   */
  public async inspectNodeDevMode(fileKey: string, nodeId: string, tokenOverride?: string): Promise<any> {
    const cleanKey = this.parseFigmaUrl(fileKey).fileKey;
    const nodeData = await this.getNodes(cleanKey, [nodeId], tokenOverride);
    const node = nodeData.nodes?.[nodeId]?.document;

    if (!node) {
      throw new Error(`Nó com ID ${nodeId} não encontrado no arquivo Figma.`);
    }

    const cssRules: Record<string, string> = {};
    const tailwindClasses: string[] = [];
    const colorsUsed: string[] = [];
    const fontsUsed: string[] = [];

    const bbox = node.absoluteBoundingBox || { width: 100, height: 100 };
    cssRules['width'] = `${Math.round(bbox.width)}px`;
    cssRules['height'] = `${Math.round(bbox.height)}px`;

    // Background & Fills
    if (Array.isArray(node.fills) && node.fills.length > 0) {
      const topFill = node.fills[0];
      if (topFill.visible !== false && topFill.type === 'SOLID' && topFill.color) {
        const hex = figmaColorToHex(topFill.color);
        cssRules['background-color'] = hex;
        colorsUsed.push(hex);
        tailwindClasses.push(`bg-[${hex}]`);
      }
    }

    // Border Radius
    if (typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
      cssRules['border-radius'] = `${node.cornerRadius}px`;
      tailwindClasses.push(`rounded-[${node.cornerRadius}px]`);
    }

    // Layout (Flex / Auto-layout)
    if (node.layoutMode === 'HORIZONTAL') {
      cssRules['display'] = 'flex';
      cssRules['flex-direction'] = 'row';
      tailwindClasses.push('flex flex-row');
    } else if (node.layoutMode === 'VERTICAL') {
      cssRules['display'] = 'flex';
      cssRules['flex-direction'] = 'column';
      tailwindClasses.push('flex flex-col');
    }

    if (typeof node.itemSpacing === 'number' && node.itemSpacing > 0) {
      cssRules['gap'] = `${node.itemSpacing}px`;
      tailwindClasses.push(`gap-[${node.itemSpacing}px]`);
    }

    // Padding
    if (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom) {
      const pl = node.paddingLeft || 0;
      const pr = node.paddingRight || 0;
      const pt = node.paddingTop || 0;
      const pb = node.paddingBottom || 0;
      cssRules['padding'] = `${pt}px ${pr}px ${pb}px ${pl}px`;
      if (pt === pb && pl === pr && pt === pl) {
        tailwindClasses.push(`p-[${pt}px]`);
      } else {
        tailwindClasses.push(`px-[${pl}px] py-[${pt}px]`);
      }
    }

    // Texto
    if (node.type === 'TEXT' && node.style) {
      const s = node.style;
      if (s.fontFamily) {
        cssRules['font-family'] = `"${s.fontFamily}", sans-serif`;
        fontsUsed.push(s.fontFamily);
      }
      if (s.fontSize) {
        cssRules['font-size'] = `${s.fontSize}px`;
        tailwindClasses.push(`text-[${s.fontSize}px]`);
      }
      if (s.fontWeight) {
        cssRules['font-weight'] = `${s.fontWeight}`;
        if (s.fontWeight >= 700) tailwindClasses.push('font-bold');
        else if (s.fontWeight >= 600) tailwindClasses.push('font-semibold');
        else if (s.fontWeight >= 500) tailwindClasses.push('font-medium');
      }
    }

    // Gera Snippet HTML
    const tailwindSnippet = tailwindClasses.join(' ');
    const tag = node.type === 'TEXT' ? (node.style?.fontSize >= 24 ? 'h2' : 'p') : 'div';
    const htmlSnippet = `<${tag} class="${tailwindSnippet}">\n  ${node.characters ? node.characters : '<!-- Figma ' + node.name + ' -->'}\n</${tag}>`;

    return {
      nodeId,
      nodeName: node.name,
      nodeType: node.type,
      dimensions: {
        width: Math.round(bbox.width),
        height: Math.round(bbox.height)
      },
      cssRules,
      tailwindSnippet,
      htmlSnippet,
      colorsUsed,
      fontsUsed
    };
  }
}

export const figmaClient = new FigmaClient();
export { FigmaClient as FigmaMcpClient };
