
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

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
      return { error };
    }

    console.log("Test alert sent successfully:", data);
    
    // Also try to send via WebSocket directly for immediate feedback
    try {
      const wsUrl = getWebSocketUrl(user.id);
      console.log("Sending test alert via WebSocket to:", wsUrl);
      
      // Create temporary WebSocket connection
      const tempWs = new WebSocket(wsUrl);
      
      tempWs.onopen = () => {
        // Send test donation as a message
        tempWs.send(JSON.stringify({
          type: "donation",
          donation: data
        }));
        
        toast.success("Test alert sent via WebSocket");
        
        // Close after sending
        setTimeout(() => tempWs.close(), 1000);
      };
      
      tempWs.onerror = (err) => {
        console.error("WebSocket error when sending test:", err);
        toast.error("Failed to connect to WebSocket server");
      };
    } catch (wsErr) {
      console.error("Failed to send test via WebSocket:", wsErr);
      toast.error("Failed to initialize WebSocket connection");
    }

    return { data };
  } catch (err) {
    console.error("Exception in sendTestAlert:", err);
    return { error: err };
  }
};

/**
 * Gets the WebSocket URL for the alerts system
 */
export const getWebSocketUrl = (channelId: string): string => {
  return `wss://khfhloynxijcagrqqicq.supabase.co/functions/v1/alerts-ws?channel=${channelId}&mode=consumer`;
};

/**
 * Generates an OBS URL with the user's channel ID
 */
export const getOBSUrl = async () => {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("No authenticated user found");
      return null;
    }
    
    // Create the OBS URL with the user ID as channel
    const baseUrl = typeof window !== 'undefined' ? 
      window.location.origin : 
      'https://your-app-url.com'; // Fallback for SSR contexts
    
    return `${baseUrl}/live-alerts?obs=true&channel=${user.id}`;
  } catch (error) {
    console.error("Error generating OBS URL:", error);
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

    // For WebSocket approach, we don't need tokens anymore
    // Just check if the user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profileError) {
      console.error("Error checking user profile:", profileError);
      return { hasToken: false, error: profileError };
    }
    
    return { 
      hasToken: !!profile,
      userId: user.id 
    };
  } catch (err) {
    console.error("Exception in checkUserProfile:", err);
    return { hasToken: false, error: err };
  }
};

/**
 * Creates a WebSocket connection for alerts
 * Returns a promise that resolves when the connection is established
 */
export const createAlertWebSocket = (channelId: string, mode = "consumer"): Promise<WebSocket> => {
  return new Promise((resolve, reject) => {
    try {
      const wsUrl = getWebSocketUrl(channelId);
      console.log(`Creating WebSocket connection to ${wsUrl} (${mode} mode)`);
      
      const socket = new WebSocket(wsUrl);
      let connectionTimeout = setTimeout(() => {
        console.error("WebSocket connection timeout");
        socket.close();
        reject(new Error("Connection timeout"));
      }, 10000);
      
      socket.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log("WebSocket connected successfully");
        
        // In OBS mode, send a "hello" message to the server
        socket.send(JSON.stringify({ 
          type: "hello", 
          channel: channelId,
          mode: mode
        }));
        
        resolve(socket);
      };
      
      socket.onerror = (err) => {
        clearTimeout(connectionTimeout);
        console.error("WebSocket error:", err);
        reject(err);
      };
      
      socket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log("WebSocket closed:", event.code, event.reason);
        if (!event.wasClean) {
          reject(new Error(`Connection closed unexpectedly: ${event.code}`));
        }
      };
      
    } catch (error) {
      console.error("Error setting up WebSocket:", error);
      reject(error);
    }
  });
};

/**
 * Tests if the WebSocket connection works
 * Returns a promise that resolves to true if a connection can be established
 */
export const testWebSocketConnection = async (channelId: string): Promise<boolean> => {
  try {
    const socket = await createAlertWebSocket(channelId);
    
    // Give the server a moment to process the hello message
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Send a test message
    socket.send(JSON.stringify({
      type: "ping",
      timestamp: new Date().toISOString()
    }));
    
    // Wait for a bit to ensure messages are processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Close the connection
    socket.close();
    return true;
  } catch (error) {
    console.error("WebSocket test failed:", error);
    return false;
  }
};
