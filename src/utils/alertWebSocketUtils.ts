
import WebSocketService from "@/services/websocketService";

// Configuration constants
const USE_CUSTOM_WEBSOCKET = true; // Toggle between custom WebSocket and Supabase
const WEBSOCKET_SERVER_URL = "wss://alerts-ws.your-domain.com"; // Replace with your actual WebSocket server URL
const WEBSOCKET_FALLBACK_URL = "wss://khfhloynxijcagrqqicq.supabase.co/realtime/v1/websocket"; // Supabase fallback

// Helper to determine the WebSocket URL to use
export const getWebSocketUrl = (channelId: string): string => {
  if (USE_CUSTOM_WEBSOCKET) {
    // Use our custom WebSocket server
    return `${WEBSOCKET_SERVER_URL}/alerts/${channelId}`;
  } else {
    // Use Supabase as a fallback
    return WEBSOCKET_FALLBACK_URL;
  }
};

export interface CreateAlertWebSocketOptions {
  token?: string;
  channelId: string;
  onMessage: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

// Create a WebSocket connection for alerts
export const createAlertWebSocket = (options: CreateAlertWebSocketOptions): WebSocketService => {
  const { token, channelId, onMessage, onConnect, onDisconnect, onError } = options;
  
  const wsUrl = getWebSocketUrl(channelId);
  
  // Create and configure WebSocket service
  const webSocketService = new WebSocketService({
    url: wsUrl,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    onMessage: (data) => {
      // Process the incoming message
      if (data.type === "alert") {
        onMessage(data);
      } else if (data.type === "system") {
        console.log("System message:", data.message);
      }
    },
    onOpen: () => {
      console.log("Alert WebSocket connected");
      if (onConnect) onConnect();
    },
    onClose: () => {
      console.log("Alert WebSocket disconnected");
      if (onDisconnect) onDisconnect();
    },
    onError: (error) => {
      console.error("Alert WebSocket error:", error);
      if (onError) onError(error);
    },
    authToken: token
  });
  
  // Connect to the WebSocket server
  webSocketService.connect();
  
  return webSocketService;
};

// Update the WebSocket authentication token
export const updateWebSocketAuth = (webSocketService: WebSocketService, token: string): void => {
  webSocketService.setAuthToken(token);
};
