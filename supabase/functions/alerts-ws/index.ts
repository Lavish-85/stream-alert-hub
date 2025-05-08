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
  if (!channelConnections) return;
  
  const message = JSON.stringify(data);
  console.log(`Broadcasting to ${channelConnections.size} clients in channel ${channelId}`);
  
  channelConnections.forEach(socket => {
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    } catch (err) {
      console.error("Error sending to socket:", err);
    }
  });
}

// Helper to validate a user ID is legitimate
async function validateUserId(userId: string): Promise<boolean> {
  if (!userId || userId.length < 10) return false;
  
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false } }
    );

    // Check if user exists
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error("User validation failed:", error);
      return false;
    }
    
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
  
  if (!channelId) {
    return new Response("Missing channel parameter", { 
      status: 400, 
      headers: corsHeaders 
    });
  }
  
  // For consumer mode (OBS), we don't need to validate (keep it simple)
  // For producer mode (dashboard), validate to secure the connection
  if (mode === "producer") {
    // Extract token from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response("Unauthorized", { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    // Verify the JWT token using Supabase
    try {
      const token = authHeader.replace("Bearer ", "");
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") || "",
        Deno.env.get("SUPABASE_ANON_KEY") || "",
        { 
          auth: {
            persistSession: false,
            autoRefreshToken: false
          } 
        }
      );
      
      // Verify JWT token
      const { data: { user }, error } = await supabaseClient.auth.getUser(token);
      
      if (error || !user) {
        console.error("Authentication failed:", error);
        return new Response("Unauthorized", { 
          status: 401, 
          headers: corsHeaders 
        });
      }
      
      // Ensure the token owner is trying to access their own channel
      if (user.id !== channelId) {
        console.error("Channel ID mismatch with authenticated user");
        return new Response("Forbidden", { 
          status: 403, 
          headers: corsHeaders 
        });
      }
    } catch (err) {
      console.error("Auth error:", err);
      return new Response("Authentication error", { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  } else {
    // For consumer mode, verify the channel exists
    const isValid = await validateUserId(channelId);
    if (!isValid) {
      return new Response("Invalid channel", { 
        status: 400, 
        headers: corsHeaders 
      });
    }
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

  // Set up database listener for this user's donations (only for producer mode)
  if (mode === "producer") {
    // This happens in the client now
  }

  // Handle messages from clients
  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // In producer mode, broadcast the message to all consumers
      if (mode === "producer" && data.type === "donation") {
        console.log(`Broadcasting donation from producer in channel ${channelId}`);
        broadcastToChannel(channelId, data);
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
