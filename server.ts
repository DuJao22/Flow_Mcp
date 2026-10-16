import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { notionOAuthHandler } from './server/mcp/oauthHandler';
import { mcpSessionManager } from './server/mcp/sessionManager';
import { serverCredentialService } from './server/mcp/serverCredentialService';
import { GoogleGenAI } from '@google/genai';
import { CredentialProvider } from './types';

// Middleware de extração de sessão isolada por usuário
interface AuthenticatedRequest extends Request {
  sessionId?: string;
  userId?: string;
}

const sessionMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const sessionId = (req.headers['x-session-id'] as string) || (req.query.sessionId as string) || 'default_session';
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'default_user';
  req.sessionId = sessionId;
  req.userId = userId;
  next();
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares essenciais
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(sessionMiddleware);

  // --- API DE SAÚDE & STATUS DO MCP GATEWAY ---
  app.get('/api/health', (req: AuthenticatedRequest, res: Response) => {
    const notionClient = mcpSessionManager.getNotionClient(req.sessionId || 'default', req.userId || 'default');
    res.json({
      status: 'ok',
      service: 'Flow Architect AI & MCP Gateway (Multi-Tenant)',
      version: '2.5.0-secure',
      notionConnected: notionClient.isConnected(),
      discoveredToolsCount: notionClient.getDiscoveredTools().length
    });
  });

  // --- ENDPOINTS DE CREDENCIAIS SEGURAS (FASE 2 & 3) ---
  // Retorna somente credenciais mascaradas para o frontend (NUNCA expõe o segredo real)
  app.get('/api/credentials/masked', (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId || 'default_user';
    const credentials = serverCredentialService.getAllMaskedCredentials(userId);
    res.json({ credentials });
  });

  app.post('/api/credentials/set', (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId || 'default_user';
      const { provider, secret, metadata } = req.body;
      if (!provider || !secret) {
        return res.status(400).json({ error: 'Provider e secret são obrigatórios.' });
      }

      const masked = serverCredentialService.setCredential(userId, provider as CredentialProvider, secret, metadata);
      res.json({ success: true, credential: masked });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/credentials/remove', (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId || 'default_user';
    const { provider } = req.body;
    if (provider) {
      serverCredentialService.removeCredential(userId, provider as CredentialProvider);
    }
    res.json({ success: true });
  });

  // --- ENDPOINTS OFICIAIS DO NOTION MCP (ISOLADOS POR SESSÃO - FASE 1 & 4) ---

  /**
   * 1. Status atual da conexão com o servidor do Notion MCP para a sessão do usuário
   */
  app.get('/api/mcp/notion/status', (req: AuthenticatedRequest, res: Response) => {
    const sessionId = req.sessionId || 'default_session';
    const userId = req.userId || 'default_user';
    const notionClient = mcpSessionManager.getNotionClient(sessionId, userId);

    const isConnected = notionClient.isConnected();
    const isDemo = notionClient.isDemo();
    const tools = notionClient.getDiscoveredTools();
    const capabilities = notionClient.getCapabilities();

    res.json({
      sessionId,
      userId,
      server: {
        id: 'notion',
        name: isDemo ? 'Notion MCP Server (Sandbox Workspace)' : 'Notion MCP Server Oficial',
        url: 'https://mcp.notion.com/mcp',
        transport: 'streamable-http',
        authType: 'oauth2',
        status: isConnected ? 'CONNECTED' : 'NOT_CONNECTED',
        isDemo,
        description: isDemo
          ? 'Servidor MCP do Notion em modo Sandbox Workspace ativo. Suporta leitura de documentação de templates e testes sem bloquear a aplicação.'
          : 'Servidor MCP oficial do Notion para acesso estruturado a páginas, databases e documentação de projetos.',
        toolsCount: tools.length,
        capabilities
      },
      tools
    });
  });

  /**
   * 2. Conectar / Autenticar ao Notion MCP por Sessão Isolada
   */
  app.post('/api/mcp/notion/connect', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessionId = req.sessionId || 'default_session';
      const userId = req.userId || 'default_user';
      const { token } = req.body;

      const effectiveToken = token || serverCredentialService.getInternalSecret(userId, 'notion') || process.env.NOTION_INTERNAL_INTEGRATION_TOKEN;

      if (!effectiveToken) {
        mcpSessionManager.authenticateSession(sessionId, userId, 'notion', '', ['notion.read', 'notion.search'], true);
        const notionClient = mcpSessionManager.getNotionClient(sessionId, userId);
        return res.json({
          success: true,
          isDemo: true,
          sessionId,
          message: 'Conectado ao Notion MCP em modo Sandbox Workspace (Demonstração). Adicione um token para sincronizar seu workspace real.',
          serverInfo: { name: 'Notion MCP Server (Sandbox Workspace)', version: '2.0.0-demo' },
          capabilities: notionClient.getCapabilities(),
          tools: notionClient.getDiscoveredTools()
        });
      }

      // Salva no cofre seguro se enviado
      if (token) {
        serverCredentialService.setCredential(userId, 'notion', token);
      }

      mcpSessionManager.authenticateSession(sessionId, userId, 'notion', effectiveToken, ['notion.read', 'notion.search', 'notion.write'], false);
      const notionClient = mcpSessionManager.getNotionClient(sessionId, userId);

      try {
        const initResult = await notionClient.initialize();
        return res.json({
          success: true,
          isDemo: false,
          sessionId,
          message: 'Conectado com sucesso ao Notion MCP oficial via Streamable HTTP!',
          serverInfo: initResult.serverInfo,
          capabilities: initResult.capabilities,
          tools: notionClient.getDiscoveredTools()
        });
      } catch (authErr: any) {
        console.warn('[MCP Gateway] Autenticação remota Notion MCP falhou. Ativando Sandbox Mode isolado:', authErr.message);
        mcpSessionManager.authenticateSession(sessionId, userId, 'notion', '', ['notion.read', 'notion.search'], true);
        const demoClient = mcpSessionManager.getNotionClient(sessionId, userId);

        return res.json({
          success: true,
          isDemo: true,
          sessionId,
          warning: `Autenticação com Notion recusada (${authErr.message}). Modo Sandbox Workspace ativado com sucesso para desenvolvimento e templates.`,
          message: 'Conectado via Notion MCP Sandbox Workspace.',
          serverInfo: { name: 'Notion MCP Server (Sandbox Workspace)', version: '2.0.0-demo' },
          capabilities: demoClient.getCapabilities(),
          tools: demoClient.getDiscoveredTools()
        });
      }
    } catch (err: any) {
      console.error('[MCP Gateway] Erro ao conectar com Notion MCP:', err);
      res.status(500).json({ error: err.message || 'Falha ao conectar ao servidor oficial Notion MCP.' });
    }
  });

  /**
   * 3. Desconectar do Notion MCP para a sessão
   */
  app.post('/api/mcp/notion/disconnect', (req: AuthenticatedRequest, res: Response) => {
    const sessionId = req.sessionId || 'default_session';
    const userId = req.userId || 'default_user';
    mcpSessionManager.revokeSession(sessionId, userId, 'notion');
    res.json({ success: true, message: 'Sessão do Notion MCP desconectada com sucesso.' });
  });

  /**
   * 4. Listar Ferramentas Descobertas Dinamicamente
   */
  app.get('/api/mcp/notion/tools', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessionId = req.sessionId || 'default_session';
      const userId = req.userId || 'default_user';
      const notionClient = mcpSessionManager.getNotionClient(sessionId, userId);

      if (!notionClient.isConnected()) {
        return res.status(401).json({ error: 'Notion MCP Server não está conectado nesta sessão.' });
      }

      const tools = await notionClient.refreshTools();
      res.json({ tools });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * 5. Executar Tool via MCP JSON-RPC 2.0 com Validação de Permissão (FASE 4)
   */
  app.post('/api/mcp/notion/execute', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessionId = req.sessionId || 'default_session';
      const userId = req.userId || 'default_user';
      const { toolName, arguments: toolArgs } = req.body;

      if (!toolName) {
        return res.status(400).json({ error: 'Nome da ferramenta obrigatório.' });
      }

      // Validação estrita de escopo de permissão
      const permissionCheck = mcpSessionManager.validateToolPermission(sessionId, userId, 'notion', toolName);
      if (!permissionCheck.allowed) {
        return res.status(403).json({ error: permissionCheck.reason });
      }

      const notionClient = mcpSessionManager.getNotionClient(sessionId, userId);
      const startTime = Date.now();
      const result = await notionClient.callTool(toolName, toolArgs || {});
      const durationMs = Date.now() - startTime;

      res.json({ success: true, tool: toolName, durationMs, result });
    } catch (err: any) {
      console.error(`[MCP Gateway] Erro executando tool ${req.body?.toolName}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * 6. Busca no Workspace do Notion
   */
  app.post('/api/mcp/notion/search', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessionId = req.sessionId || 'default_session';
      const userId = req.userId || 'default_user';
      const notionClient = mcpSessionManager.getNotionClient(sessionId, userId);
      const { query } = req.body;
      const searchResult = await notionClient.searchWorkspace(query || '');
      res.json({ result: searchResult });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * 7. Leitura de Página/Blocos (Notion Explorer)
   */
  app.get('/api/mcp/notion/page/:pageId', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessionId = req.sessionId || 'default_session';
      const userId = req.userId || 'default_user';
      const notionClient = mcpSessionManager.getNotionClient(sessionId, userId);
      const { pageId } = req.params;
      const content = await notionClient.getPageContent(pageId);
      res.json({ result: content });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * 8. Rotas OAuth do Notion
   */
  app.get('/api/mcp/notion/oauth/authorize-url', (req: Request, res: Response) => {
    const state = (req.query.state as string) || 'flow_architect_session';
    const authUrl = notionOAuthHandler.getAuthorizationUrl(state);
    res.json({ url: authUrl });
  });

  app.post('/api/mcp/notion/oauth/exchange', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessionId = req.sessionId || 'default_session';
      const userId = req.userId || 'default_user';
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: 'Código de autorização OAuth obrigatório.' });
      }

      const tokenData = await notionOAuthHandler.exchangeCodeForToken(code);
      serverCredentialService.setCredential(userId, 'notion', tokenData.accessToken, { workspaceName: tokenData.workspaceName });
      mcpSessionManager.authenticateSession(sessionId, userId, 'notion', tokenData.accessToken, ['notion.read', 'notion.search', 'notion.write'], false);
      const client = mcpSessionManager.getNotionClient(sessionId, userId);
      const initResult = await client.initialize();

      res.json({
        success: true,
        workspaceName: tokenData.workspaceName,
        workspaceIcon: tokenData.workspaceIcon,
        tools: client.getDiscoveredTools(),
        capabilities: initResult.capabilities
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- ENDPOINTS FIGMA DEV MODE & TOKEN SYNC (ISOLADOS POR SESSÃO) ---

  app.post('/api/mcp/figma/check-auth', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId || 'default_user';
      const { token } = req.body;
      const effectiveToken = token || serverCredentialService.getInternalSecret(userId, 'figma');
      const figmaClient = mcpSessionManager.getFigmaClient(req.sessionId || 'default', userId, effectiveToken || '');
      const result = await figmaClient.checkAuth(effectiveToken);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/mcp/figma/file', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId || 'default_user';
      const { fileKey, token } = req.body;
      if (!fileKey) {
        return res.status(400).json({ error: 'fileKey ou URL do Figma é obrigatória.' });
      }
      const effectiveToken = token || serverCredentialService.getInternalSecret(userId, 'figma');
      const figmaClient = mcpSessionManager.getFigmaClient(req.sessionId || 'default', userId, effectiveToken || '');
      const fileData = await figmaClient.getFile(fileKey, 2, effectiveToken);
      
      const pages = (fileData.document?.children || []).map((page: any) => {
        const frames = (page.children || [])
          .filter((c: any) => c.type === 'FRAME' || c.type === 'COMPONENT' || c.type === 'SECTION' || c.type === 'GROUP')
          .map((frame: any) => {
            const bbox = frame.absoluteBoundingBox || { width: 0, height: 0 };
            return {
              id: frame.id,
              name: frame.name,
              type: frame.type,
              width: Math.round(bbox.width),
              height: Math.round(bbox.height),
              childCount: frame.children?.length || 0
            };
          });

        return { id: page.id, name: page.name, frames };
      });

      res.json({
        key: fileKey,
        name: fileData.name,
        lastModified: fileData.lastModified,
        thumbnailUrl: fileData.thumbnailUrl,
        version: fileData.version,
        role: fileData.role,
        pages
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/mcp/figma/extract-tokens', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId || 'default_user';
      const { fileKey, nodeId, token } = req.body;
      if (!fileKey) {
        return res.status(400).json({ error: 'fileKey é obrigatória.' });
      }
      const effectiveToken = token || serverCredentialService.getInternalSecret(userId, 'figma');
      const figmaClient = mcpSessionManager.getFigmaClient(req.sessionId || 'default', userId, effectiveToken || '');
      const tokens = await figmaClient.extractTokens(fileKey, nodeId, effectiveToken);
      res.json(tokens);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/mcp/figma/inspect-node', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId || 'default_user';
      const { fileKey, nodeId, token } = req.body;
      if (!fileKey || !nodeId) {
        return res.status(400).json({ error: 'fileKey e nodeId são obrigatórios.' });
      }
      const effectiveToken = token || serverCredentialService.getInternalSecret(userId, 'figma');
      const figmaClient = mcpSessionManager.getFigmaClient(req.sessionId || 'default', userId, effectiveToken || '');
      const inspection = await figmaClient.inspectNodeDevMode(fileKey, nodeId, effectiveToken);
      res.json(inspection);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/mcp/figma/images', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId || 'default_user';
      const { fileKey, nodeIds, format, scale, token } = req.body;
      if (!fileKey || !nodeIds || !Array.isArray(nodeIds)) {
        return res.status(400).json({ error: 'fileKey e nodeIds são obrigatórios.' });
      }
      const effectiveToken = token || serverCredentialService.getInternalSecret(userId, 'figma');
      const figmaClient = mcpSessionManager.getFigmaClient(req.sessionId || 'default', userId, effectiveToken || '');
      const images = await figmaClient.getImageUrls(fileKey, nodeIds, format || 'png', scale || 2, effectiveToken);
      res.json({ images });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- ENDPOINTS PLAYWRIGHT & BROWSER STRATEGY TRANSPARÊNCIA (FASE 6) ---
  app.get('/api/mcp/playwright/status', (req: Request, res: Response) => {
    const hasRemoteWs = !!process.env.PLAYWRIGHT_WS_ENDPOINT || !!process.env.PLAYWRIGHT_SERVICE_URL;
    res.json({
      mode: hasRemoteWs ? 'REAL_BROWSER' : 'STATIC_ANALYSIS',
      badgeText: hasRemoteWs ? '🟢 REAL BROWSER (Playwright Headless)' : '🟡 STATIC ANALYSIS (DOM Engine)',
      isRealBrowser: hasRemoteWs,
      features: {
        screenshots: hasRemoteWs,
        wcagAccessibilityCheck: true,
        responsiveViewports: true,
        consoleAudit: true,
        motionEngine: true
      }
    });
  });

  app.post('/api/mcp/playwright/inspect', async (req: Request, res: Response) => {
    try {
      const { htmlContent, viewports } = req.body;
      if (!htmlContent) {
        return res.status(400).json({ error: 'htmlContent é obrigatório.' });
      }

      const { playwrightVisualService } = await import('./server/mcp/playwrightVisualService');
      const result = await playwrightVisualService.capturePage({ htmlContent, viewports });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- ENDPOINTS GITHUB & VERCEL ONE-CLICK PIPELINE & MCP DEPLOY ---
  app.post('/api/mcp/deploy/execute', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId || 'default_user';
      const { projectName, files, platform, githubConfig, customGithubToken, customVercelToken } = req.body;
      if (!projectName || !files || !Array.isArray(files)) {
        return res.status(400).json({ error: 'projectName e lista de files são obrigatórios.' });
      }

      const effectiveGithub = customGithubToken || serverCredentialService.getInternalSecret(userId, 'github');
      const effectiveVercel = customVercelToken || serverCredentialService.getInternalSecret(userId, 'vercel');

      const { deploymentPipelineService } = await import('./server/mcp/deploymentPipelineService');
      const result = await deploymentPipelineService.executePipeline({
        projectName,
        files,
        platform: platform || 'vercel',
        githubConfig,
        customGithubToken: effectiveGithub || undefined,
        customVercelToken: effectiveVercel || undefined
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- SERVIDOR GEMINI PROXY COM DETECÇÃO DINÂMICA DE VERSÃO ---
  const FALLBACK_PRIORITY_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash'
  ];

  let serverModelCache: { detectedModel: string; models: string[]; timestamp: number } | null = null;

  async function detectServerGeminiModels(apiKey: string): Promise<{ detectedModel: string; models: string[] }> {
    if (serverModelCache && (Date.now() - serverModelCache.timestamp < 10 * 60 * 1000)) {
      return serverModelCache;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const list = await ai.models.list();
      const scored: Array<{ name: string; score: number }> = [];

      const scoreName = (raw: string) => {
        const clean = raw.toLowerCase().replace('models/', '');
        if (clean.includes('embedding') || clean.includes('image') || clean.includes('tts') ||
            clean.includes('live') || clean.includes('robotics') || clean.includes('computer-use') ||
            clean.includes('aqa') || clean.includes('transcribe') || clean.includes('gemini-1.5') ||
            clean.includes('gemini-2.0') || clean.startsWith('gemini-pro')) {
          return -1;
        }
        if (clean === 'gemini-3.8-flash') return 1000;
        if (clean === 'gemini-3.7-flash') return 900;
        if (clean === 'gemini-3.6-flash') return 800;
        if (clean === 'gemini-flash-latest') return 750;
        if (clean === 'gemini-3.5-flash') return 700;
        if (clean === 'gemini-3.1-flash-lite') return 600;
        if (clean === 'gemini-3-flash-preview') return 550;
        if (clean === 'gemini-2.5-flash') return 400;
        if (clean.includes('flash')) return 200;
        if (clean.includes('gemini')) return 100;
        return 0;
      };

      for await (const m of list) {
        const name = (m.name || '').replace('models/', '');
        const s = scoreName(name);
        if (s > 0) scored.push({ name, score: s });
      }

      if (scored.length > 0) {
        scored.sort((a, b) => b.score - a.score);
        const models = scored.map(s => s.name);
        serverModelCache = {
          detectedModel: models[0],
          models,
          timestamp: Date.now()
        };
        return serverModelCache;
      }
    } catch (err) {
      console.warn('[Server Gemini Discovery Error]:', err);
    }

    return {
      detectedModel: FALLBACK_PRIORITY_MODELS[0],
      models: FALLBACK_PRIORITY_MODELS
    };
  }

  // Endpoint para listar os modelos disponíveis e o modelo auto-detectado
  app.get('/api/gemini/models', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId || 'default_user';
      const apiKey = serverCredentialService.getInternalSecret(userId, 'gemini') || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          detectedModel: FALLBACK_PRIORITY_MODELS[0],
          models: FALLBACK_PRIORITY_MODELS,
          isAuto: true,
          mode: 'OFFLINE_FALLBACK'
        });
      }

      const discovery = await detectServerGeminiModels(apiKey);
      res.json({
        detectedModel: discovery.detectedModel,
        models: discovery.models,
        isAuto: true,
        mode: 'DYNAMIC_DISCOVERY'
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/gemini/generate', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId || 'default_user';
      const { prompt, model: requestedModel, systemInstruction } = req.body;
      const apiKey = serverCredentialService.getInternalSecret(userId, 'gemini') || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
      }

      const ai = new GoogleGenAI({ apiKey });

      // Resolução dinâmica do modelo se 'auto', omitido ou legacy 2.5
      let targetModels: string[] = [];
      const isAuto = !requestedModel || requestedModel === 'auto' || requestedModel === 'gemini-2.5-flash' || requestedModel.trim() === '';
      
      if (isAuto) {
        const discovery = await detectServerGeminiModels(apiKey);
        targetModels = discovery.models.length > 0 ? discovery.models : FALLBACK_PRIORITY_MODELS;
      } else {
        targetModels = [requestedModel, ...FALLBACK_PRIORITY_MODELS];
      }

      let lastError: any = null;
      for (const modelToTry of targetModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelToTry,
            contents: prompt,
            config: systemInstruction ? { systemInstruction } : undefined
          });

          return res.json({ 
            text: response.text,
            modelUsed: modelToTry,
            autoDetected: isAuto
          });
        } catch (err: any) {
          lastError = err;
          console.warn(`[Gemini Server API] Model ${modelToTry} failed, trying next:`, err.message);
          // Se for erro de autenticação fatal (400), não adianta tentar outros modelos
          if (err.status === 400 && err.message?.includes('API_KEY_INVALID')) {
            break;
          }
        }
      }

      throw lastError || new Error('Nenhum modelo Gemini disponível respondeu com sucesso.');
    } catch (err: any) {
      console.error('[Gemini Server API Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Flow Architect AI & MCP Gateway rodando em http://localhost:${PORT}`);
  });
}

startServer();

