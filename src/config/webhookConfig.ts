
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
  
  // Log webhook event for debugging
  logWebhookEvent: (eventType: string, data?: any) => {
    if (WEBHOOK_DEBUG) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[WEBHOOK ${eventType}] [${timestamp}]`, data ? data : '');
    }
  },
  
  // Format webhook debug data for display
  formatDebugData: (data: any): string => {
    try {
      // Hide sensitive information
      const safeData = { ...data };
      
      // If the data is a complex object, stringify it nicely
      return typeof safeData === 'object' 
        ? JSON.stringify(safeData, null, 2) 
        : String(safeData);
    } catch (error) {
      console.error("Error formatting debug data:", error);
      return "Error formatting data";
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
): Promise<{success: boolean; message: string; details?: any}> => {
  try {
    if (WEBHOOK_DEBUG) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[WEBHOOK TEST] [${timestamp}] Starting webhook test for channel: ${channelId}`);
    }
    
    // Test URL reachability
    const url = obsWebhookConfig.getObsUrl(channelId);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      // Log test start details
      obsWebhookConfig.logWebhookEvent('TEST_STARTED', {
        channelId,
        url,
        timestamp: new Date().toISOString()
      });
      
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        if (WEBHOOK_DEBUG) {
          const timestamp = new Date().toLocaleTimeString();
          console.log(`[WEBHOOK TEST] [${timestamp}] Successfully connected to ${url}`);
        }
        
        // Log success details
        obsWebhookConfig.logWebhookEvent('TEST_SUCCESS', { 
          url,
          status: response.status,
          statusText: response.statusText,
          timestamp: new Date().toISOString()
        });
        
        return { 
          success: true, 
          message: `URL is reachable: ${url}`,
          details: {
            url,
            status: response.status,
            statusText: response.statusText
          }
        };
      } else {
        if (WEBHOOK_DEBUG) {
          const timestamp = new Date().toLocaleTimeString();
          console.log(`[WEBHOOK TEST] [${timestamp}] Failed to connect to ${url}, status: ${response.status}`);
        }
        
        // Log failure details
        obsWebhookConfig.logWebhookEvent('TEST_FAILURE', { 
          url,
          status: response.status,
          statusText: response.statusText,
          timestamp: new Date().toISOString()
        });
        
        return { 
          success: false, 
          message: `URL returned status ${response.status}`,
          details: {
            url,
            status: response.status,
            statusText: response.statusText
          } 
        };
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (WEBHOOK_DEBUG) {
        const timestamp = new Date().toLocaleTimeString();
        console.error(`[WEBHOOK TEST] [${timestamp}] Error testing webhook: ${error.message}`);
      }
      
      // Log error details
      obsWebhookConfig.logWebhookEvent('TEST_ERROR', {
        error: error.message,
        url,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        message: `Connection error: ${error.message}`,
        details: {
          errorType: error.name || 'FetchError',
          errorMessage: error.message,
          url
        }
      };
    }
  } catch (err: any) {
    if (WEBHOOK_DEBUG) {
      const timestamp = new Date().toLocaleTimeString();
      console.error(`[WEBHOOK TEST] [${timestamp}] Exception in testWebhookConnection:`, err);
    }
    
    // Log exception details
    obsWebhookConfig.logWebhookEvent('TEST_EXCEPTION', {
      error: err.message || "Unknown error",
      timestamp: new Date().toISOString()
    });
    
    return {
      success: false,
      message: `Exception: ${err.message || "Unknown error"}`,
      details: {
        errorType: err.name || 'Exception',
        errorMessage: err.message || "Unknown error"
      }
    };
  }
};

/**
 * Enhanced test function that checks webhook connectivity and returns detailed results
 * @param channelId The user's channel ID
 * @returns Detailed test results
 */
export const runWebhookDiagnostics = async (channelId: string): Promise<{
  overallStatus: string;
  urlTest: {
    success: boolean;
    message: string;
    details?: any;
  };
  timestamp: string;
  environment: {
    userAgent: string;
    url: string;
    protocol: string;
  };
}> => {
  try {
    // Log diagnostic start
    obsWebhookConfig.logWebhookEvent('DIAGNOSTICS_STARTED', { channelId });
    
    // Step 1: Test URL connectivity
    const urlTestResult = await testWebhookConnection(channelId);
    
    // Environment information
    const environment = {
      userAgent: window.navigator.userAgent,
      url: window.location.origin,
      protocol: window.location.protocol,
    };
    
    // Determine overall status
    const overallStatus = urlTestResult.success ? 'HEALTHY' : 'CONNECTION_ISSUES';
    
    // Log diagnostic results
    obsWebhookConfig.logWebhookEvent('DIAGNOSTICS_COMPLETED', {
      overallStatus,
      urlTestSuccess: urlTestResult.success,
      timestamp: new Date().toISOString()
    });
    
    return {
      overallStatus,
      urlTest: urlTestResult,
      timestamp: new Date().toISOString(),
      environment
    };
  } catch (err: any) {
    // Log diagnostic error
    obsWebhookConfig.logWebhookEvent('DIAGNOSTICS_ERROR', {
      error: err.message || "Unknown error",
      timestamp: new Date().toISOString()
    });
    
    return {
      overallStatus: 'ERROR',
      urlTest: {
        success: false,
        message: `Diagnostic error: ${err.message || "Unknown error"}`
      },
      timestamp: new Date().toISOString(),
      environment: {
        userAgent: window.navigator.userAgent,
        url: window.location.origin,
        protocol: window.location.protocol,
      }
    };
  }
};
