import { toast } from "@/components/ui/sonner";

// Configuration for WebSocket service
interface WebSocketServiceConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  authToken?: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private onMessageCallback: ((data: any) => void) | undefined;
  private onOpenCallback: (() => void) | undefined;
  private onCloseCallback: (() => void) | undefined;
  private onErrorCallback: ((error: Event) => void) | undefined;
  private authToken: string | undefined;
  private isManualClose = false;

  constructor(config: WebSocketServiceConfig) {
    this.url = config.url;
    this.reconnectInterval = config.reconnectInterval || 3000; // Default 3 seconds
    this.maxReconnectAttempts = config.maxReconnectAttempts || 10; // Default 10 attempts
    this.onMessageCallback = config.onMessage;
    this.onOpenCallback = config.onOpen;
    this.onCloseCallback = config.onClose;
    this.onErrorCallback = config.onError;
    this.authToken = config.authToken;
  }

  public connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("WebSocket connection already open");
      return;
    }

    console.log(`Connecting to WebSocket at ${this.url}`);
    
    try {
      // Include the authentication token in the connection URL if available
      const connectionUrl = this.authToken 
        ? `${this.url}?token=${encodeURIComponent(this.authToken)}`
        : this.url;
        
      this.ws = new WebSocket(connectionUrl);
      this.setupEventListeners();
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      this.handleReconnect();
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log("WebSocket connection established");
      this.reconnectAttempts = 0;
      if (this.onOpenCallback) this.onOpenCallback();
      
      // Send a heartbeat every 30 seconds to keep the connection alive
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data);
        if (this.onMessageCallback) this.onMessageCallback(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`WebSocket connection closed: ${event.code} - ${event.reason}`);
      if (this.onCloseCallback) this.onCloseCallback();
      
      // Don't attempt to reconnect if the connection was manually closed
      if (!this.isManualClose) {
        this.handleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      if (this.onErrorCallback) this.onErrorCallback(error);
    };
  }

  private handleReconnect(): void {
    if (this.isManualClose) return;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectInterval / 1000}s...`);
      
      // Clear any existing reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error("Maximum reconnection attempts reached. WebSocket connection failed.");
      toast({
        title: "Connection Failed",
        description: "Unable to connect to the alert service. Please try again later.",
        variant: "destructive"
      });
    }
  }

  private startHeartbeat(): void {
    // Send a heartbeat message every 30 seconds
    const heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: "heartbeat" });
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000);
    
    // Clear the interval when the WebSocket is closed
    this.ws?.addEventListener("close", () => {
      clearInterval(heartbeatInterval);
    });
  }

  public send(data: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error("Error sending WebSocket message:", error);
        return false;
      }
    } else {
      console.warn("WebSocket not connected. Message not sent:", data);
      return false;
    }
  }

  public setAuthToken(token: string): void {
    this.authToken = token;
    // If already connected, reconnect with new token
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.close();
      this.connect();
    }
  }

  public close(): void {
    this.isManualClose = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.reconnectAttempts = 0;
  }
}

export default WebSocketService;
