import { ExecutionMetric } from '../types';

const ANALYTICS_STORAGE_KEY = 'flow_architect_analytics_v1';

const INITIAL_METRICS: ExecutionMetric[] = [
  {
    id: 'exec-demo-1',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    flowName: 'Demonstração Cotação USD',
    status: 'SUCCESS',
    durationMs: 1420,
    tokensUsed: 850,
    estimatedCost: 0.00012,
    nodeCount: 4,
    slowestNodeLabel: 'Buscar Cotação USD',
    slowestNodeMs: 820
  },
  {
    id: 'exec-demo-2',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    flowName: 'Build Mode Landing Page AI',
    status: 'SUCCESS',
    durationMs: 3840,
    tokensUsed: 4200,
    estimatedCost: 0.00063,
    nodeCount: 6,
    slowestNodeLabel: 'AI Developer (Code Agent)',
    slowestNodeMs: 2100
  }
];

export const analyticsService = {
  getMetrics: (): ExecutionMetric[] => {
    try {
      const stored = localStorage.getItem(ANALYTICS_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(INITIAL_METRICS));
        return INITIAL_METRICS;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.error("Erro ao carregar métricas de observabilidade:", e);
      return INITIAL_METRICS;
    }
  },

  recordExecution: (metric: Omit<ExecutionMetric, 'id' | 'timestamp'>): ExecutionMetric => {
    const metrics = analyticsService.getMetrics();
    const newMetric: ExecutionMetric = {
      ...metric,
      id: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    
    // Guardar até 100 execuções mais recentes
    const updated = [newMetric, ...metrics].slice(0, 100);
    try {
      localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Erro ao salvar métricas no LocalStorage:", e);
    }
    return newMetric;
  },

  clearMetrics: (): void => {
    try {
      localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify([]));
    } catch (e) {}
  },

  getSummaryStats: () => {
    const metrics = analyticsService.getMetrics();
    const totalExecutions = metrics.length;
    const successCount = metrics.filter(m => m.status === 'SUCCESS').length;
    const errorCount = metrics.filter(m => m.status === 'ERROR').length;
    const successRate = totalExecutions > 0 ? ((successCount / totalExecutions) * 100).toFixed(1) : '100';

    const totalDuration = metrics.reduce((acc, m) => acc + (m.durationMs || 0), 0);
    const avgDurationMs = totalExecutions > 0 ? Math.round(totalDuration / totalExecutions) : 0;

    const totalTokens = metrics.reduce((acc, m) => acc + (m.tokensUsed || 0), 0);
    const totalCost = metrics.reduce((acc, m) => acc + (m.estimatedCost || 0), 0);

    return {
      totalExecutions,
      successCount,
      errorCount,
      successRate,
      avgDurationMs,
      totalTokens,
      totalCost: totalCost.toFixed(5),
      recentMetrics: metrics
    };
  }
};
