
// WebSocket Server for Donation Alerts
const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const jwt = require('jsonwebtoken');

// Configuration
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // Should be set as an environment variable in production

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Alert Server');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store active connections by channel ID
const channels = new Map();

// Validate JWT token
const validateToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token validation error:', error.message);
    return null;
  }
};

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  
  // Extract channel ID from URL path (e.g., /alerts/channelId)
  const pathSegments = pathname.split('/').filter(Boolean);
  const channelId = pathSegments.length >= 2 && pathSegments[0] === 'alerts' 
    ? pathSegments[1] 
    : null;
  
  // Extract authentication token
  const token = query.token;
  
  // Validate client connection
  if (!channelId) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Invalid channel ID'
    }));
    ws.close();
    return;
  }
  
  // Authenticate connection if token is provided (optional for public channels)
  let userId = null;
  if (token) {
    const decoded = validateToken(token);
    if (!decoded) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid authentication token'
      }));
      ws.close();
      return;
    }
    userId = decoded.user_id;
  }
  
  console.log(`Client connected to channel ${channelId}${userId ? ` as user ${userId}` : ''}`);
  
  // Store the connection in the channel map
  if (!channels.has(channelId)) {
    channels.set(channelId, new Set());
  }
  channels.get(channelId).add(ws);
  
  // Send connection confirmation
  ws.send(JSON.stringify({
    type: 'system',
    message: 'Connected to alert service',
    channelId: channelId,
    userId: userId
  }));
  
  // Track client state
  ws.isAlive = true;
  ws.channelId = channelId;
  
  // Handle pong responses for connection monitoring
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle heartbeat messages
      if (data.type === 'heartbeat') {
        ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now()
        }));
        return;
      }
      
      // Log received messages
      console.log(`Received message from channel ${channelId}:`, data);
      
      // Handle broadcast requests (only if authenticated as channel owner)
      if (data.type === 'broadcast' && data.channelId && userId) {
        // In a real implementation, check if user has permission to broadcast to this channel
        broadcastToChannel(data.channelId, {
          type: 'alert',
          alertType: data.alertType || 'donation',
          data: data.data
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Handle disconnections
  ws.on('close', () => {
    console.log(`Client disconnected from channel ${channelId}`);
    if (channels.has(channelId)) {
      channels.get(channelId).delete(ws);
      if (channels.get(channelId).size === 0) {
        channels.delete(channelId);
      }
    }
  });
});

// Broadcast message to all clients in a channel
function broadcastToChannel(channelId, message) {
  if (!channels.has(channelId)) {
    console.log(`No active connections for channel ${channelId}`);
    return;
  }
  
  const clients = channels.get(channelId);
  const messageString = JSON.stringify(message);
  
  console.log(`Broadcasting to ${clients.size} clients in channel ${channelId}`);
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}

// Connection monitoring - ping clients to check for stale connections
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// API endpoint for sending alerts
// This would be integrated with your main Express server in production
// For now, we'll use an HTTP POST handler on the same server
server.on('request', (req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/api/send-alert')) {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { channelId, alertData, token } = data;
        
        // Validate the token
        const decoded = validateToken(token);
        if (!decoded) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
        
        // Send the alert
        broadcastToChannel(channelId, {
          type: 'alert',
          alertType: alertData.type || 'donation',
          data: alertData
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('Error processing alert request:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
  } else {
    // Handle other requests through the default handler
    return;
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`WebSocket Alert Server listening on port ${PORT}`);
});
