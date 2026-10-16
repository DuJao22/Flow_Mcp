import { GoogleGenAI } from '@google/genai';
import { keyManager } from './keyManager';

/**
 * Ordem padrão de prioridade de modelos Gemini
 * (da geração mais moderna/rápida para fallbacks)
 */
export const DEFAULT_PRIORITY_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash'
];

export interface ModelDiscoveryResult {
  detectedModel: string;
  availableModels: string[];
  isAuto: boolean;
  source: 'live_discovery' | 'server_proxy' | 'cached' | 'fallback_chain';
  lastChecked: number;
}

const CACHE_KEY = 'flow_architect_gemini_model_discovery';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos de cache

class GeminiModelDiscoveryService {
  private cachedResult: ModelDiscoveryResult | null = null;
  private inFlightPromise: Promise<ModelDiscoveryResult> | null = null;
  private subscribers: Array<(result: ModelDiscoveryResult) => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ModelDiscoveryResult;
        if (Date.now() - parsed.lastChecked < CACHE_TTL_MS) {
          this.cachedResult = { ...parsed, source: 'cached' };
        }
      }
    } catch {
      // Ignora erro de storage
    }
  }

  private saveToStorage(result: ModelDiscoveryResult) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } catch {
      // Ignora erro de storage
    }
  }

  public subscribe(callback: (result: ModelDiscoveryResult) => void): () => void {
    this.subscribers.push(callback);
    if (this.cachedResult) {
      callback(this.cachedResult);
    }
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notify(result: ModelDiscoveryResult) {
    this.subscribers.forEach(cb => {
      try { cb(result); } catch (e) { console.error(e); }
    });
  }

  /**
   * Retorna o modelo detectado em cache imediato (ou o fallback topo de linha)
   */
  public getDetectedModelSync(): string {
    if (this.cachedResult?.detectedModel) {
      return this.cachedResult.detectedModel;
    }
    return DEFAULT_PRIORITY_MODELS[0];
  }

  /**
   * Avalia a pontuação de prioridade de um nome de modelo
   */
  private scoreModel(name: string): number {
    const clean = name.toLowerCase().replace('models/', '');
    
    // Modelos que não devem ser usados para geração geral de texto/código
    if (
      clean.includes('embedding') ||
      clean.includes('image') ||
      clean.includes('tts') ||
      clean.includes('live') ||
      clean.includes('robotics') ||
      clean.includes('computer-use') ||
      clean.includes('aqa') ||
      clean.includes('transcribe')
    ) {
      return -1;
    }

    // Modelos proibidos / deprecados
    if (
      clean.includes('gemini-1.5') ||
      clean.includes('gemini-2.0') ||
      clean.startsWith('gemini-pro')
    ) {
      return -1;
    }

    // Pontuações por versão
    if (clean === 'gemini-3.8-flash') return 1000;
    if (clean === 'gemini-3.7-flash') return 900;
    if (clean === 'gemini-3.6-flash') return 800;
    if (clean === 'gemini-flash-latest') return 750;
    if (clean === 'gemini-3.5-flash') return 700;
    if (clean === 'gemini-3.1-flash-lite') return 600;
    if (clean === 'gemini-3-flash-preview') return 550;
    if (clean === 'gemini-2.5-flash') return 400;
    if (clean === 'gemini-2.5-flash-lite') return 350;
    if (clean === 'gemini-2.5-pro') return 300;

    // Outros modelos flash
    if (clean.includes('flash')) return 200;
    if (clean.includes('gemini')) return 100;

    return 0;
  }

  /**
   * Consulta a API do Google Gemini para identificar os modelos disponíveis para a chave fornecida
   */
  public async discoverAvailableModels(explicitApiKey?: string): Promise<ModelDiscoveryResult> {
    // Se temos cache válido e recente, retorna
    if (this.cachedResult && (Date.now() - this.cachedResult.lastChecked < CACHE_TTL_MS)) {
      return this.cachedResult;
    }

    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    this.inFlightPromise = this.performDiscovery(explicitApiKey);
    try {
      const res = await this.inFlightPromise;
      this.cachedResult = res;
      this.saveToStorage(res);
      this.notify(res);
      return res;
    } finally {
      this.inFlightPromise = null;
    }
  }

  private async performDiscovery(explicitApiKey?: string): Promise<ModelDiscoveryResult> {
    const key = explicitApiKey || keyManager.getActiveKey() || (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null);

    // 1. Tentar descoberta direta via SDK GoogleGenAI com a chave ativa
    if (key) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const listResponse = await ai.models.list();
        const scoredModels: Array<{ name: string; score: number }> = [];

        for await (const m of listResponse) {
          const rawName = (m.name || '').replace('models/', '');
          const score = this.scoreModel(rawName);
          if (score > 0) {
            scoredModels.push({ name: rawName, score });
          }
        }

        if (scoredModels.length > 0) {
          // Ordena decrescente por score de prioridade
          scoredModels.sort((a, b) => b.score - a.score);
          const availableModels = scoredModels.map(s => s.name);
          const detectedModel = availableModels[0] || DEFAULT_PRIORITY_MODELS[0];

          return {
            detectedModel,
            availableModels,
            isAuto: true,
            source: 'live_discovery',
            lastChecked: Date.now()
          };
        }
      } catch (err) {
        console.warn('[GeminiModelDiscovery] Falha na consulta direta via SDK, tentando proxy backend:', err);
      }
    }

    // 2. Tentar consulta através do endpoint server-side proxy
    try {
      const res = await fetch('/api/gemini/models');
      if (res.ok) {
        const data = await res.json();
        if (data.detectedModel) {
          return {
            detectedModel: data.detectedModel,
            availableModels: data.models || DEFAULT_PRIORITY_MODELS,
            isAuto: true,
            source: 'server_proxy',
            lastChecked: Date.now()
          };
        }
      }
    } catch (err) {
      console.warn('[GeminiModelDiscovery] Server proxy indisponível, usando fallback chain:', err);
    }

    // 3. Fallback estático seguro baseado nas diretrizes oficiais
    return {
      detectedModel: DEFAULT_PRIORITY_MODELS[0], // gemini-3.8-flash
      availableModels: DEFAULT_PRIORITY_MODELS,
      isAuto: true,
      source: 'fallback_chain',
      lastChecked: Date.now()
    };
  }

  /**
   * Resolve o modelo a ser utilizado.
   * Se o modelo for 'auto', vazio, undefined ou o antigo 'gemini-2.5-flash',
   * identifica dinamicamente e retorna a versão mais recente disponível.
   */
  public async resolveModel(preferredModel?: string, explicitApiKey?: string): Promise<string> {
    const isAutoOrLegacy = !preferredModel || 
      preferredModel.toLowerCase() === 'auto' || 
      preferredModel.toLowerCase() === 'gemini-2.5-flash' || 
      preferredModel.trim() === '';

    if (!isAutoOrLegacy) {
      return preferredModel;
    }

    const discovery = await this.discoverAvailableModels(explicitApiKey);
    return discovery.detectedModel;
  }

  /**
   * Retorna a cadeia de modelos para tentativas sequenciais (fallback resiliente)
   */
  public async getModelChain(explicitApiKey?: string): Promise<string[]> {
    const discovery = await this.discoverAvailableModels(explicitApiKey);
    const chain = [...discovery.availableModels];
    
    // Garante que os modelos padrão estejam presentes como garantia
    for (const m of DEFAULT_PRIORITY_MODELS) {
      if (!chain.includes(m)) {
        chain.push(m);
      }
    }
    return chain;
  }

  /**
   * Força uma atualização da detecção de modelos
   */
  public async refresh(explicitApiKey?: string): Promise<ModelDiscoveryResult> {
    this.cachedResult = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY);
    }
    return this.discoverAvailableModels(explicitApiKey);
  }
}

export const geminiModelDiscovery = new GeminiModelDiscoveryService();
