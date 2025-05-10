
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { obsWebhookConfig, WEBHOOK_DEBUG } from "@/config/webhookConfig";

/**
 * Sends a test alert to the OBS browser source
 * This creates a temporary donation record in the database
 * that the LiveAlertsPage will pick up and display
 */
export const sendTestAlert = async () => {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("No authenticated user found");
      return { error: "User not authenticated" };
    }

    if (WEBHOOK_DEBUG) {
      obsWebhookConfig.logWebhookEvent('SENDING_TEST_ALERT', { userId: user.id });
    }

    const testDonation = {
      payment_id: `test_${uuidv4().substring(0, 8)}`,
      amount: 100,
      donor_name: "Test Donation",
      message: "This is a test donation alert.",
      user_id: user.id
    };

    // Insert the test donation into the database
    const { data, error } = await supabase
      .from('donations')
      .insert(testDonation)
      .select()
      .single();

    if (error) {
      console.error("Error sending test alert:", error);
      if (WEBHOOK_DEBUG) {
        obsWebhookConfig.logWebhookEvent('TEST_ALERT_ERROR', error);
      }
      return { error };
    }

    console.log("Test alert sent successfully:", data);
    if (WEBHOOK_DEBUG) {
      obsWebhookConfig.logWebhookEvent('TEST_ALERT_SUCCESS', data);
    }
    toast.success("Test alert sent");
    return { data };
  } catch (err) {
    console.error("Exception in sendTestAlert:", err);
    if (WEBHOOK_DEBUG) {
      obsWebhookConfig.logWebhookEvent('TEST_ALERT_EXCEPTION', err);
    }
    return { error: err };
  }
};

/**
 * Gets the OBS URL with the user's channel ID
 */
export const getOBSUrl = async () => {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("No authenticated user found");
      return null;
    }
    
    // Use the configuration to generate the OBS URL
    const url = obsWebhookConfig.getObsUrl(user.id);
    
    if (WEBHOOK_DEBUG) {
      obsWebhookConfig.logWebhookEvent('GET_OBS_URL', { userId: user.id, url });
    }
    
    return url;
  } catch (error) {
    console.error("Error generating OBS URL:", error);
    if (WEBHOOK_DEBUG) {
      obsWebhookConfig.logWebhookEvent('GET_OBS_URL_ERROR', error);
    }
    return null;
  }
};

/**
 * Checks if a user exists in the database
 */
export const checkUserHasToken = async () => {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("No authenticated user found");
      return { hasToken: false, error: "User not authenticated" };
    }

    if (WEBHOOK_DEBUG) {
      obsWebhookConfig.logWebhookEvent('CHECK_USER_TOKEN', { userId: user.id });
    }

    // For Supabase Realtime approach, we don't need tokens anymore
    // Just check if the user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profileError) {
      console.error("Error checking user profile:", profileError);
      if (WEBHOOK_DEBUG) {
        obsWebhookConfig.logWebhookEvent('CHECK_USER_TOKEN_ERROR', profileError);
      }
      return { hasToken: false, error: profileError };
    }
    
    if (WEBHOOK_DEBUG) {
      obsWebhookConfig.logWebhookEvent('CHECK_USER_TOKEN_RESULT', { 
        hasToken: !!profile, 
        userId: user.id 
      });
    }
    
    return { 
      hasToken: !!profile,
      userId: user.id 
    };
  } catch (err) {
    console.error("Exception in checkUserProfile:", err);
    if (WEBHOOK_DEBUG) {
      obsWebhookConfig.logWebhookEvent('CHECK_USER_TOKEN_EXCEPTION', err);
    }
    return { hasToken: false, error: err };
  }
};

/**
 * Tests if the realtime subscription works
 * Returns a promise that resolves to true if a connection can be established
 */
export const testRealtimeConnection = async (channelId: string): Promise<boolean> => {
  try {
    let testSuccessful = false;
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (WEBHOOK_DEBUG) {
      obsWebhookConfig.logWebhookEvent('TESTING_REALTIME', { channelId });
    }
    
    return new Promise((resolve) => {
      // Set up a timeout to resolve the promise after 5 seconds if no success
      timeoutId = setTimeout(() => {
        console.log("Realtime test timed out");
        if (WEBHOOK_DEBUG) {
          obsWebhookConfig.logWebhookEvent('REALTIME_TEST_TIMEOUT');
        }
        if (!testSuccessful) {
          resolve(false);
        }
      }, 5000);

      // Create a temporary channel to test if realtime is working
      const channel = supabase
        .channel(`${obsWebhookConfig.realtimeChannelPrefix}${channelId}`)
        .on('presence', { event: 'sync' }, () => {
          console.log("Realtime presence sync successful");
          if (WEBHOOK_DEBUG) {
            obsWebhookConfig.logWebhookEvent('REALTIME_SYNC_SUCCESS');
          }
          testSuccessful = true;
          if (timeoutId) clearTimeout(timeoutId);
          channel.unsubscribe();
          resolve(true);
        })
        .on('presence', { event: 'join' }, () => {
          console.log("Realtime presence join successful");
          if (WEBHOOK_DEBUG) {
            obsWebhookConfig.logWebhookEvent('REALTIME_JOIN_SUCCESS');
          }
          testSuccessful = true;
          if (timeoutId) clearTimeout(timeoutId);
          channel.unsubscribe();
          resolve(true);
        })
        .subscribe(async (status) => {
          if (WEBHOOK_DEBUG) {
            obsWebhookConfig.logWebhookEvent('REALTIME_SUBSCRIPTION_STATUS', status);
          }
          
          if (status === 'SUBSCRIBED') {
            console.log("Realtime subscription successful");
            await channel.track({ user: channelId, online_at: new Date().toISOString() });
          }
        });
        
      // Also test a Postgres change to be thorough
      supabase
        .channel(`test-postgres-${channelId}`)
        .on('postgres_changes', { 
          event: '*',
          schema: 'public',
          table: 'donations',
          filter: `user_id=eq.${channelId}`
        }, () => {
          console.log("Postgres changes subscription successful");
          if (WEBHOOK_DEBUG) {
            obsWebhookConfig.logWebhookEvent('POSTGRES_CHANGES_SUCCESS');
          }
          testSuccessful = true;
          if (timeoutId) clearTimeout(timeoutId);
          resolve(true);
        })
        .subscribe();
    });
  } catch (error) {
    console.error("Error testing realtime connection:", error);
    if (WEBHOOK_DEBUG) {
      obsWebhookConfig.logWebhookEvent('REALTIME_TEST_ERROR', error);
    }
    return false;
  }
};

/**
 * Monitors webhook connection by checking for activity
 * Returns percentage uptime and connection status
 */
export const monitorWebhookConnection = async (channelId: string): Promise<{
  isConnected: boolean;
  lastPing?: Date;
  uptime?: number;
}> => {
  try {
    if (WEBHOOK_DEBUG) {
      obsWebhookConfig.logWebhookEvent('MONITOR_WEBHOOK', { channelId });
    }
    
    // Test the realtime connection
    const isConnected = await testRealtimeConnection(channelId);
    
    if (WEBHOOK_DEBUG) {
      obsWebhookConfig.logWebhookEvent('MONITOR_RESULT', { 
        isConnected,
        timestamp: new Date().toISOString()
      });
    }
    
    return {
      isConnected,
      lastPing: new Date(),
      // In a real implementation, we would calculate uptime based on historical data
      uptime: 100
    };
  } catch (error) {
    console.error("Error monitoring webhook connection:", error);
    if (WEBHOOK_DEBUG) {
      obsWebhookConfig.logWebhookEvent('MONITOR_ERROR', error);
    }
    return {
      isConnected: false
    };
  }
};
