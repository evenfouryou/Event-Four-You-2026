// Custom Gmail OAuth for SIAE Response Reading
// Uses googleapis with gmail.readonly scope
// System-wide connection (not per-company)

import { google } from 'googleapis';
import { db } from './db';
import { gmailOAuthTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const SYSTEM_TOKEN_KEY = 'SYSTEM';

function getOAuth2Client() {
  const clientId = process.env.GMAIL_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Gmail OAuth credentials not configured. Set GMAIL_OAUTH_CLIENT_ID and GMAIL_OAUTH_CLIENT_SECRET.');
  }
  
  // Determine redirect URI based on environment
  // Priority: Custom production URL > Replit deployment > Replit dev > localhost
  let baseUrl: string;
  
  if (process.env.PRODUCTION_URL) {
    // Use custom production domain (e.g., https://manage.eventfouryou.com)
    baseUrl = process.env.PRODUCTION_URL;
  } else if (process.env.REPLIT_DEPLOYMENT_URL) {
    baseUrl = process.env.REPLIT_DEPLOYMENT_URL;
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
  } else {
    baseUrl = 'http://localhost:5000';
  }
  
  const redirectUri = `${baseUrl}/api/gmail/callback`;
  console.log(`[GMAIL-OAUTH] Using redirect URI: ${redirectUri}`);
  
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// Generate OAuth authorization URL (no state needed for system-wide)
export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  email?: string;
}> {
  const oauth2Client = getOAuth2Client();
  
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.access_token) {
    throw new Error('Failed to obtain access token');
  }
  
  // Get user email
  oauth2Client.setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const profile = await gmail.users.getProfile({ userId: 'me' });
  
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || undefined,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    scope: tokens.scope || undefined,
    email: profile.data.emailAddress || undefined,
  };
}

// Save system-wide tokens
export async function saveSystemTokens(tokenData: {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  email?: string;
}): Promise<void> {
  // Check if system tokens exist
  const existing = await db.select().from(gmailOAuthTokens)
    .where(eq(gmailOAuthTokens.tokenKey, SYSTEM_TOKEN_KEY))
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing
    await db.update(gmailOAuthTokens)
      .set({
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
        scope: tokenData.scope,
        email: tokenData.email,
        updatedAt: new Date(),
      })
      .where(eq(gmailOAuthTokens.tokenKey, SYSTEM_TOKEN_KEY));
  } else {
    // Insert new
    await db.insert(gmailOAuthTokens).values({
      tokenKey: SYSTEM_TOKEN_KEY,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: tokenData.expiresAt,
      scope: tokenData.scope,
      email: tokenData.email,
    });
  }
}

// Get system-wide tokens
export async function getSystemTokens(): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  email?: string;
} | null> {
  const tokens = await db.select().from(gmailOAuthTokens)
    .where(eq(gmailOAuthTokens.tokenKey, SYSTEM_TOKEN_KEY))
    .limit(1);
  
  if (tokens.length === 0) {
    return null;
  }
  
  const token = tokens[0];
  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken || undefined,
    expiresAt: token.expiresAt || undefined,
    email: token.email || undefined,
  };
}

// Refresh access token if expired
export async function refreshSystemAccessToken(): Promise<string | null> {
  const tokens = await getSystemTokens();
  
  if (!tokens || !tokens.refreshToken) {
    return null;
  }
  
  // Check if token is still valid (with 5 min buffer)
  if (tokens.expiresAt && tokens.expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return tokens.accessToken;
  }
  
  // Refresh the token
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: tokens.refreshToken,
  });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  
  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token');
  }
  
  // Save new tokens
  await saveSystemTokens({
    accessToken: credentials.access_token,
    refreshToken: credentials.refresh_token || tokens.refreshToken,
    expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
    email: tokens.email,
  });
  
  return credentials.access_token;
}

// Get Gmail client with system-wide OAuth tokens
export async function getSystemGmailClient() {
  // Try to get/refresh token
  let accessToken = await refreshSystemAccessToken();
  
  if (!accessToken) {
    const tokens = await getSystemTokens();
    if (!tokens) {
      throw new Error('GMAIL_NOT_AUTHORIZED: Gmail non collegato. Vai in Impostazioni SIAE → Collega Gmail.');
    }
    accessToken = tokens.accessToken;
  }
  
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Check if Gmail is connected system-wide
export async function isGmailConnected(): Promise<{
  connected: boolean;
  email?: string;
  expiresAt?: Date;
}> {
  const tokens = await getSystemTokens();
  
  if (!tokens) {
    return { connected: false };
  }
  
  return {
    connected: true,
    email: tokens.email,
    expiresAt: tokens.expiresAt,
  };
}

// Disconnect Gmail system-wide
export async function disconnectGmail(): Promise<void> {
  await db.delete(gmailOAuthTokens)
    .where(eq(gmailOAuthTokens.tokenKey, SYSTEM_TOKEN_KEY));
}

// Legacy functions for backward compatibility (redirect to system functions)
export async function saveTokens(_companyId: string, tokenData: {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  email?: string;
}): Promise<void> {
  return saveSystemTokens(tokenData);
}

export async function getTokens(_companyId: string) {
  return getSystemTokens();
}

export async function refreshAccessToken(_companyId: string) {
  return refreshSystemAccessToken();
}

export async function getCustomGmailClient(_companyId: string) {
  return getSystemGmailClient();
}

export async function isGmailAuthorized(_companyId: string) {
  const status = await isGmailConnected();
  return {
    authorized: status.connected,
    email: status.email,
    expiresAt: status.expiresAt,
  };
}

export async function revokeGmailAuthorization(_companyId: string) {
  return disconnectGmail();
}
