
/**
 * Webhook Configuration
 * 
 * This file centralizes all webhook URLs and related settings.
 * When moving to a different hosting provider or domain, simply update the values here.
 */

// Base URL for the application (automatically detects current environment)
export const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://your-default-production-url.com'; // Update this when deploying to production
};

// OBS related webhook URLs
export const obsWebhookConfig = {
  // URL for OBS browser source with customizable channel parameter
  getObsUrl: (channelId: string): string => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/live-alerts?obs=true&channel=${channelId}`;
  },
  
  // Prefix for realtime channels (can be customized if needed)
  realtimeChannelPrefix: 'alerts-',
  
  // Prefix for presence channels (can be customized if needed)
  presenceChannelPrefix: 'presence-',
};

// Any additional webhook configurations can be added here
export const additionalWebhooks = {
  // Example: integration with external services
  // externalService: 'https://api.external-service.com/webhook',
};

