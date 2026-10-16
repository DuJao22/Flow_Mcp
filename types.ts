
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
export type MCPTransportType = 'streamable-http' | 'sse' | 'stdio' | 'in-memory';
export type MCPServerStatus = 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONNECTED' | 'CONNECTING' | 'ERROR';

export interface MCPToolParameter {
  type: string;
  description?: string;
  enum?: string[];
  default?: any;
}

export interface MCPToolSchema {
  type: 'object';
  properties?: Record<string, MCPToolParameter>;
  required?: string[];
}

export interface MCPTool {
  id: string;
  name: string;
  category: MCPCategory;
  description: string;
  enabled: boolean;
  parametersSchema: Record<string, any> | MCPToolSchema;
  execute: (args: Record<string, any>) => Promise<any>;
  serverId?: string;
  isDynamic?: boolean;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  transport: MCPTransportType;
  authType: 'oauth2' | 'bearer' | 'none';
  status: MCPServerStatus;
  description: string;
  toolsCount: number;
  capabilities?: string[];
  lastConnectedAt?: number;
  error?: string;
  requiresAuth?: boolean;
}

export interface MCPServer {
  id: string;
  name: string;
  status: MCPServerStatus;
  description: string;
  endpoint?: string;
  transport?: MCPTransportType;
  toolsCount: number;
  authType?: 'oauth2' | 'bearer' | 'none';
  capabilities?: string[];
  lastConnectedAt?: number;
  error?: string;
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
  serverId?: string;
}

export interface MCPDiscoveryResponse {
  server: MCPServerConfig;
  tools: {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
  }[];
}

export interface NotionPageSummary {
  id: string;
  title: string;
  icon?: string;
  url?: string;
  lastEditedTime: string;
  isDatabase?: boolean;
  excerpt?: string;
}

// --- NOTION CONTEXT & STRUCTURED PROJECT MEMORY (FASE 2) ---
export interface StructuredProjectContext {
  project: string | null;
  brand: string | null;
  business: string | null;
  audience: string[];
  offer: string | null;
  value_proposition: string | null;
  tone: string[];
  colors: string[];
  typography: string[];
  visual_style: string[];
  references: string[];
  sections: string[];
  cta: string | null;
  copy: {
    headline?: string | null;
    subheadline?: string | null;
    benefits?: string[];
    guarantee?: string | null;
    faq?: { question: string; answer: string }[];
    [key: string]: any;
  };
  requirements: string[];
  restrictions: string[];
  
  // Provenance metadata (rastreabilidade rigorosa)
  source: 'Notion' | 'Manual' | 'Figma' | 'FileSystem';
  page_id?: string;
  page_title?: string;
  retrieved_at: number;
}

export interface DesignMemory {
  brand: string;
  visualStyle: string[];
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
    raw?: string[];
  };
  typography: {
    headingFont?: string;
    bodyFont?: string;
    raw?: string[];
  };
  motion: {
    style?: string[];
    entrance?: string;
    transitions?: string;
  };
  source: string;
  page_id?: string;
  updatedAt: number;
}

// --- INTEGRAÇÕES E VARIÁVEIS DE USUÁRIO (ENGRENAGENZINHA ⚙️) ---
export type IntegrationCategory = 'ai' | 'notion' | 'figma' | 'browser' | 'webhook' | 'custom_mcp';

export interface IntegrationVariableConfig {
  id: string;
  key: string;
  label: string;
  category: IntegrationCategory;
  description: string;
  isSecret: boolean;
  value: string;
  placeholder?: string;
  docsUrl?: string;
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'TESTING' | 'INVALID';
  lastTestedAt?: number;
  testErrorMessage?: string;
}

// --- FIGMA DEV MODE & TOKEN SYNC (FASE 3) ---
export interface FigmaFileSummary {
  key: string;
  name: string;
  lastModified: string;
  thumbnailUrl?: string;
  version: string;
  role?: string;
  pages: FigmaPageSummary[];
}

export interface FigmaPageSummary {
  id: string;
  name: string;
  frames: FigmaFrameSummary[];
}

export interface FigmaFrameSummary {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  backgroundColor?: string;
  thumbnailUrl?: string;
  childCount: number;
}

export interface FigmaColorToken {
  id?: string;
  name: string;
  hex: string;
  rgba: string;
  usageCount: number;
  semanticRole?: 'primary' | 'secondary' | 'accent' | 'background' | 'surface' | 'text' | 'border';
}

export interface FigmaTypographyToken {
  id?: string;
  name: string;
  fontFamily: string;
  fontWeight: number | string;
  fontSize: number;
  lineHeight: number | string;
  letterSpacing?: number | string;
  textTransform?: string;
  usage: 'heading1' | 'heading2' | 'heading3' | 'body' | 'caption' | 'button';
}

export interface FigmaSpacingToken {
  name: string;
  valuePx: number;
  tailwindClass: string;
}

export interface FigmaBorderToken {
  name: string;
  radiusPx: number;
  tailwindRadius: string;
}

export interface FigmaShadowToken {
  name: string;
  cssBoxShadow: string;
}

export interface FigmaDesignTokens {
  colors: FigmaColorToken[];
  typography: FigmaTypographyToken[];
  spacings: FigmaSpacingToken[];
  borders: FigmaBorderToken[];
  shadows: FigmaShadowToken[];
  tailwindThemeExtension: Record<string, any>;
  rawStylesCount: number;
  componentsDetected: number;
  source: {
    fileKey: string;
    fileName: string;
    nodeId?: string;
    nodeName?: string;
    extractedAt: number;
  };
}

export interface FigmaDevModeInspection {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  dimensions: { width: number; height: number };
  cssRules: Record<string, string>;
  tailwindSnippet: string;
  htmlSnippet: string;
  colorsUsed: string[];
  fontsUsed: string[];
  thumbnailUrl?: string;
}

export interface FigmaSyncReport {
  fileKey: string;
  fileName: string;
  tokensCount: {
    colors: number;
    typography: number;
    spacings: number;
    radii: number;
  };
  brainUpdated: boolean;
  designLabApplied: boolean;
  syncedAt: number;
}

// --- PLAYWRIGHT BROWSER AUTOMATION & VISUAL QA (FASE 4) ---
export type VisualViewportType = 'desktop' | 'tablet' | 'mobile';

export interface VisualQAVIEWPORT {
  type: VisualViewportType;
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
}

export interface VisualScreenshotResult {
  viewport: VisualViewportType;
  width: number;
  height: number;
  screenshotBase64?: string;
  timestamp: number;
  domMetrics?: {
    domElementsCount: number;
    bodyHeight: number;
    overflowIssuesDetected: boolean;
    imagesCount: number;
  };
}

export interface VisualQAIssue {
  id: string;
  category: 'contrast' | 'overflow' | 'responsiveness' | 'alignment' | 'typography' | 'hierarchy' | 'accessibility';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  affectedElementSelector?: string;
  suggestedPatch: string;
  applied: boolean;
}

export interface VisualQACriticReport {
  score: number; // 0 a 100
  rating: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL_ISSUES';
  summary: string;
  issues: VisualQAIssue[];
  breakdown: {
    visualAesthetics: number;
    responsiveMobileLayout: number;
    colorContrastAccessibility: number;
    typographyConsistency: number;
  };
  suggestedTailwindFixes: string[];
  screenshots: Record<VisualViewportType, string | undefined>;
  evaluatedAt: number;
}

export interface VisualQAPatchRequest {
  code: string;
  criticReport: VisualQACriticReport;
  selectedIssueIds?: string[];
}

// --- GITHUB & VERCEL ONE-CLICK PIPELINE & MCP DEPLOY (FASE 5) ---
export type DeploymentPlatform = 'vercel' | 'github_pages' | 'netlify';

export interface GitHubRepoConfig {
  owner: string;
  repo: string;
  branch: string;
  isPrivate: boolean;
  commitMessage: string;
}

export interface DeploymentProjectFile {
  path: string;
  content: string;
}

export interface DeploymentLog {
  timestamp: number;
  stage: 'auth' | 'repo_sync' | 'build_pack' | 'deploy' | 'domain_bind' | 'success' | 'error';
  message: string;
  details?: string;
}

export interface DeploymentResult {
  id: string;
  platform: DeploymentPlatform;
  url: string;
  customDomain?: string;
  githubRepoUrl?: string;
  commitSha?: string;
  status: 'QUEUED' | 'BUILDING' | 'DEPLOYED' | 'FAILED';
  logs: DeploymentLog[];
  deployedAt: number;
  author: string;
}

export interface ProductionBundlePayload {
  projectName: string;
  files: DeploymentProjectFile[];
  repoConfig?: GitHubRepoConfig;
  platform: DeploymentPlatform;
  vercelToken?: string;
  githubToken?: string;
}

// --- FASE 1: MCP SESSION & ISOLATION TYPES ---
export type McpPermissionScope =
  | 'notion.read'
  | 'notion.search'
  | 'notion.write'
  | 'figma.read'
  | 'github.read'
  | 'github.write'
  | 'vercel.deploy';

export interface McpUserSession {
  sessionId: string;
  userId: string;
  serverId: string;
  serverUrl: string;
  transport: 'streamable-http' | 'stdio' | 'sse';
  authenticationState: 'UNAUTHENTICATED' | 'AUTHENTICATED' | 'DEMO_SANDBOX' | 'EXPIRED';
  accessToken?: string;
  refreshToken?: string;
  permissions: McpPermissionScope[];
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  status: 'ACTIVE' | 'REVOKED' | 'IDLE';
}

// --- FASE 2 & 3: SERVER CREDENTIALS TYPES ---
export type CredentialProvider = 'gemini' | 'github' | 'vercel' | 'figma' | 'notion' | 'playwright';

export interface ServerCredentialMasked {
  credentialId: string;
  provider: CredentialProvider;
  status: 'connected' | 'not_configured' | 'expired';
  masked: string;
  updatedAt: number;
  metadata?: Record<string, any>;
}

// --- FASE 5, 6 & 10: AUTO-HEAL & 8-DIMENSION SCORING TYPES ---
export interface AutoHealScore8D {
  visual: number;        // 0-100
  ux: number;            // 0-100
  responsive: number;    // 0-100
  accessibility: number; // 0-100
  performance: number;   // 0-100
  motion: number;        // 0-100
  conversion: number;    // 0-100
  codeQuality: number;   // 0-100
  overall: number;       // 0-100
}

export interface MotionAnalysisResult {
  score: number;
  hasAnimations: boolean;
  excessiveMotion: boolean;
  inadequateDuration: boolean;
  elementsEnteringOffscreen: boolean;
  layoutShiftRisk: boolean;
  heavyEffectsDetected: boolean;
  mobileMotionIssues: boolean;
  parallaxIssues: boolean;
  missingInteractiveFeedback: boolean;
  issues: string[];
  recommendations: string[];
}

export interface AutoHealPatchFileChange {
  path: string;
  description: string;
  changes: Array<{
    type: 'replace' | 'insert' | 'delete';
    search?: string;
    content: string;
  }>;
}

export interface AutoHealPatch {
  reason: string;
  files: AutoHealPatchFileChange[];
  expectedImprovements: string[];
  fullUpdatedHtml?: string;
  rawPatchJson?: string;
}

export interface AutoHealSnapshot {
  versionId: string; // ex: version_001
  timestamp: number;
  htmlCode: string;
  score: AutoHealScore8D;
  reason?: string;
}

export type AutoHealLogType =
  | 'AUTO_HEAL_STARTED'
  | 'QA_STARTED'
  | 'QA_COMPLETED'
  | 'CRITIC_STARTED'
  | 'PATCH_GENERATED'
  | 'PATCH_VALIDATED'
  | 'PATCH_APPLIED'
  | 'RENDER_STARTED'
  | 'RENDER_COMPLETED'
  | 'QA_RETEST'
  | 'SCORE_IMPROVED'
  | 'ROLLBACK'
  | 'AUTO_HEAL_COMPLETED'
  | 'AUTO_HEAL_REJECTED';

export interface AutoHealLogEntry {
  timestamp: number;
  type: AutoHealLogType;
  iteration: number;
  message: string;
  details?: Record<string, any>;
}

export interface AutoHealIterationState {
  iteration: number;
  maxIterations: number;
  status: 'IDLE' | 'ANALYZING' | 'GENERATING_PATCH' | 'VALIDATING' | 'APPLYING' | 'RENDERING' | 'RETESTING' | 'COMPLETED' | 'WAITING_APPROVAL' | 'ROLLBACK';
  currentScore: AutoHealScore8D;
  previousScore?: AutoHealScore8D;
  pendingPatch?: AutoHealPatch;
  logs: AutoHealLogEntry[];
  snapshots: AutoHealSnapshot[];
  autoApply: boolean;
  browserMode: 'REAL_BROWSER' | 'STATIC_ANALYSIS';
}

// --- FASE 8: PROJECT MEMORY STRUCTURE TYPES ---
export interface ProjectMemoryItem {
  id: string;
  projectId: string;
  category: 'BusinessMemory' | 'DesignMemory' | 'BrandMemory' | 'CopyMemory' | 'EngineeringMemory' | 'MotionMemory' | 'QAHistory' | 'Versions';
  content: any;
  source: 'notion' | 'figma' | 'user' | 'auto_heal' | 'gemini_agent';
  pageId?: string;
  retrievedAt?: string;
  createdAt: number;
  updatedAt: number;
}
