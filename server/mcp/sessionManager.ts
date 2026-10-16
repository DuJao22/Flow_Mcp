import { McpUserSession, McpPermissionScope } from '../../types';
import { NotionMcpClient } from './notionClient';
import { FigmaMcpClient } from './figmaClient';

/**
 * McpSessionManager — Gerenciador de Sessões Isoladas por Usuário (Multi-Tenant)
 * Garante que nenhuma credencial, token ou estado seja compartilhado entre usuários.
 */
export class McpSessionManager {
  private static instance: McpSessionManager;
  private sessions: Map<string, McpUserSession> = new Map();
  private notionClients: Map<string, NotionMcpClient> = new Map();
  private figmaClients: Map<string, FigmaMcpClient> = new Map();

  private constructor() {
    // Limpeza periódica de sessões expiradas a cada 15 minutos
    setInterval(() => this.cleanupExpiredSessions(), 15 * 60 * 1000);
  }

  public static getInstance(): McpSessionManager {
    if (!McpSessionManager.instance) {
      McpSessionManager.instance = new McpSessionManager();
    }
    return McpSessionManager.instance;
  }

  /**
   * Cria ou recupera uma sessão segura de usuário
   */
  public getOrCreateSession(
    sessionId: string,
    userId: string,
    serverId: string,
    serverUrl: string = 'https://mcp.notion.com/mcp',
    transport: 'streamable-http' | 'stdio' | 'sse' = 'streamable-http'
  ): McpUserSession {
    const key = `${userId}:${sessionId}:${serverId}`;
    let session = this.sessions.get(key);

    if (!session || session.status === 'REVOKED' || Date.now() > session.expiresAt) {
      session = {
        sessionId,
        userId,
        serverId,
        serverUrl,
        transport,
        authenticationState: 'UNAUTHENTICATED',
        permissions: ['notion.read', 'notion.search', 'figma.read', 'github.read'], // permissões padrão seguras de leitura
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 horas
        status: 'ACTIVE'
      };
      this.sessions.set(key, session);
    } else {
      session.lastActivity = Date.now();
    }

    return session;
  }

  /**
   * Vincula token autenticado exclusivamente à sessão do usuário
   */
  public authenticateSession(
    sessionId: string,
    userId: string,
    serverId: string,
    accessToken: string,
    permissions?: McpPermissionScope[],
    isDemo: boolean = false
  ): McpUserSession {
    const session = this.getOrCreateSession(sessionId, userId, serverId);
    session.accessToken = accessToken;
    session.authenticationState = isDemo ? 'DEMO_SANDBOX' : 'AUTHENTICATED';
    session.lastActivity = Date.now();

    if (permissions && permissions.length > 0) {
      session.permissions = Array.from(new Set([...session.permissions, ...permissions]));
    }

    // Instancia ou atualiza cliente dedicado isolado para esta sessão
    const clientKey = `${userId}:${sessionId}:${serverId}`;
    if (serverId === 'notion') {
      const client = new NotionMcpClient(session.serverUrl);
      if (isDemo || !accessToken) {
        client.activateDemoMode();
      } else {
        client.setToken(accessToken);
      }
      this.notionClients.set(clientKey, client);
    } else if (serverId === 'figma') {
      const client = new FigmaMcpClient(accessToken);
      this.figmaClients.set(clientKey, client);
    }

    return session;
  }

  /**
   * Recupera o cliente Notion exclusivo da sessão
   */
  public getNotionClient(sessionId: string, userId: string): NotionMcpClient {
    const clientKey = `${userId}:${sessionId}:notion`;
    let client = this.notionClients.get(clientKey);
    if (!client) {
      client = new NotionMcpClient();
      client.activateDemoMode(); // Inicializa em modo seguro isolado
      this.notionClients.set(clientKey, client);
    }
    return client;
  }

  /**
   * Recupera o cliente Figma exclusivo da sessão
   */
  public getFigmaClient(sessionId: string, userId: string, token?: string): FigmaMcpClient {
    const clientKey = `${userId}:${sessionId}:figma`;
    let client = this.figmaClients.get(clientKey);
    if (!client) {
      client = new FigmaMcpClient(token || '');
      this.figmaClients.set(clientKey, client);
    }
    return client;
  }

  /**
   * Valida permissão antes de executar qualquer ferramenta MCP
   */
  public validateToolPermission(
    sessionId: string,
    userId: string,
    serverId: string,
    toolName: string
  ): { allowed: boolean; reason?: string } {
    const key = `${userId}:${sessionId}:${serverId}`;
    const session = this.sessions.get(key);

    if (!session || session.status !== 'ACTIVE') {
      return { allowed: false, reason: 'Sessão MCP não encontrada ou inativa.' };
    }

    if (Date.now() > session.expiresAt) {
      session.status = 'REVOKED';
      return { allowed: false, reason: 'Sessão expirada. Autentique-se novamente.' };
    }

    session.lastActivity = Date.now();

    // Mapeamento estrito de permissões por ferramenta
    const toolScopeMap: Record<string, McpPermissionScope> = {
      search: 'notion.search',
      notion_search: 'notion.search',
      get_page: 'notion.read',
      read_page: 'notion.read',
      list_databases: 'notion.read',
      create_page: 'notion.write',
      update_page: 'notion.write',
      figma_get_file: 'figma.read',
      figma_get_nodes: 'figma.read',
      figma_get_images: 'figma.read',
      figma_extract_tokens: 'figma.read',
      github_create_repo: 'github.write',
      github_commit_files: 'github.write',
      vercel_deploy_site: 'vercel.deploy'
    };

    const requiredScope = toolScopeMap[toolName];
    if (requiredScope && !session.permissions.includes(requiredScope)) {
      return {
        allowed: false,
        reason: `Ação bloqueada: ferramenta '${toolName}' requer o escopo de permissão '${requiredScope}'.`
      };
    }

    return { allowed: true };
  }

  /**
   * Encerra e revoga a sessão
   */
  public revokeSession(sessionId: string, userId: string, serverId: string): void {
    const key = `${userId}:${sessionId}:${serverId}`;
    const session = this.sessions.get(key);
    if (session) {
      session.status = 'REVOKED';
      session.accessToken = undefined;
    }
    this.notionClients.delete(key);
    this.figmaClients.delete(key);
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [key, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(key);
        this.notionClients.delete(key);
        this.figmaClients.delete(key);
      }
    }
  }
}

export const mcpSessionManager = McpSessionManager.getInstance();
