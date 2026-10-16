import { 
  DeploymentResult, 
  DeploymentPlatform, 
  GitHubRepoConfig, 
  DeploymentProjectFile 
} from '../types';
import { keyManager } from './keyManager';

class DeployService {
  private deploymentHistoryKey = 'flow_architect_deploy_history';

  /**
   * Dispara a pipeline de deploy com empacotamento do projeto
   */
  public async deployProject(params: {
    projectName: string;
    files: DeploymentProjectFile[];
    platform?: DeploymentPlatform;
    githubConfig?: Partial<GitHubRepoConfig>;
  }): Promise<DeploymentResult> {
    const customGithubToken = keyManager.getIntegrationKey('github') || undefined;
    const customVercelToken = keyManager.getIntegrationKey('vercel') || undefined;

    const payload = {
      projectName: params.projectName || 'flow-architect-site',
      files: params.files,
      platform: params.platform || 'vercel',
      githubConfig: params.githubConfig,
      customGithubToken,
      customVercelToken
    };

    const response = await fetch('/api/mcp/deploy/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Falha ao executar pipeline de deploy');
    }

    const result: DeploymentResult = await response.json();
    this.saveToHistory(result);
    return result;
  }

  /**
   * Salva o histórico de deploys no LocalStorage para auditoria
   */
  public saveToHistory(deployment: DeploymentResult): void {
    try {
      const history = this.getHistory();
      history.unshift(deployment);
      localStorage.setItem(this.deploymentHistoryKey, JSON.stringify(history.slice(0, 20)));
    } catch (e) {
      console.warn('Erro ao salvar histórico de deploy:', e);
    }
  }

  /**
   * Retorna o histórico de deploys anteriores
   */
  public getHistory(): DeploymentResult[] {
    try {
      const data = localStorage.getItem(this.deploymentHistoryKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Limpa o histórico de deploy
   */
  public clearHistory(): void {
    localStorage.removeItem(this.deploymentHistoryKey);
  }
}

export const deployService = new DeployService();
