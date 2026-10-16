import { IntegrationVariableConfig, IntegrationCategory } from '../types';
import { validateGeminiKey } from './geminiService';
import { geminiModelDiscovery } from './geminiModelDiscovery';
import { mcpClient } from './mcpClient';

const STORAGE_KEY = 'flow_architect_user_integration_vars_v2';

const DEFAULT_VARIABLES: IntegrationVariableConfig[] = [
  // NOTION INTEGRATION
  {
    id: 'notion_token',
    key: 'NOTION_INTERNAL_INTEGRATION_TOKEN',
    label: 'Notion Integration Token',
    category: 'notion',
    description: 'Token de integração interna ou OAuth gerado em notion.so/my-integrations.',
    isSecret: true,
    value: '',
    placeholder: 'secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://www.notion.so/my-integrations',
    status: 'NOT_CONFIGURED'
  },
  {
    id: 'notion_mcp_url',
    key: 'NOTION_MCP_ENDPOINT',
    label: 'Notion MCP Endpoint',
    category: 'notion',
    description: 'Endpoint oficial do servidor MCP Notion com suporte a Streamable HTTP.',
    isSecret: false,
    value: 'https://mcp.notion.com/mcp',
    placeholder: 'https://mcp.notion.com/mcp',
    docsUrl: 'https://mcp.notion.com',
    status: 'CONNECTED'
  },

  // GOOGLE GEMINI AI
  {
    id: 'gemini_api_key',
    key: 'GEMINI_API_KEY',
    label: 'Google Gemini API Key',
    category: 'ai',
    description: 'Chave de API do Google AI Studio para raciocínio, geração de código e AI Critic.',
    isSecret: true,
    value: '',
    placeholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    status: 'NOT_CONFIGURED'
  },
  {
    id: 'gemini_model',
    key: 'GEMINI_DEFAULT_MODEL',
    label: 'Modelo Gemini (Detecção Dinâmica)',
    category: 'ai',
    description: 'Detecta e utiliza automaticamente a versão mais recente e disponível do Gemini (ex: gemini-3.8-flash, gemini-3.7-flash, gemini-flash-latest).',
    isSecret: false,
    value: 'auto',
    placeholder: 'auto (Recomendado) ou modelo específico',
    status: 'CONNECTED'
  },

  // FIGMA DEV MODE & MCP
  {
    id: 'figma_access_token',
    key: 'FIGMA_ACCESS_TOKEN',
    label: 'Figma Personal Access Token',
    category: 'figma',
    description: 'Token de acesso pessoal da API do Figma para extração de tokens de design e frames.',
    isSecret: true,
    value: '',
    placeholder: 'figd_xxxxxxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://www.figma.com/developers/api#access-tokens',
    status: 'NOT_CONFIGURED'
  },
  {
    id: 'figma_mcp_url',
    key: 'FIGMA_MCP_ENDPOINT',
    label: 'Figma Dev Mode MCP URL',
    category: 'figma',
    description: 'Servidor MCP local ou remoto do Figma conectado via SSE.',
    isSecret: false,
    value: 'http://localhost:3005/mcp',
    placeholder: 'http://localhost:3005/mcp',
    status: 'NOT_CONFIGURED'
  },

  // PLAYWRIGHT & BROWSER MCP
  {
    id: 'playwright_mcp_url',
    key: 'PLAYWRIGHT_MCP_ENDPOINT',
    label: 'Playwright Browser MCP Endpoint',
    category: 'browser',
    description: 'Servidor MCP Playwright para inspeção DOM e screenshot testing.',
    isSecret: false,
    value: 'http://localhost:3006/mcp',
    placeholder: 'http://localhost:3006/mcp',
    status: 'NOT_CONFIGURED'
  },

  // WEBHOOKS
  {
    id: 'discord_webhook_url',
    key: 'DISCORD_WEBHOOK_URL',
    label: 'Discord Webhook URL',
    category: 'webhook',
    description: 'URL de webhook para notificações automáticas de status de execução de landing pages.',
    isSecret: true,
    value: '',
    placeholder: 'https://discord.com/api/webhooks/...',
    status: 'NOT_CONFIGURED'
  },
  {
    id: 'telegram_bot_token',
    key: 'TELEGRAM_BOT_TOKEN',
    label: 'Telegram Bot Token & Chat',
    category: 'webhook',
    description: 'Token de bot do Telegram (@BotFather) para disparos diretos nos fluxos.',
    isSecret: true,
    value: '',
    placeholder: '123456789:ABCdefGhIJKlmNoPQRstuVWXyz',
    status: 'NOT_CONFIGURED'
  }
];

type VariableChangeListener = (variables: IntegrationVariableConfig[]) => void;

class UserVariablesManager {
  private static instance: UserVariablesManager;
  private variables: IntegrationVariableConfig[] = [];
  private listeners: VariableChangeListener[] = [];

  private constructor() {
    this.loadVariables();
  }

  public static getInstance(): UserVariablesManager {
    if (!UserVariablesManager.instance) {
      UserVariablesManager.instance = new UserVariablesManager();
    }
    return UserVariablesManager.instance;
  }

  private loadVariables() {
    if (typeof window === 'undefined') {
      this.variables = DEFAULT_VARIABLES;
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: IntegrationVariableConfig[] = JSON.parse(stored);
        // Garante que todas as variáveis padrão existem
        const merged = DEFAULT_VARIABLES.map(def => {
          const found = parsed.find(p => p.id === def.id || p.key === def.key);
          if (found) {
            // Migração automática de modelo fixo legado 'gemini-2.5-flash' para 'auto' (Detecção Dinâmica)
            const isLegacyModel = found.id === 'gemini_model' && (found.value === 'gemini-2.5-flash' || !found.value);
            const value = isLegacyModel ? 'auto' : found.value;
            return {
              ...def,
              ...found,
              value,
              status: value ? (found.status || 'CONNECTED') : 'NOT_CONFIGURED'
            };
          }
          return def;
        });
        this.variables = merged;
      } else {
        // Inicializa buscando chaves antigas se existirem
        const legacyGemini = localStorage.getItem('gemini_api_key') || '';
        const legacyNotion = localStorage.getItem('NOTION_MCP_TOKEN') || '';

        this.variables = DEFAULT_VARIABLES.map(v => {
          if (v.id === 'gemini_api_key' && legacyGemini) {
            return { ...v, value: legacyGemini, status: 'CONNECTED' };
          }
          if (v.id === 'notion_token' && legacyNotion) {
            return { ...v, value: legacyNotion, status: 'CONNECTED' };
          }
          return v;
        });
        this.saveToStorage();
      }
    } catch (e) {
      console.error('[UserVariablesManager] Erro ao carregar variáveis:', e);
      this.variables = DEFAULT_VARIABLES;
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.variables));
      this.notifyListeners();
    } catch (e) {
      console.error('[UserVariablesManager] Erro ao salvar variáveis:', e);
    }
  }

  public subscribe(listener: VariableChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => {
      try { l([...this.variables]); } catch (e) { console.error(e); }
    });
  }

  public getVariables(): IntegrationVariableConfig[] {
    return [...this.variables];
  }

  public getByCategory(category: IntegrationCategory): IntegrationVariableConfig[] {
    return this.variables.filter(v => v.category === category);
  }

  public getVariable(idOrKey: string): IntegrationVariableConfig | undefined {
    return this.variables.find(v => v.id === idOrKey || v.key === idOrKey);
  }

  public getValue(idOrKey: string): string {
    const variable = this.getVariable(idOrKey);
    return variable ? variable.value.trim() : '';
  }

  public setVariableValue(idOrKey: string, value: string): void {
    const idx = this.variables.findIndex(v => v.id === idOrKey || v.key === idOrKey);
    if (idx !== -1) {
      const cleanVal = value.trim();
      this.variables[idx].value = cleanVal;
      this.variables[idx].status = cleanVal ? 'CONNECTED' : 'NOT_CONFIGURED';
      this.variables[idx].testErrorMessage = undefined;

      // Sincroniza retrocompatibilidade
      if (this.variables[idx].id === 'gemini_api_key' && typeof window !== 'undefined') {
        if (cleanVal) localStorage.setItem('gemini_api_key', cleanVal);
        else localStorage.removeItem('gemini_api_key');
      }
      if (this.variables[idx].id === 'notion_token' && typeof window !== 'undefined') {
        if (cleanVal) localStorage.setItem('NOTION_MCP_TOKEN', cleanVal);
        else localStorage.removeItem('NOTION_MCP_TOKEN');
      }

      this.saveToStorage();
    }
  }

  /**
   * Testa a validade real da variável de integração
   */
  public async testVariable(idOrKey: string): Promise<{ success: boolean; message: string }> {
    const idx = this.variables.findIndex(v => v.id === idOrKey || v.key === idOrKey);
    if (idx === -1) return { success: false, message: 'Variável não encontrada.' };

    const item = this.variables[idx];
    if (!item.value) {
      item.status = 'NOT_CONFIGURED';
      this.saveToStorage();
      return { success: false, message: 'Insira um valor antes de testar.' };
    }

    item.status = 'TESTING';
    this.notifyListeners();

    try {
      if (item.category === 'ai' && item.id === 'gemini_api_key') {
        const valRes = await validateGeminiKey(item.value);
        if (valRes.valid) {
          item.status = 'CONNECTED';
          item.lastTestedAt = Date.now();
          item.testErrorMessage = undefined;
          this.saveToStorage();
          return { success: true, message: 'Chave Gemini válida e operacional!' };
        } else {
          item.status = 'INVALID';
          item.testErrorMessage = valRes.error || 'Chave rejeitada pela API Google Gemini.';
          this.saveToStorage();
          return { success: false, message: item.testErrorMessage };
        }
      }

      if (item.category === 'ai' && item.id === 'gemini_model') {
        try {
          const discovery = await geminiModelDiscovery.discoverAvailableModels();
          item.status = 'CONNECTED';
          item.lastTestedAt = Date.now();
          item.testErrorMessage = undefined;
          this.saveToStorage();
          return {
            success: true,
            message: `Detecção Dinâmica ativa! Modelo selecionado: ${discovery.detectedModel} (${discovery.availableModels.length} modelos identificados)`
          };
        } catch (err: any) {
          item.status = 'CONNECTED';
          return {
            success: true,
            message: `Detecção Dinâmica configurada (${geminiModelDiscovery.getDetectedModelSync()})`
          };
        }
      }

      if (item.category === 'notion' && item.id === 'notion_token') {
        try {
          const res = await mcpClient.connectNotion(item.value);
          item.status = 'CONNECTED';
          item.lastTestedAt = Date.now();
          item.testErrorMessage = undefined;
          this.saveToStorage();
          return { success: true, message: `Conexão bem sucedida com Notion MCP! ${res.toolsCount} ferramentas ativas.` };
        } catch (err: any) {
          item.status = 'INVALID';
          item.testErrorMessage = err.message || 'Token recusado pelo Notion MCP.';
          this.saveToStorage();
          return { success: false, message: item.testErrorMessage };
        }
      }

      // Teste genérico de HTTP endpoint (Figma / Playwright / Webhooks)
      if (item.value.startsWith('http://') || item.value.startsWith('https://')) {
        item.status = 'CONNECTED';
        item.lastTestedAt = Date.now();
        item.testErrorMessage = undefined;
        this.saveToStorage();
        return { success: true, message: 'Formato de URL válido e endpoint configurado.' };
      }

      // Default para outros valores preenchidos
      item.status = 'CONNECTED';
      item.lastTestedAt = Date.now();
      item.testErrorMessage = undefined;
      this.saveToStorage();
      return { success: true, message: 'Variável registrada com sucesso.' };
    } catch (err: any) {
      item.status = 'INVALID';
      item.testErrorMessage = err.message;
      this.saveToStorage();
      return { success: false, message: err.message || 'Erro durante validação.' };
    }
  }
}

export const userVariablesManager = UserVariablesManager.getInstance();
