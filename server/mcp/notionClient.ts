import https from 'https';
import http from 'http';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface DiscoveredTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export class NotionMcpClient {
  private endpoint: string;
  private token: string | null = null;
  private isInitialized = false;
  private serverInfo: any = null;
  private discoveredTools: DiscoveredTool[] = [];
  private capabilities: string[] = [];
  private isDemoMode = false;

  constructor(endpoint: string = 'https://mcp.notion.com/mcp') {
    this.endpoint = endpoint;
  }

  public setToken(token: string) {
    this.token = token.trim();
  }

  public getToken(): string | null {
    return this.token;
  }

  public clearToken() {
    this.token = null;
    this.isInitialized = false;
    this.discoveredTools = [];
    this.isDemoMode = false;
  }

  public isConnected(): boolean {
    return (this.isInitialized && (!!this.token || this.isDemoMode));
  }

  public isDemo(): boolean {
    return this.isDemoMode;
  }

  public getDiscoveredTools(): DiscoveredTool[] {
    return this.discoveredTools;
  }

  public getCapabilities(): string[] {
    return this.capabilities;
  }

  /**
   * Ativa modo sandbox de demonstração quando não houver token ou token for inválido
   */
  public activateDemoMode() {
    this.isDemoMode = true;
    this.isInitialized = true;
    this.serverInfo = {
      name: 'Notion MCP Server (Sandbox Workspace)',
      version: '2.0.0-demo'
    };
    this.capabilities = ['roots', 'sampling', 'tools', 'resources', 'search', 'page_reader'];
    this.discoveredTools = [
      {
        name: 'search',
        description: 'Pesquisa páginas, databases e documentos no Notion Workspace',
        inputSchema: { type: 'object', properties: { query: { type: 'string' } } }
      },
      {
        name: 'get_page',
        description: 'Lê o conteúdo semântico e blocos de uma página do Notion',
        inputSchema: { type: 'object', properties: { page_id: { type: 'string' } }, required: ['page_id'] }
      },
      {
        name: 'list_databases',
        description: 'Lista todas as bases de dados e tabelas disponíveis no workspace',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'create_page',
        description: 'Cria uma nova página ou documentação no workspace',
        inputSchema: { type: 'object', properties: { parent: { type: 'object' }, properties: { type: 'object' } } }
      }
    ];
  }

  /**
   * Envia uma requisição JSON-RPC 2.0 via Streamable HTTP para o servidor MCP do Notion
   */
  public async sendJsonRpc(method: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.token) {
      throw new Error('Notion MCP Client não autenticado. Forneça o token OAuth ou Integration Token.');
    }

    const payload: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      method,
      params
    };

    const payloadStr = JSON.stringify(payload);
    const parsedUrl = new URL(this.endpoint);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${this.token}`,
      'User-Agent': 'FlowArchitectAI-MCPClient/2.0',
      'Content-Length': Buffer.byteLength(payloadStr).toString()
    };

    return new Promise((resolve, reject) => {
      const isHttps = parsedUrl.protocol === 'https:';
      const transport = isHttps ? https : http;

      const req = transport.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + (parsedUrl.search || ''),
          method: 'POST',
          headers,
          timeout: 15000
        },
        (res) => {
          let data = '';
          res.setEncoding('utf8');

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            const statusCode = res.statusCode || 0;

            if (statusCode === 401 || statusCode === 403) {
              this.isInitialized = false;
              return reject(new Error(`Autenticação recusada pelo Notion MCP (${statusCode}): Verifique o token ou permissões OAuth.`));
            }

            if (statusCode < 200 || statusCode >= 300) {
              return reject(new Error(`Erro HTTP do Notion MCP (${statusCode}): ${data.substring(0, 300)}`));
            }

            try {
              // Trata respostas JSON simples ou formato SSE (data: {...})
              let jsonBody = data;
              if (data.startsWith('data:')) {
                const lines = data.split('\n');
                const dataLine = lines.find(l => l.startsWith('data:'));
                if (dataLine) {
                  jsonBody = dataLine.replace(/^data:\s*/, '');
                }
              }

              const jsonRpcRes: JsonRpcResponse = JSON.parse(jsonBody);

              if (jsonRpcRes.error) {
                return reject(new Error(`JSON-RPC Error [${jsonRpcRes.error.code}]: ${jsonRpcRes.error.message}`));
              }

              resolve(jsonRpcRes.result);
            } catch (err: any) {
              reject(new Error(`Falha ao decodificar resposta JSON-RPC do Notion MCP: ${err.message}. Raw: ${data.substring(0, 200)}`));
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout de 15s na comunicação com https://mcp.notion.com/mcp'));
      });

      req.on('error', (e) => {
        reject(new Error(`Erro de rede ao conectar ao Notion MCP: ${e.message}`));
      });

      req.write(payloadStr);
      req.end();
    });
  }

  /**
   * Executa handshake MCP initialize oficial com o Notion MCP
   */
  public async initialize(): Promise<{ serverInfo: any; capabilities: string[] }> {
    try {
      const initResult = await this.sendJsonRpc('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: true },
          sampling: {}
        },
        clientInfo: {
          name: 'FlowArchitect-MCP-Client',
          version: '2.0.0'
        }
      });

      this.serverInfo = initResult?.serverInfo || { name: 'Notion MCP Server' };
      this.capabilities = Object.keys(initResult?.capabilities || {});
      this.isInitialized = true;

      // Envia notificação initialized
      try {
        await this.sendJsonRpc('notifications/initialized', {});
      } catch (ignore) {
        // Notificações opcionais no protocolo
      }

      // Descoberta dinâmica imediata de ferramentas
      await this.refreshTools();

      return {
        serverInfo: this.serverInfo,
        capabilities: this.capabilities
      };
    } catch (err: any) {
      this.isInitialized = false;
      throw err;
    }
  }

  /**
   * Descobre dinamicamente as ferramentas expostas pelo Notion MCP
   */
  public async refreshTools(): Promise<DiscoveredTool[]> {
    const listResult = await this.sendJsonRpc('tools/list', {});
    const tools = (listResult?.tools || []) as DiscoveredTool[];
    this.discoveredTools = tools;
    return tools;
  }

  /**
   * Executa uma ferramenta específica no Notion MCP
   */
  public async callTool(toolName: string, argumentsPayload: Record<string, any> = {}): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const callResult = await this.sendJsonRpc('tools/call', {
      name: toolName,
      arguments: argumentsPayload
    });

    return callResult;
  }

  /**
   * Helper direto: Realiza busca de páginas no workspace do Notion
   */
  public async searchWorkspace(query: string, filter?: any): Promise<any> {
    if (this.isDemoMode || !this.token) {
      const q = (query || '').toLowerCase();
      const demoPages = [
        {
          id: 'notion_page_saas_briefing',
          object: 'page',
          title: 'PRD & Arquitetura SaaS AI Platform (Notion MCP Document)',
          icon: { type: 'emoji', emoji: '🚀' },
          url: 'https://notion.so/flow-architect/saas-ai-briefing',
          last_edited_time: new Date().toISOString(),
          description: [{ plain_text: 'Documentação completa de produto: Hero animado, Bento Grid 3x3 de features, Pricing com toggle anual e FAQ sanfonado.' }]
        },
        {
          id: 'notion_page_design_system',
          object: 'page',
          title: 'Design System & Typography Guidelines (Notion Doc)',
          icon: { type: 'emoji', emoji: '🎨' },
          url: 'https://notion.so/flow-architect/design-system',
          last_edited_time: new Date().toISOString(),
          description: [{ plain_text: 'Tokens de cores primárias, escala modular tipográfica 1.25x e espaçamento rítmico para landing pages de alta conversão.' }]
        },
        {
          id: 'notion_page_growth_analytics',
          object: 'page',
          title: 'Briefing de Landing Page Fintech & B2B Analytics',
          icon: { type: 'emoji', emoji: '📊' },
          url: 'https://notion.so/flow-architect/fintech-briefing',
          last_edited_time: new Date().toISOString(),
          description: [{ plain_text: 'Diretrizes de conversão para público corporativo: contadores KPI ao vivo, tabela comparativa de planos e compliance security.' }]
        }
      ];

      const filtered = q ? demoPages.filter(p => p.title.toLowerCase().includes(q) || p.description[0].plain_text.toLowerCase().includes(q)) : demoPages;
      return { results: filtered };
    }

    // Tenta usar a tool padrão do Notion 'search' ou fallback para API query
    try {
      return await this.callTool('search', { query, filter });
    } catch (err: any) {
      try {
        return await this.callTool('notion_search', { query });
      } catch {
        // Fallback direto via Notion REST API v1 caso o MCP endpoint esteja em modo direto
        if (this.token) {
          try {
            const fetchRes = await fetch('https://api.notion.com/v1/search', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.token}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                query: query || '',
                page_size: 20,
                ...(filter ? { filter } : {})
              })
            });
            if (fetchRes.ok) {
              const searchData: any = await fetchRes.json();
              return searchData;
            }
          } catch (restErr) {
            console.warn('[NotionClient] Falha no fallback REST de busca:', restErr);
          }
        }
        throw err;
      }
    }
  }

  /**
   * Helper direto: Recupera conteúdo de blocos/página
   */
  public async getPageContent(pageId: string): Promise<any> {
    if (this.isDemoMode || !this.token) {
      return {
        page: {
          id: pageId,
          properties: {
            title: { title: [{ plain_text: 'Documento Estruturado do Projeto (Notion MCP)' }] }
          }
        },
        blocks: {
          results: [
            { type: 'heading_1', heading_1: { rich_text: [{ plain_text: 'Visão Geral & Diretrizes do Produto' }] } },
            { type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'A landing page deve transmitir sofisticação técnica, com paleta escura (Obsidian & Gold/Cyan), Bento Grid assimétrico e botões de chamada para ação de alto contraste.' }] } },
            { type: 'heading_2', heading_2: { rich_text: [{ plain_text: 'Componentes Requeridos' }] } },
            { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ plain_text: 'Header Sticky com navegação limpa e botão CTA' }] } },
            { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ plain_text: 'Hero section com headline em gradiente e badge de status' }] } },
            { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ plain_text: 'Bento Grid de recursos e tabela interativa de preços' }] } }
          ]
        },
        plainText: `Visão Geral & Diretrizes do Produto\n\nA landing page deve transmitir sofisticação técnica, com paleta escura, Bento Grid assimétrico e botões de alta conversão.\n\nComponentes Requeridos:\n- Header Sticky com navegação limpa\n- Hero section com headline em gradiente\n- Bento Grid de recursos e tabela interativa de preços`
      };
    }

    try {
      return await this.callTool('get_page', { page_id: pageId });
    } catch (err: any) {
      try {
        return await this.callTool('read_page', { page_id: pageId });
      } catch {
        // Fallback REST para obter propriedades da página e blocos de conteúdo
        if (this.token) {
          try {
            const [pageRes, blocksRes] = await Promise.all([
              fetch(`https://api.notion.com/v1/pages/${pageId}`, {
                headers: {
                  'Authorization': `Bearer ${this.token}`,
                  'Notion-Version': '2022-06-28'
                }
              }),
              fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
                headers: {
                  'Authorization': `Bearer ${this.token}`,
                  'Notion-Version': '2022-06-28'
                }
              })
            ]);

            const pageJson: any = pageRes.ok ? await pageRes.json() : {};
            const blocksJson: any = blocksRes.ok ? await blocksRes.json() : {};

            // Constrói representação textual dos blocos
            const textLines: string[] = [];
            const results = blocksJson.results || [];
            for (const b of results) {
              const type = b.type;
              const richText = b[type]?.rich_text;
              if (Array.isArray(richText)) {
                const line = richText.map((t: any) => t.plain_text).join('');
                if (line) textLines.push(line);
              }
            }

            return {
              page: pageJson,
              blocks: blocksJson,
              plainText: textLines.join('\n')
            };
          } catch (restErr) {
            console.warn('[NotionClient] Falha no fallback REST de blocos:', restErr);
          }
        }
        throw err;
      }
    }
  }
}

export const notionMcpClient = new NotionMcpClient();

