
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

// Helper to broadcast alerts to a specific channel
function broadcastToChannel(channelId: string, data: any) {
  const channelConnections = connections.get(channelId);
  if (!channelConnections) {
    console.log(`No connections found for channel ${channelId}`);
    return;
  }
  
  const message = JSON.stringify(data);
  console.log(`Broadcasting to ${channelConnections.size} clients in channel ${channelId}`);
  
  let successCount = 0;
  let failCount = 0;
  
  channelConnections.forEach(socket => {
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
        successCount++;
      } else {
        console.log(`Skipping socket with readyState: ${socket.readyState}`);
        failCount++;
      }
    } catch (err) {
      console.error("Error sending to socket:", err);
      failCount++;
    }
  });
  
  console.log(`Broadcast complete: ${successCount} successful, ${failCount} failed`);
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

serve(async (req) => {
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
  }
  
  // Add this connection to the channel
  const channelConnections = connections.get(channelId)!;
  channelConnections.add(socket);
  
  console.log(`Client connected to channel ${channelId}, mode: ${mode}`);
  console.log(`Channel now has ${channelConnections.size} connections`);
  
  // Send welcome message
  try {
    socket.send(JSON.stringify({
      type: "welcome",
      message: `Connected to channel ${channelId}`
    }));
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
        broadcastToChannel(channelId, data);
      } else if (data.type === "ping") {
        console.log(`Ping received from channel ${channelId}`);
        socket.send(JSON.stringify({
          type: "pong",
          timestamp: new Date().toISOString()
        }));
      } else if (data.type === "hello") {
        console.log(`Hello from ${mode} in channel ${channelId}`);
        socket.send(JSON.stringify({
          type: "welcome",
          message: `Connected to channel ${channelId}`
        }));
      }
    } catch (error) {
      console.error("Error processing message:", error);
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
});
