import { ServerCredentialMasked, CredentialProvider } from '../../types';

interface StoredCredential {
  credentialId: string;
  userId: string;
  provider: CredentialProvider;
  secret: string;
  updatedAt: number;
  metadata?: Record<string, any>;
}

/**
 * ServerCredentialService — Gerenciador Seguro de Credenciais Server-Side
 * Mantém os segredos estritamente no backend.
 * O frontend só recebe status e formato mascarado (ex: ••••••91).
 */
export class ServerCredentialService {
  private static instance: ServerCredentialService;
  private credentials: Map<string, StoredCredential> = new Map();

  private constructor() {}

  public static getInstance(): ServerCredentialService {
    if (!ServerCredentialService.instance) {
      ServerCredentialService.instance = new ServerCredentialService();
    }
    return ServerCredentialService.instance;
  }

  private getStorageKey(userId: string, provider: CredentialProvider): string {
    return `${userId}:${provider}`;
  }

  private maskSecret(secret: string): string {
    if (!secret) return '';
    const clean = secret.trim();
    if (clean.length <= 6) return '••••••';
    const last4 = clean.slice(-4);
    return `••••••••${last4}`;
  }

  /**
   * Salva credencial isolada por usuário no backend
   */
  public setCredential(
    userId: string,
    provider: CredentialProvider,
    secret: string,
    metadata?: Record<string, any>
  ): ServerCredentialMasked {
    const key = this.getStorageKey(userId, provider);
    const credentialId = `cred_${provider}_${Math.random().toString(36).substring(2, 9)}`;

    const stored: StoredCredential = {
      credentialId,
      userId,
      provider,
      secret: secret.trim(),
      updatedAt: Date.now(),
      metadata
    };

    this.credentials.set(key, stored);

    return {
      credentialId,
      provider,
      status: 'connected',
      masked: this.maskSecret(secret),
      updatedAt: stored.updatedAt,
      metadata
    };
  }

  /**
   * Obtém credencial mascarada para o frontend (NUNCA expõe o segredo)
   */
  public getMaskedCredential(userId: string, provider: CredentialProvider): ServerCredentialMasked {
    const key = this.getStorageKey(userId, provider);
    const stored = this.credentials.get(key);

    // Fallback para variáveis de ambiente caso configuradas no servidor
    if (!stored) {
      let envSecret: string | undefined;
      if (provider === 'gemini') envSecret = process.env.GEMINI_API_KEY;
      if (provider === 'github') envSecret = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
      if (provider === 'vercel') envSecret = process.env.VERCEL_API_TOKEN;
      if (provider === 'notion') envSecret = process.env.NOTION_INTERNAL_INTEGRATION_TOKEN;
      if (provider === 'figma') envSecret = process.env.FIGMA_PERSONAL_ACCESS_TOKEN;

      if (envSecret) {
        return {
          credentialId: `env_${provider}`,
          provider,
          status: 'connected',
          masked: this.maskSecret(envSecret),
          updatedAt: Date.now(),
          metadata: { isEnv: true }
        };
      }

      return {
        credentialId: '',
        provider,
        status: 'not_configured',
        masked: '',
        updatedAt: 0
      };
    }

    return {
      credentialId: stored.credentialId,
      provider: stored.provider,
      status: 'connected',
      masked: this.maskSecret(stored.secret),
      updatedAt: stored.updatedAt,
      metadata: stored.metadata
    };
  }

  /**
   * Obtém todas as credenciais do usuário formatadas de forma segura para o frontend
   */
  public getAllMaskedCredentials(userId: string): ServerCredentialMasked[] {
    const providers: CredentialProvider[] = ['gemini', 'github', 'vercel', 'figma', 'notion', 'playwright'];
    return providers.map(p => this.getMaskedCredential(userId, p));
  }

  /**
   * Uso ESTRITAMENTE interno no backend para efetuar chamadas a APIs
   */
  public getInternalSecret(userId: string, provider: CredentialProvider): string | null {
    const key = this.getStorageKey(userId, provider);
    const stored = this.credentials.get(key);
    if (stored && stored.secret) {
      return stored.secret;
    }

    // Fallback seguro de variáveis de ambiente
    if (provider === 'gemini') return process.env.GEMINI_API_KEY || null;
    if (provider === 'github') return process.env.GITHUB_PERSONAL_ACCESS_TOKEN || null;
    if (provider === 'vercel') return process.env.VERCEL_API_TOKEN || null;
    if (provider === 'notion') return process.env.NOTION_INTERNAL_INTEGRATION_TOKEN || null;
    if (provider === 'figma') return process.env.FIGMA_PERSONAL_ACCESS_TOKEN || null;

    return null;
  }

  /**
   * Remove credencial
   */
  public removeCredential(userId: string, provider: CredentialProvider): void {
    const key = this.getStorageKey(userId, provider);
    this.credentials.delete(key);
  }
}

export const serverCredentialService = ServerCredentialService.getInstance();
