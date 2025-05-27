// WebSocket server for donation alerts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("Alert WebSocket server starting up");

// Track all active connections by channel
const connections = new Map<string, Set<WebSocket>>();

// Track donations to prevent duplicate donations with LRU cache-like behavior
// Format: channelId -> Set of donation payment_ids
const recentDonations = new Map<string, Set<string>>();

// Track idempotency keys to prevent duplicate processing during the same session
// This helps with network retries and reconnections
const idempotencyKeys = new Map<string, Set<string>>();

// Helper to clean up old donation records to prevent memory leaks
function cleanupOldDonations() {
  try {
    // Cleanup donation tracking
    for (const [channelId, donations] of recentDonations.entries()) {
      if (donations.size > 100) { // Set a maximum size for tracking
        console.log(`Cleaning up donation cache for channel ${channelId}, current size: ${donations.size}`);
        // Convert to array, keep only the latest 50
        const donationsArray = Array.from(donations);
        recentDonations.set(channelId, new Set(donationsArray.slice(0, 50)));
      }
    }
    
    // Cleanup idempotency keys - these can be cleared more aggressively
    for (const [channelId, keys] of idempotencyKeys.entries()) {
      if (keys.size > 200) {
        console.log(`Cleaning up idempotency keys for channel ${channelId}, current size: ${keys.size}`);
        // Keep only the latest 100
        const keysArray = Array.from(keys);
        idempotencyKeys.set(channelId, new Set(keysArray.slice(0, 100)));
      }
    }
    
    // Cleanup empty channels
    for (const channelId of connections.keys()) {
      const channelSockets = connections.get(channelId)!;
      if (channelSockets.size === 0) {
        console.log(`Removing empty channel: ${channelId}`);
        connections.delete(channelId);
        recentDonations.delete(channelId);
        idempotencyKeys.delete(channelId);
      }
    }
  } catch (err) {
    console.error("Error during cleanup routine:", err);
  }
  
  // Schedule next cleanup
  setTimeout(cleanupOldDonations, 60000); // Run every minute
}

// Start donation cleanup
cleanupOldDonations();

// Helper to broadcast alerts to a specific channel with improved duplicate detection
function broadcastToChannel(channelId: string, data: any) {
  try {
    const channelConnections = connections.get(channelId);
    if (!channelConnections || channelConnections.size === 0) {
      console.log(`No active connections found for channel ${channelId}`);
      return 0;
    }
    
    // Don't broadcast duplicates - check both payment_id and idempotency key
    if (data.type === "donation" && data.donation) {
      // Initialize sets for this channel if needed
      if (!recentDonations.has(channelId)) {
        recentDonations.set(channelId, new Set());
      }
      
      if (!idempotencyKeys.has(channelId)) {
        idempotencyKeys.set(channelId, new Set());
      }
      
      const channelDonations = recentDonations.get(channelId)!;
      const channelKeys = idempotencyKeys.get(channelId)!;
      
      // Check payment ID for duplicate donation
      const donationId = data.donation.payment_id;
      if (donationId && channelDonations.has(donationId)) {
        console.log(`Skipping duplicate donation with payment_id: ${donationId}`);
        return 0;
      }
      
      // Check idempotency key if provided
      const idempotencyKey = data.idempotencyKey;
      if (idempotencyKey && channelKeys.has(idempotencyKey)) {
        console.log(`Skipping duplicate donation with idempotency key: ${idempotencyKey}`);
        return 0;
      }
      
      // Add tracking information
      if (donationId) {
        channelDonations.add(donationId);
      }
      
      if (idempotencyKey) {
        channelKeys.add(idempotencyKey);
      }
      
      console.log(`Broadcasting donation ${donationId || "(no ID)"} to channel ${channelId}`);
    }
    
    const message = JSON.stringify(data);
    console.log(`Broadcasting to ${channelConnections.size} clients in channel ${channelId}`);
    
    let successCount = 0;
    let failCount = 0;
    
    // Create a copy of the connections to avoid issues if they change during iteration
    const connectionsCopy = Array.from(channelConnections);
    
    connectionsCopy.forEach(socket => {
      try {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(message);
          successCount++;
        } else {
          console.log(`Skipping socket with readyState: ${socket.readyState}`);
          failCount++;
          // Remove dead connections
          if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
            channelConnections.delete(socket);
          }
        }
      } catch (err) {
        console.error("Error sending to socket:", err);
        failCount++;
        // Remove problematic connections
        channelConnections.delete(socket);
      }
    });
    
    console.log(`Broadcast complete: ${successCount} successful, ${failCount} failed`);
    return successCount;
  } catch (error) {
    console.error("Error in broadcastToChannel:", error);
    return 0;
  }
}

// Helper to validate a user ID is legitimate
async function validateUserId(userId: string): Promise<boolean> {
  if (!userId || userId.length < 10) {
    console.log(`Invalid userId format: ${userId}`);
    return false;
  }
  
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false } }
    );

    // Check if user exists
    console.log(`Validating userId: ${userId}`);
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error("User validation failed:", error);
      return false;
    }
    
    console.log(`User validation successful for: ${userId}`);
    return true;
  } catch (error) {
    console.error("Error validating user:", error);
    return false;
  }
}

// Configure keepalive for all websockets
const KEEPALIVE_INTERVAL = 30000; // 30 seconds
let keepaliveInterval: number;

function startKeepAlive() {
  // Clear existing interval if any
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval);
  }
  
  // Set up new interval
  keepaliveInterval = setInterval(() => {
    try {
      // Send keepalive to all channels
      for (const [channelId, channelSockets] of connections.entries()) {
        if (channelSockets.size === 0) continue;
        
        const message = JSON.stringify({
          type: "keepalive",
          timestamp: new Date().toISOString()
        });
        
        let activeCount = 0;
        
        for (const socket of channelSockets) {
          try {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(message);
              activeCount++;
            } else if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
              channelSockets.delete(socket);
            }
          } catch (err) {
            console.error(`Error sending keepalive to socket in channel ${channelId}:`, err);
            channelSockets.delete(socket);
          }
        }
        
        console.log(`Sent keepalive to ${activeCount} clients in channel ${channelId}`);
        
        // Remove channel if no active sockets
        if (channelSockets.size === 0) {
          connections.delete(channelId);
          console.log(`Removed empty channel: ${channelId}`);
        }
      }
    } catch (err) {
      console.error("Error in keepalive routine:", err);
    }
  }, KEEPALIVE_INTERVAL);
  
  console.log("Keepalive interval started");
}

// Start the initial keepalive
startKeepAlive();

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Check for WebSocket upgrade
    const upgradeHeader = req.headers.get("upgrade") || "";
    if (upgradeHeader.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket connection", { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Get channel (user ID) from query params
    const url = new URL(req.url);
    const channelId = url.searchParams.get("channel");
    const mode = url.searchParams.get("mode") || "consumer"; // consumer or producer
    
    console.log(`Connection request for channel ${channelId}, mode: ${mode}`);
    
    if (!channelId) {
      console.log("Request rejected: Missing channel parameter");
      return new Response("Missing channel parameter", { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    // For consumer mode (OBS), we validate but with simplified auth
    const isValid = await validateUserId(channelId);
    if (!isValid) {
      console.log(`Request rejected: Invalid channel ${channelId}`);
      return new Response("Invalid channel", { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Set up websocket connection
    const { socket, response } = Deno.upgradeWebSocket(req);

    // Initialize channel if needed
    if (!connections.has(channelId)) {
      connections.set(channelId, new Set());
      recentDonations.set(channelId, new Set());
      idempotencyKeys.set(channelId, new Set());
    }
    
    // Add this connection to the channel
    const channelConnections = connections.get(channelId)!;
    channelConnections.add(socket);
    
    console.log(`Client connected to channel ${channelId}, mode: ${mode}`);
    console.log(`Channel now has ${channelConnections.size} connections`);
    
    // Send welcome message - with try/catch to handle errors
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "welcome",
          message: `Connected to channel ${channelId}`,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error("Error sending welcome message:", error);
    }

    // Handle messages from clients
    socket.onmessage = async (event) => {
      try {
        console.log(`Message received in channel ${channelId}:`, event.data);
        const data = JSON.parse(event.data);
        
        // Handle different message types
        if (data.type === "donation") {
          console.log(`Broadcasting donation in channel ${channelId}`);
          
          // Add a unique server-side ID if missing an ID
          if (data.donation && !data.donation.id && !data.donation.clientId) {
            data.donation.clientId = `server-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          }
          
          // Save original idempotency key if present
          const idempotencyKey = data.idempotencyKey;
          
          // Send immediately to this client for immediate feedback
          try {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify(data));
            }
          } catch (err) {
            console.error("Error sending donation confirmation to source client:", err);
          }
          
          // Wait a moment to ensure the original client got their copy, then broadcast to others
          setTimeout(() => {
            broadcastToChannel(channelId, data);
          }, 100);
        } else if (data.type === "ping") {
          console.log(`Ping received from channel ${channelId}`);
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: "pong",
              timestamp: new Date().toISOString()
            }));
          }
        } else if (data.type === "hello") {
          console.log(`Hello from ${mode} in channel ${channelId}`);
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: "welcome",
              message: `Connected to channel ${channelId}`,
              timestamp: new Date().toISOString()
            }));
          }
        } else if (data.type === "pong") {
          // Just log the pong response
          console.log(`Pong received from channel ${channelId}`);
        }
      } catch (error) {
        console.error("Error processing message:", error);
        // Try to send error back to client
        try {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: "error",
              message: "Failed to process message",
              timestamp: new Date().toISOString()
            }));
          }
        } catch (err) {
          console.error("Error sending error message:", err);
        }
      }
    };

    // Handle client disconnection
    socket.onclose = () => {
      console.log(`Client disconnected from channel ${channelId}`);
      
      // Remove this connection from tracking
      channelConnections.delete(socket);
      
      // Clean up empty channels
      if (channelConnections.size === 0) {
        connections.delete(channelId);
        console.log(`Channel ${channelId} removed (no connections left)`);
      } else {
        console.log(`Channel ${channelId} now has ${channelConnections.size} connections`);
      }
    };

    // Handle errors
    socket.onerror = (error) => {
      console.error(`WebSocket error in channel ${channelId}:`, error);
    };

    return response;
  } catch (error) {
    console.error("Unexpected error in main serve function:", error);
    return new Response(`Server error: ${error.message}`, { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
