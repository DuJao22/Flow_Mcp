import { MCPServer, MCPServerConfig, MCPTool, MCPSessionLog, MCPPermission, NotionPageSummary } from '../types';

export interface McpClientEvent {
  type: 'SERVER_STATUS_CHANGE' | 'TOOLS_DISCOVERED' | 'TOOL_EXECUTED' | 'LOG_ADDED';
  data: any;
}

type EventListener = (event: McpClientEvent) => void;

export class McpClient {
  private static instance: McpClient;
  private listeners: EventListener[] = [];
  private servers: Map<string, MCPServer> = new Map();
  private dynamicTools: Map<string, MCPTool> = new Map();
  private sessionLogs: MCPSessionLog[] = [];
  private activeToken: string | null = null;

  private constructor() {
    this.initDefaultServers();
  }

  public static getInstance(): McpClient {
    if (!McpClient.instance) {
      McpClient.instance = new McpClient();
    }
    return McpClient.instance;
  }

  private initDefaultServers() {
    const defaultServers: MCPServer[] = [
      {
        id: 'notion',
        name: 'Notion MCP Server Oficial',
        status: 'NOT_CONNECTED',
        transport: 'streamable-http',
        endpoint: 'https://mcp.notion.com/mcp',
        authType: 'oauth2',
        description: 'Servidor MCP oficial do Notion para acesso estruturado a documentação, briefings e bases de dados.',
        toolsCount: 0,
        capabilities: ['roots', 'sampling', 'tools', 'resources']
      },
      {
        id: 'figma',
        name: 'Figma Dev Mode MCP',
        status: 'NOT_CONNECTED',
        transport: 'sse',
        endpoint: 'http://localhost:3005/mcp',
        authType: 'bearer',
        description: 'Extração e sincronização de tokens de design, layouts de nós e paletas de cores do Figma.',
        toolsCount: 0,
        capabilities: ['design_tokens', 'vector_nodes']
      },
      {
        id: 'playwright',
        name: 'Playwright & Browser MCP',
        status: 'NOT_CONNECTED',
        transport: 'sse',
        endpoint: 'http://localhost:3006/mcp',
        authType: 'none',
        description: 'Inspeção de DOM, validação de responsividade mobile e captura de screenshots automatizados.',
        toolsCount: 0,
        capabilities: ['browser_automation', 'screenshots']
      },
      {
        id: 'filesystem',
        name: 'Project FileSystem MCP',
        status: 'CONNECTED',
        transport: 'in-memory',
        endpoint: 'local://filesystem',
        authType: 'none',
        description: 'Gerenciamento local de arquivos HTML, CSS, JavaScript e assets de landing page.',
        toolsCount: 4,
        capabilities: ['file_read', 'file_write', 'file_list']
      }
    ];

    defaultServers.forEach(srv => this.servers.set(srv.id, srv));
  }

  public subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(type: McpClientEvent['type'], data: any) {
    this.listeners.forEach(l => {
      try {
        l({ type, data });
      } catch (e) {
        console.error('[McpClient] Erro ao disparar listener:', e);
      }
    });
  }

  public getServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  public getServer(id: string): MCPServer | undefined {
    return this.servers.get(id);
  }

  public getSessionLogs(): MCPSessionLog[] {
    return [...this.sessionLogs];
  }

  public addLog(log: Omit<MCPSessionLog, 'id' | 'timestamp'>) {
    const fullLog: MCPSessionLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      ...log
    };
    this.sessionLogs.unshift(fullLog);
    if (this.sessionLogs.length > 200) {
      this.sessionLogs.pop();
    }
    this.emit('LOG_ADDED', fullLog);
  }

  /**
   * Consulta status real do servidor Notion MCP no Gateway
   */
  public async checkNotionStatus(): Promise<MCPServer> {
    try {
      const res = await fetch('/api/mcp/notion/status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      const updatedServer: MCPServer = {
        id: 'notion',
        name: data.server.name,
        status: data.server.status,
        description: data.server.description,
        transport: data.server.transport,
        endpoint: data.server.url,
        toolsCount: data.tools?.length || 0,
        authType: 'oauth2',
        capabilities: data.server.capabilities || []
      };

      this.servers.set('notion', updatedServer);

      // Registra ferramentas descobertas dinamicamente
      if (Array.isArray(data.tools)) {
        data.tools.forEach((t: any) => {
          const toolId = `notion_${t.name}`;
          this.dynamicTools.set(toolId, {
            id: toolId,
            name: t.name,
            category: 'External Connectors',
            description: t.description || 'Ferramenta oficial Notion MCP',
            enabled: true,
            parametersSchema: t.inputSchema || {},
            serverId: 'notion',
            isDynamic: true,
            execute: async (args: any) => this.executeTool('notion', t.name, args)
          });
        });
      }

      this.emit('SERVER_STATUS_CHANGE', updatedServer);
      return updatedServer;
    } catch (err: any) {
      const server = this.servers.get('notion');
      if (server) {
        server.status = 'NOT_CONNECTED';
        server.error = err.message;
        this.emit('SERVER_STATUS_CHANGE', server);
      }
      return this.servers.get('notion')!;
    }
  }

  /**
   * Conecta ao Notion MCP enviando o token para o gateway
   */
  public async connectNotion(token?: string): Promise<{ success: boolean; toolsCount: number; message: string }> {
    const server = this.servers.get('notion');
    if (server) {
      server.status = 'CONNECTING';
      this.emit('SERVER_STATUS_CHANGE', server);
    }

    try {
      const res = await fetch('/api/mcp/notion/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Falha ao conectar com o Notion MCP.');
      }

      if (server) {
        server.status = 'CONNECTED';
        server.toolsCount = data.tools?.length || 0;
        server.lastConnectedAt = Date.now();
        server.error = data.warning || undefined;
        this.servers.set('notion', server);
      }

      // Registra ferramentas dinâmicas
      (data.tools || []).forEach((t: any) => {
        const toolId = `notion_${t.name}`;
        this.dynamicTools.set(toolId, {
          id: toolId,
          name: t.name,
          category: 'External Connectors',
          description: t.description,
          enabled: true,
          parametersSchema: t.inputSchema || {},
          serverId: 'notion',
          isDynamic: true,
          execute: async (args: any) => this.executeTool('notion', t.name, args)
        });
      });

      this.addLog({
        toolId: 'notion_initialize',
        toolName: data.isDemo ? 'MCP Sandbox Initialize' : 'MCP Initialize',
        agentRole: 'Notion MCP Gateway',
        status: 'SUCCESS',
        inputArgs: { endpoint: 'https://mcp.notion.com/mcp', isDemo: !!data.isDemo },
        outputResult: { toolsFound: data.tools?.length, capabilities: data.capabilities, warning: data.warning },
        durationMs: 420,
        serverId: 'notion'
      });

      this.emit('SERVER_STATUS_CHANGE', server);
      this.emit('TOOLS_DISCOVERED', Array.from(this.dynamicTools.values()));

      return {
        success: true,
        toolsCount: data.tools?.length || 0,
        message: data.warning || data.message || 'Notion MCP conectado com sucesso!'
      };
    } catch (err: any) {
      if (server) {
        server.status = 'ERROR';
        server.error = err.message;
        this.emit('SERVER_STATUS_CHANGE', server);
      }

      this.addLog({
        toolId: 'notion_connect_failed',
        toolName: 'MCP Connect',
        agentRole: 'Notion MCP Gateway',
        status: 'ERROR',
        inputArgs: {},
        outputResult: { error: err.message },
        durationMs: 200,
        serverId: 'notion'
      });

      throw err;
    }
  }

  /**
   * Desconecta do Notion MCP
   */
  public async disconnectNotion(): Promise<void> {
    try {
      await fetch('/api/mcp/notion/disconnect', { method: 'POST' });
    } catch (e) {
      console.warn('Erro ao desconectar no backend:', e);
    }

    const server = this.servers.get('notion');
    if (server) {
      server.status = 'NOT_CONNECTED';
      server.toolsCount = 0;
      this.servers.set('notion', server);
    }

    // Remove ferramentas dinâmicas do Notion
    Array.from(this.dynamicTools.keys()).forEach(key => {
      if (key.startsWith('notion_')) {
        this.dynamicTools.delete(key);
      }
    });

    this.addLog({
      toolId: 'notion_disconnect',
      toolName: 'MCP Disconnect',
      agentRole: 'Notion MCP Gateway',
      status: 'SUCCESS',
      inputArgs: {},
      outputResult: { message: 'Sessão encerrada com sucesso' },
      durationMs: 50,
      serverId: 'notion'
    });

    this.emit('SERVER_STATUS_CHANGE', server);
    this.emit('TOOLS_DISCOVERED', Array.from(this.dynamicTools.values()));
  }

  /**
   * Executa uma tool em um servidor MCP específico
   */
  public async executeTool(serverId: string, toolName: string, args: Record<string, any> = {}): Promise<any> {
    const startTime = Date.now();

    try {
      let endpoint = `/api/mcp/${serverId}/execute`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName, arguments: args })
      });

      const data = await res.json();
      const durationMs = Date.now() - startTime;

      if (!res.ok || data.error) {
        throw new Error(data.error || `Erro executando ${toolName}`);
      }

      this.addLog({
        toolId: `${serverId}_${toolName}`,
        toolName,
        agentRole: 'AI Tool Gateway',
        status: 'SUCCESS',
        inputArgs: args,
        outputResult: data.result,
        durationMs,
        serverId
      });

      return data.result;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;

      this.addLog({
        toolId: `${serverId}_${toolName}`,
        toolName,
        agentRole: 'AI Tool Gateway',
        status: 'ERROR',
        inputArgs: args,
        outputResult: { error: err.message },
        durationMs,
        serverId
      });

      throw err;
    }
  }

  /**
   * Pesquisa páginas e databases no Notion através do MCP Gateway
   */
  public async searchNotion(query: string): Promise<NotionPageSummary[]> {
    try {
      const res = await fetch('/api/mcp/notion/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro na busca do Notion');

      const rawResults = data.result?.results || data.result || [];
      if (!Array.isArray(rawResults)) return [];

      return rawResults.map((item: any) => ({
        id: item.id || `page_${Math.random()}`,
        title: item.title || item.properties?.title?.title?.[0]?.plain_text || item.name || 'Página Sem Título',
        icon: item.icon?.emoji || (item.object === 'database' ? '📊' : '📄'),
        url: item.url,
        lastEditedTime: item.last_edited_time || new Date().toISOString(),
        isDatabase: item.object === 'database',
        excerpt: item.description?.[0]?.plain_text || item.excerpt || ''
      }));
    } catch (err: any) {
      console.error('[McpClient] Erro ao pesquisar no Notion:', err);
      throw err;
    }
  }

  /**
   * Retorna todas as ferramentas (estáticas + dinâmicas)
   */
  public getAllTools(): MCPTool[] {
    return Array.from(this.dynamicTools.values());
  }
}

export const mcpClient = McpClient.getInstance();
