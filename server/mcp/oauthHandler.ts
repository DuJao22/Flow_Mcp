import { Request, Response } from 'express';

interface OAuthConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export class NotionOAuthHandler {
  private config: OAuthConfig;

  constructor() {
    this.config = {
      clientId: process.env.NOTION_CLIENT_ID,
      clientSecret: process.env.NOTION_CLIENT_SECRET,
      redirectUri: process.env.NOTION_REDIRECT_URI || 'http://localhost:3000/api/mcp/notion/oauth/callback'
    };
  }

  public getAuthorizationUrl(state: string = 'flow_architect_auth'): string {
    const clientId = process.env.NOTION_CLIENT_ID || this.config.clientId;
    const redirectUri = process.env.NOTION_REDIRECT_URI || this.config.redirectUri;

    if (!clientId) {
      // Se não houver Client ID configurado nas vars, instrui o uso do Notion Internal Integration Token
      return `https://www.notion.so/my-integrations`;
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      owner: 'user',
      redirect_uri: redirectUri!,
      state
    });

    return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  }

  public async exchangeCodeForToken(code: string): Promise<{ accessToken: string; workspaceName?: string; workspaceIcon?: string; botId?: string }> {
    const clientId = process.env.NOTION_CLIENT_ID || this.config.clientId;
    const clientSecret = process.env.NOTION_CLIENT_SECRET || this.config.clientSecret;
    const redirectUri = process.env.NOTION_REDIRECT_URI || this.config.redirectUri;

    if (!clientId || !clientSecret) {
      throw new Error('NOTION_CLIENT_ID ou NOTION_CLIENT_SECRET não configurados no servidor.');
    }

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authHeader}`
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Falha na troca de código OAuth do Notion (${res.status}): ${errText}`);
    }

    const data: any = await res.json();
    return {
      accessToken: data.access_token,
      workspaceName: data.workspace_name,
      workspaceIcon: data.workspace_icon,
      botId: data.bot_id
    };
  }
}

export const notionOAuthHandler = new NotionOAuthHandler();
