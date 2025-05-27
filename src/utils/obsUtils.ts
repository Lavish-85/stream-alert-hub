
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

// Extend the WebSocket interface to include our custom properties
interface ExtendedWebSocket extends WebSocket {
  pingInterval?: number | NodeJS.Timeout;
  reconnectAttempts?: number;
  lastPingTime?: number;
}

/**
 * Sends a test alert to the OBS browser source
 * This creates a temporary donation record that will be deleted after sending
 */
export const sendTestAlert = async () => {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("No authenticated user found");
      return { error: "User not authenticated" };
    }

    // Instead of using an is_test field, we'll rely on the payment_id prefix
    // to identify test donations, since the schema doesn't have an is_test column
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
          donation: data,
          idempotencyKey: uuidv4() // Add idempotency key for duplicate detection
        }));
        
        toast.success("Test alert sent via WebSocket");
        
        // Close after sending
        setTimeout(() => tempWs.close(), 1000);
      };
      
      tempWs.onerror = (err) => {
        console.error("WebSocket error when sending test:", err);
        toast.error("Failed to connect to WebSocket server");
      };

      // Delete the test donation after a longer delay to ensure it doesn't 
      // persist in the database while still allowing enough time for processing
      setTimeout(async () => {
        if (data && data.id) {
          const { error: deleteError } = await supabase
            .from('donations')
            .delete()
            .eq('id', data.id);
          
          if (deleteError) {
            console.error("Error deleting test donation:", deleteError);
          } else {
            console.log("Test donation deleted successfully");
          }
        }
      }, 120000); // Wait 2 minutes before deleting
      
    } catch (wsErr) {
      console.error("Failed to send via WebSocket:", wsErr);
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
 * Creates a WebSocket connection for alerts with improved reliability
 * Returns a promise that resolves when the connection is established
 */
export const createAlertWebSocket = (channelId: string, mode = "consumer"): Promise<ExtendedWebSocket> => {
  return new Promise((resolve, reject) => {
    try {
      const wsUrl = getWebSocketUrl(channelId);
      console.log(`Creating WebSocket connection to ${wsUrl} (${mode} mode)`);
      
      const socket = new WebSocket(wsUrl) as ExtendedWebSocket;
      socket.reconnectAttempts = 0;
      socket.lastPingTime = Date.now();
      
      // Set connection timeout - fail fast if cannot connect
      let connectionTimeout = setTimeout(() => {
        console.error("WebSocket connection timeout");
        socket.close();
        reject(new Error("Connection timeout"));
      }, 10000);
      
      socket.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log("WebSocket connected successfully");
        socket.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        socket.lastPingTime = Date.now();
        
        // In OBS mode, send a "hello" message to the server
        socket.send(JSON.stringify({ 
          type: "hello", 
          channel: channelId,
          mode: mode,
          clientId: uuidv4() // Add client ID for better tracking
        }));
        
        // Start periodic ping to keep connection alive
        // and detect zombie connections early
        const pingIntervalValue = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            // Check if we haven't received a response in too long
            const now = Date.now();
            if (socket.lastPingTime && now - socket.lastPingTime > 90000) {
              console.warn("No ping response in 90 seconds, reconnecting...");
              socket.close(3000, "Ping timeout");
              clearInterval(pingIntervalValue);
              return;
            }
            
            socket.send(JSON.stringify({
              type: "ping",
              timestamp: new Date().toISOString()
            }));
          } else {
            clearInterval(pingIntervalValue);
          }
        }, 30000); // Send ping every 30 seconds
        
        // Add pingInterval to the socket object so it can be cleared on close
        socket.pingInterval = pingIntervalValue;
        
        resolve(socket);
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Update lastPingTime when we get any message from server
          socket.lastPingTime = Date.now();
          
          // Specific handling for pong messages
          if (data.type === "pong") {
            console.log("Received pong from server:", data.timestamp);
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };
      
      socket.onerror = (err) => {
        clearTimeout(connectionTimeout);
        console.error("WebSocket error:", err);
        reject(err);
      };
      
      socket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        // Clear ping interval if it exists
        if (socket.pingInterval) {
          clearInterval(socket.pingInterval);
        }
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
