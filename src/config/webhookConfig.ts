
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

// Debug mode flag - set to true to enable detailed console logging
export const WEBHOOK_DEBUG = true;

// OBS related webhook URLs
export const obsWebhookConfig = {
  // URL for OBS browser source with customizable channel parameter
  getObsUrl: (channelId: string): string => {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/live-alerts?obs=true&channel=${channelId}`;
    
    if (WEBHOOK_DEBUG) {
      console.log(`Generated OBS URL: ${url}`);
    }
    
    return url;
  },
  
  // Prefix for realtime channels (can be customized if needed)
  realtimeChannelPrefix: 'alerts-',
  
  // Prefix for presence channels (can be customized if needed)
  presenceChannelPrefix: 'presence-',
  
  // Log webhook events for debugging
  logWebhookEvent: (eventType: string, data?: any) => {
    if (WEBHOOK_DEBUG) {
      console.log(`[WEBHOOK ${eventType}]`, data ? data : '');
    }
  }
};

// Any additional webhook configurations can be added here
export const additionalWebhooks = {
  // Example: integration with external services
  // externalService: 'https://api.external-service.com/webhook',
};

/**
 * Utility function to test if a webhook connection is receiving data
 * @param channelId The channel ID to test
 * @param timeout Timeout in ms (default 5000ms)
 * @returns Promise that resolves to a boolean indicating if data was received
 */
export const testWebhookConnection = async (
  channelId: string,
  timeout = 5000
): Promise<{success: boolean; message: string}> => {
  try {
    if (WEBHOOK_DEBUG) {
      console.log(`[WEBHOOK TEST] Starting webhook test for channel: ${channelId}`);
    }
    
    // This is a placeholder for actual webhook testing logic
    // In a real implementation, this would send a test request and wait for a response
    
    // For now, we'll just check if we can reach the URL
    const url = obsWebhookConfig.getObsUrl(channelId);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        if (WEBHOOK_DEBUG) {
          console.log(`[WEBHOOK TEST] Successfully connected to ${url}`);
        }
        return { 
          success: true, 
          message: `URL is reachable: ${url}` 
        };
      } else {
        if (WEBHOOK_DEBUG) {
          console.log(`[WEBHOOK TEST] Failed to connect to ${url}, status: ${response.status}`);
        }
        return { 
          success: false, 
          message: `URL returned status ${response.status}` 
        };
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (WEBHOOK_DEBUG) {
        console.error(`[WEBHOOK TEST] Error testing webhook: ${error.message}`);
      }
      return {
        success: false,
        message: `Connection error: ${error.message}`
      };
    }
  } catch (err: any) {
    if (WEBHOOK_DEBUG) {
      console.error(`[WEBHOOK TEST] Exception in testWebhookConnection:`, err);
    }
    return {
      success: false,
      message: `Exception: ${err.message || "Unknown error"}`
    };
  }
};
