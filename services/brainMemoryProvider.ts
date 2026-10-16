import { ProjectMemoryCategories, DesignMemory, ProjectMemoryItem } from '../types';
import { BrainMemory } from './brainService';

/**
 * Interface abstrata para persistência do Cérebro do Projeto
 * Permite alternar entre LocalStorage e Cloud Database sem modificar a lógica dos agentes.
 */
export interface BrainMemoryProvider {
  getMemory(id: string): Promise<ProjectMemoryItem | null>;
  saveMemory(item: Omit<ProjectMemoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectMemoryItem>;
  deleteMemory(id: string): Promise<boolean>;
  searchMemory(query: string, category?: string): Promise<ProjectMemoryItem[]>;
  getProjectContext(projectId?: string): Promise<{
    categories: ProjectMemoryCategories;
    designMemory: DesignMemory | null;
    memories: BrainMemory[];
    projectItems: ProjectMemoryItem[];
    formattedPrompt: string;
  }>;
}

/**
 * Implementação Local do Provedor de Memória
 */
export class LocalBrainMemoryProvider implements BrainMemoryProvider {
  private storageKey = 'flow_architect_project_memory_items';

  private getStoredItems(): ProjectMemoryItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveStoredItems(items: ProjectMemoryItem[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch (e) {
      console.error('[LocalBrainMemoryProvider] Erro ao salvar itens de memória:', e);
    }
  }

  public async getMemory(id: string): Promise<ProjectMemoryItem | null> {
    const items = this.getStoredItems();
    return items.find(item => item.id === id) || null;
  }

  public async saveMemory(item: Omit<ProjectMemoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectMemoryItem> {
    const items = this.getStoredItems();
    const now = Date.now();
    const newItem: ProjectMemoryItem = {
      ...item,
      id: `mem_${Math.random().toString(36).substring(2, 9)}_${now}`,
      createdAt: now,
      updatedAt: now
    };

    items.push(newItem);
    this.saveStoredItems(items);
    return newItem;
  }

  public async deleteMemory(id: string): Promise<boolean> {
    let items = this.getStoredItems();
    const initialLen = items.length;
    items = items.filter(item => item.id !== id);
    this.saveStoredItems(items);
    return items.length < initialLen;
  }

  public async searchMemory(query: string, category?: string): Promise<ProjectMemoryItem[]> {
    const items = this.getStoredItems();
    const q = (query || '').toLowerCase();
    return items.filter(item => {
      const matchCat = category ? item.category === category : true;
      const contentStr = typeof item.content === 'string' ? item.content : JSON.stringify(item.content);
      const matchQ = q ? contentStr.toLowerCase().includes(q) : true;
      return matchCat && matchQ;
    });
  }

  public async getProjectContext(projectId: string = 'default_project'): Promise<{
    categories: ProjectMemoryCategories;
    designMemory: DesignMemory | null;
    memories: BrainMemory[];
    projectItems: ProjectMemoryItem[];
    formattedPrompt: string;
  }> {
    const projectItems = this.getStoredItems().filter(i => i.projectId === projectId || i.projectId === 'default_project');

    let designMemory: DesignMemory | null = null;
    try {
      const raw = localStorage.getItem('project_design_memory');
      if (raw) designMemory = JSON.parse(raw);
    } catch {}

    let categories: ProjectMemoryCategories = {
      designSystem: [],
      architecture: [],
      businessLogic: [],
      motionPrinciples: [],
      componentSpecs: []
    };

    try {
      const rawCat = localStorage.getItem('flow_architect_memory_structured');
      if (rawCat) categories = JSON.parse(rawCat);
    } catch {}

    let memories: BrainMemory[] = [];
    try {
      const rawMem = localStorage.getItem('flow_architect_brain_memories');
      if (rawMem) memories = JSON.parse(rawMem);
    } catch {}

    // Formata o prompt com rastreamento explícito de proveniência (Notion, Figma, Auto-Heal)
    let promptParts: string[] = ['[CONTEXTO HISTÓRICO DO PROJETO & MEMÓRIA SEMÂNTICA]'];

    if (designMemory) {
      promptParts.push(`\n- DESIGN TOKENS (Origem: ${designMemory.source || 'Figma/Brand'}): Cores: ${Object.values(designMemory.colors || {}).join(', ')} | Fontes: ${designMemory.typography?.headingFont || 'Plus Jakarta Sans'}`);
    }

    const notionMemories = projectItems.filter(p => p.source === 'notion');
    if (notionMemories.length > 0) {
      promptParts.push('\n- DIRETRIZES NOTION MCP (Rastreabilidade Ativa):');
      notionMemories.forEach(nm => {
        promptParts.push(`  * [Notion Page ID: ${nm.pageId || 'unknown'} | Lido em: ${nm.retrievedAt || 'Recente'}]: ${typeof nm.content === 'string' ? nm.content : JSON.stringify(nm.content)}`);
      });
    }

    if (categories.designSystem.length > 0) {
      promptParts.push(`\n- REGRAS DE DESIGN: ${categories.designSystem.join('; ')}`);
    }

    if (categories.architecture.length > 0) {
      promptParts.push(`\n- REGRAS DE ENGENHARIA: ${categories.architecture.join('; ')}`);
    }

    return {
      categories,
      designMemory,
      memories,
      projectItems,
      formattedPrompt: promptParts.join('\n')
    };
  }
}

/**
 * Provedor Cloud Preparado para Migração Futura (PostgreSQL / Cloud Firestore)
 */
export class CloudBrainMemoryProvider implements BrainMemoryProvider {
  private apiEndpoint: string;

  constructor(apiEndpoint: string = '/api/brain/memory') {
    this.apiEndpoint = apiEndpoint;
  }

  public async getMemory(id: string): Promise<ProjectMemoryItem | null> {
    try {
      const res = await fetch(`${this.apiEndpoint}/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  public async saveMemory(item: Omit<ProjectMemoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectMemoryItem> {
    const res = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    return await res.json();
  }

  public async deleteMemory(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.apiEndpoint}/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async searchMemory(query: string, category?: string): Promise<ProjectMemoryItem[]> {
    try {
      const params = new URLSearchParams({ q: query, ...(category ? { category } : {}) });
      const res = await fetch(`${this.apiEndpoint}/search?${params.toString()}`);
      return await res.json();
    } catch {
      return [];
    }
  }

  public async getProjectContext(projectId: string = 'default_project'): Promise<{
    categories: ProjectMemoryCategories;
    designMemory: DesignMemory | null;
    memories: BrainMemory[];
    projectItems: ProjectMemoryItem[];
    formattedPrompt: string;
  }> {
    // Fallback gracioso para local caso a nuvem não responda
    const local = new LocalBrainMemoryProvider();
    return local.getProjectContext(projectId);
  }
}

// Exporta a instância ativa padrão (Local com transição transparente)
export const brainMemoryProvider = new LocalBrainMemoryProvider();
