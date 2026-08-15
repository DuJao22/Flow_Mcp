
import type { Node, Edge } from 'reactflow';
import type { BrainMemory } from './services/brainService';

export type { BrainMemory };

export enum NodeType {
  HTTP_REQUEST = 'httpRequest',
  WEBHOOK = 'webhook',
  DELAY = 'delay',
  IF_CONDITION = 'ifCondition',
  LOGGER = 'logger',
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
  FILE_SAVE = 'fileSave',
  AI_BRAIN = 'aiBrain',
  AI_PROMPT = 'aiPrompt',       // Execução simples de prompt
  AI_AGENT = 'aiAgent',         // Agente de raciocínio com ferramentas
  MULTI_AGENT = 'multiAgent',   // Multi-agentes colaborativos
  AI_EVALUATOR = 'aiEvaluator', // Avaliador e validador de resultados
  AI_LOOP = 'aiLoop',           // Loop autônomo com critério de parada
  SUBFLOW = 'subflow',         // Subfluxo encapsulado
  SWITCH_ROUTER = 'switchRouter', // Roteamento condicional multi-ramal
  ANALYZE_PAGE = 'analyzePage',   // Análise de página web
  IMPROVE_PAGE = 'improvePage',   // Melhora autônoma de página
  GENERATE_MOTION = 'generateMotion', // Geração de animações
  TEST_RESPONSIVE = 'testResponsive', // Teste responsivo
  AI_CRITIC = 'aiCritic',         // Nó do AI Critic
  BROWSER_PREVIEW = 'browserPreview', // Renderização no Browser
  START = 'start'
}

export enum NodeStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  RETRY = 'RETRY'
}

export interface NodeExecutionStats {
  tokens?: number;
  latencyMs?: number;
  costEstimate?: number;
  model?: string;
  timestamp?: string;
}

export interface SwitchRoute {
  id: string;
  label: string;
  condition: string;
}

export interface NodeData {
  label: string;
  type: NodeType;
  status: NodeStatus;
  config: Record<string, any>;
  logs?: string[];
  lastInput?: any;
  lastOutput?: any;
  executionStats?: NodeExecutionStats;
  subflowData?: {
    nodes: FlowNode[];
    edges: FlowEdge[];
  };
  routes?: SwitchRoute[];
  error?: string;
  [key: string]: any;
}

export type FlowNode = Node<NodeData>;
export type FlowEdge = Edge;

export interface FlowSchema {
  meta: {
    engine: string;
    created_by: string;
  };
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  nodeId: string;
  nodeLabel: string;
  level: 'INFO' | 'ERROR' | 'SUCCESS' | 'WARN';
  message: string;
}

export interface GeneratedFile {
  id: string;
  name: string;
  content: string;
  extension: string; // 'txt', 'json', 'csv', 'html'
  timestamp: number;
  nodeId: string;
}

export interface AIMessage {
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
  flowData?: FlowSchema; // Payload se a IA gerar/modificar fluxo
  actionCommand?: {
    type: 'ADD_NODE' | 'REMOVE_NODE' | 'CONNECT' | 'OPTIMIZE' | 'RUN_TEST' | 'CLEAR';
    payload?: any;
  };
}

export interface ExecutionContext {
  input?: any;
  [nodeId: string]: any;
}

export interface SavedProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  nodes: FlowNode[];
  edges: FlowEdge[];
  files: GeneratedFile[];
}

export interface FlowContext {
  logs: LogEntry[];
  currentNodes: FlowNode[];
  currentEdges: FlowEdge[];
}

export interface ProjectMemoryCategories {
  design: {
    colors: string;
    typography: string;
    components: string;
    layout: string;
  };
  engineering: {
    stack: string;
    architecture: string;
    conventions: string;
    apis: string;
  };
  business: {
    rules: string;
    targetAudience: string;
    goals: string;
    flows: string;
  };
  content: {
    tone: string;
    copyRules: string;
    ctas: string;
  };
}

export interface ExecutionMetric {
  id: string;
  timestamp: string;
  flowName: string;
  status: 'SUCCESS' | 'ERROR';
  durationMs: number;
  tokensUsed: number;
  estimatedCost: number;
  nodeCount: number;
  failedNodeId?: string;
  slowestNodeLabel?: string;
  slowestNodeMs?: number;
}

// --- DESIGN LAB & AI CRITIC TYPES ---
export interface DesignProblem {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'Visual' | 'UX' | 'Motion' | 'Mobile' | 'Performance' | 'Conversion';
  description: string;
  suggested_fix: string;
  affected_element?: string;
}

export interface DesignCriticScore {
  visual: number;
  ux: number;
  motion: number;
  mobile: number;
  performance: number;
  conversion: number;
  total: number;
  timestamp: number;
  problems: DesignProblem[];
}

export interface PageVersion {
  id: string;
  versionNumber: number;
  label: string;
  htmlContent: string;
  timestamp: number;
  score?: DesignCriticScore;
  author: string;
  notes?: string;
}

export interface ActiveMcpConsultation {
  mcpId: string;
  mcpName: string;
  icon: string;
  status: 'IDLE' | 'CONSULTING' | 'EXECUTING' | 'COMPLETED' | 'ERROR';
  currentAction: string;
  timestamp: number;
  durationMs?: number;
  details?: string;
}

// --- MCP (MODEL CONTEXT PROTOCOL) TYPES ---
export type MCPCategory = 'Browser Tools' | 'File Tools' | 'Design Tools' | 'External Connectors';

export interface MCPTool {
  id: string;
  name: string;
  category: MCPCategory;
  description: string;
  enabled: boolean;
  parametersSchema: Record<string, any>;
  execute: (args: Record<string, any>) => Promise<any>;
}

export interface MCPServer {
  id: string;
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  description: string;
  endpoint?: string;
  toolsCount: number;
}

export interface MCPPermission {
  agentRole: string;
  allowedToolIds: string[];
}

export interface MCPSessionLog {
  id: string;
  timestamp: number;
  toolId: string;
  toolName: string;
  agentRole: string;
  status: 'SUCCESS' | 'ERROR' | 'DENIED';
  inputArgs: any;
  outputResult: any;
  durationMs: number;
}


