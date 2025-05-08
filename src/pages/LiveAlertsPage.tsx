import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAlertStyle, AlertStyle } from "@/contexts/AlertStyleContext";
import { useAuth } from "@/contexts/AuthContext";
import { sendTestAlert, getWebSocketUrl, createAlertWebSocket, testWebSocketConnection } from "@/utils/obsUtils";

// Define the donation type based on our Supabase schema
// Add clientId as an optional property to handle the temporary IDs
interface Donation {
  id: number;
  payment_id: string;
  amount: number;
  donor_name: string;
  message: string | null;
  created_at: string;
  user_id: string | null;
  clientId?: string; // Add optional clientId for client-side tracking
}

const LiveAlertsPage = () => {
  const [alerts, setAlerts] = useState<Donation[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastAlert, setLastAlert] = useState<Donation | null>(null);
  const [showOBSInstructions, setShowOBSInstructions] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { activeStyle, isLoading: styleLoading } = useAlertStyle();
  const { user } = useAuth();
  
  // WebSocket references
  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectTimeoutRef = useRef<number | null>(null);
  
  // Get parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const isOBSMode = urlParams.get('obs') === 'true';
  const channelId = urlParams.get('channel');
  
  // Format amount as Indian Rupees
  const formatIndianRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Check if donation is a test donation
  const isTestDonation = (payment_id: string) => {
    return payment_id?.startsWith('test_') || false;
  };

  // WebSocket setup for OBS alerts
  useEffect(() => {
    async function setupWebSocket() {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log("WebSocket already connected");
        return;
      }
      
      setIsConnecting(true);
      setConnected(false);
      
      try {
        // Clear any pending reconnect timeouts
        if (wsReconnectTimeoutRef.current !== null) {
          window.clearTimeout(wsReconnectTimeoutRef.current);
          wsReconnectTimeoutRef.current = null;
        }
        
        const targetChannel = isOBSMode && channelId ? channelId : user?.id;
        if (!targetChannel) {
          console.log("No channel ID available, skipping WebSocket setup");
          setIsConnecting(false);
          return;
        }
        
        console.log(`Setting up WebSocket for channel: ${targetChannel}, mode: ${isOBSMode ? "OBS" : "dashboard"}`);
        
        // Create WebSocket connection
        const socket = await createAlertWebSocket(
          targetChannel,
          isOBSMode ? "consumer" : "producer"
        );
        
        wsRef.current = socket;
        setConnected(true);
        setIsConnecting(false);
        
        if (!isOBSMode) {
          toast.success("Connected to alert system");
        }
        
        // Handle messages from the server
        socket.onmessage = (event) => {
          try {
            console.log("WebSocket message received:", event.data);
            const data = JSON.parse(event.data);
            
            if (data.type === "donation") {
              const newDonation = data.donation as Donation;
              console.log("Processing donation from WebSocket:", newDonation);
              handleNewDonation(newDonation);
            } else if (data.type === "welcome") {
              console.log("Welcome message received:", data.message);
            } else if (data.type === "pong") {
              console.log("Pong received:", data);
            } else if (data.type === "keepalive") {
              console.log("Keepalive received:", data.timestamp);
              // Send pong in response
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                  type: "pong",
                  timestamp: new Date().toISOString()
                }));
              }
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };
        
        // Handle connection closure
        socket.onclose = (event) => {
          console.log("WebSocket disconnected:", event.code, event.reason);
          setConnected(false);
          
          if (!event.wasClean) {
            if (!isOBSMode) {
              toast.error("Disconnected from alert system. Reconnecting...");
            }
            
            // Attempt to reconnect after a delay
            wsReconnectTimeoutRef.current = window.setTimeout(() => {
              console.log("Attempting to reconnect...");
              setupWebSocket();
            }, 3000);
          }
        };
        
        // Handle errors
        socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          setConnected(false);
          if (!isOBSMode) {
            toast.error("Connection error. Will attempt to reconnect.");
          }
        };
      } catch (error) {
        console.error("Error during WebSocket setup:", error);
        setConnected(false);
        setIsConnecting(false);
        
        if (!isOBSMode) {
          toast.error("Failed to connect to alert system. Will retry...");
        }
        
        // Attempt to reconnect after a delay
        wsReconnectTimeoutRef.current = window.setTimeout(() => {
          console.log("Attempting to reconnect after error...");
          setupWebSocket();
        }, 3000);
      }
    }
    
    setupWebSocket();
    
    // Return cleanup function
    return () => {
      // Clean up WebSocket connection on unmount
      if (wsRef.current) {
        console.log("Cleaning up WebSocket connection");
        wsRef.current.close();
      }
      
      // Clear any pending reconnect timeouts
      if (wsReconnectTimeoutRef.current !== null) {
        window.clearTimeout(wsReconnectTimeoutRef.current);
        wsReconnectTimeoutRef.current = null;
      }
    };
  }, [isOBSMode, channelId, user?.id]);

  // Handle a new donation alert
  const handleNewDonation = (newDonation: Donation) => {
    console.log("Handling new donation:", newDonation);
    
    // Generate a unique key if not available
    if (!newDonation.id) {
      console.log("Donation missing ID, generating one");
      // Now TypeScript knows clientId is a valid property
      newDonation.clientId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    
    // Add to alerts list, ensuring no duplicates
    setAlerts(prevAlerts => {
      // Check if this donation already exists
      const exists = prevAlerts.some(d => 
        (d.id && d.id === newDonation.id) || 
        (d.payment_id && d.payment_id === newDonation.payment_id)
      );
      
      if (exists) {
        console.log("Donation already exists in list, not adding duplicate");
        return prevAlerts;
      }
      
      return [newDonation, ...prevAlerts].slice(0, 20);
    });
    
    // Set as last alert to highlight it
    setLastAlert(newDonation);
    
    // Show toast notification if not in OBS mode
    if (!isOBSMode) {
      const isTest = isTestDonation(newDonation.payment_id) ? " (Test)" : "";
      toast(`${newDonation.donor_name}${isTest} donated ${formatIndianRupees(newDonation.amount)}`, {
        description: newDonation.message || "No message",
      });
    }
    
    // Reset last alert highlight after several seconds
    const duration = activeStyle?.duration || 5;
    setTimeout(() => {
      setLastAlert(null);
    }, duration * 1000);
  };

  // Set up real-time subscription when userId is available
  useEffect(() => {
    // Only set up the subscription in producer mode (not OBS mode)
    if (isOBSMode || !user?.id) return;

    console.log("Setting up subscription for user:", user.id);

    // Subscribe to real-time updates for donations for this specific user
    const channel = supabase
      .channel('public:donations')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'donations',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          const newDonation = payload.new as Donation;
          console.log('New donation received from database:', newDonation);
          
          // Send to WebSocket for broadcasting to OBS clients
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            console.log("Broadcasting donation to WebSocket");
            wsRef.current.send(JSON.stringify({
              type: "donation",
              donation: newDonation
            }));
          } else {
            console.warn("WebSocket not ready, can't broadcast donation");
            // Attempt to reconnect the WebSocket
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.CONNECTING) {
              handleReconnect();
            }
          }
          
          // Also handle locally
          handleNewDonation(newDonation);
        }
      )
      .subscribe();

    // Fetch the initial 20 most recent donations for this user
    const fetchRecentDonations = async () => {
      if (!user?.id) return;
      
      console.log("Fetching recent donations for user:", user.id);
      
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Error fetching recent donations:', error);
        return;
      }
      
      if (data) {
        console.log("Fetched donations:", data.length);
        setAlerts(data);
      }
    };

    fetchRecentDonations();

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, isOBSMode]);

  // Format the timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get animation class based on selected style
  const getAnimationClass = () => {
    if (!activeStyle?.animation_type) return "animate-fade-in";
    
    switch(activeStyle.animation_type) {
      case 'slide':
        return "animate-slide-in-right";
      case 'bounce':
        return "animate-bounce";
      case 'zoom':
        return "animate-scale-in";
      case 'fade':
      default:
        return "animate-fade-in";
    }
  };
  
  // Manual test function
  const handleManualTest = async () => {
    if (!user) {
      toast.error("You must be signed in to send test alerts");
      return;
    }
    
    toast.info("Sending test alert...");
    const result = await sendTestAlert();
    
    if (result.error) {
      toast.error("Failed to send test alert: " + (result.error.message || "Unknown error"));
    } else {
      toast.success("Test alert sent");
    }
  };

  // Function to manually reconnect WebSocket
  const handleReconnect = () => {
    if (wsRef.current) {
      console.log("Manually closing WebSocket for reconnection");
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Clear any pending reconnect timeouts
    if (wsReconnectTimeoutRef.current !== null) {
      window.clearTimeout(wsReconnectTimeoutRef.current);
      wsReconnectTimeoutRef.current = null;
    }
    
    // Wait a moment before attempting to reconnect
    setTimeout(() => {
      const targetChannel = isOBSMode && channelId ? channelId : user?.id;
      if (targetChannel) {
        console.log("Manually reconnecting WebSocket");
        createAlertWebSocket(targetChannel, isOBSMode ? "consumer" : "producer")
          .then(socket => {
            wsRef.current = socket;
            setConnected(true);
            toast.success("Reconnected to alert system");
            
            // Send a test ping
            socket.send(JSON.stringify({
              type: "ping",
              timestamp: new Date().toISOString()
            }));
          })
          .catch(err => {
            console.error("Error during manual reconnection:", err);
            toast.error("Failed to reconnect");
          });
      }
    }, 500);
  };

  // If in OBS mode and no channel ID provided, show error
  if (isOBSMode && !channelId) {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-4">
        <Alert variant="destructive" className="max-w-md shadow-lg">
          <AlertTriangle className="h-6 w-6" />
          <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Missing channel ID parameter. The OBS browser source URL is not configured correctly.</p>
            
            <div className="mt-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
              <h4 className="font-bold mb-1">Troubleshooting:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Return to the StreamDonate dashboard</li>
                <li>Go to Setup page and copy the correct OBS URL</li>
                <li>Make sure the URL includes the channel parameter</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If in OBS mode, render a simplified version with no sidebars or other UI elements
  if (isOBSMode) {
    // Get the default style if no activeStyle is set
    const getFallbackStyle = (): Partial<AlertStyle> => ({
      background_color: "#ffffff",
      text_color: "#111827",
      font_family: "system-ui",
      animation_type: "fade",
      duration: 5
    });
    
    const alertStyle = activeStyle || getFallbackStyle();
    
    return (
      <div className="obs-container" style={{ 
        background: 'transparent',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Debug info for OBS mode (will be visible in OBS) */}
        <div className="absolute top-2 left-2 bg-black/50 text-white p-2 text-xs z-50 opacity-50 rounded">
          {channelId ? `Channel: ${channelId.substring(0, 8)}...` : "No channel"}
          {" | "}
          {connected ? (
            <span className="text-green-400">Connected</span>
          ) : isConnecting ? (
            <span className="text-yellow-400">Connecting...</span>
          ) : (
            <span className="text-red-400">Disconnected</span>
          )}
        </div>
        
        {/* Connection indicator (only visible when disconnected) */}
        {!connected && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full flex items-center text-xs animate-pulse">
            <WifiOff className="h-3 w-3 mr-1" /> Disconnected
          </div>
        )}
        
        {connected && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full flex items-center text-xs opacity-70">
            <Wifi className="h-3 w-3 mr-1" /> Connected
          </div>
        )}
        
        {lastAlert && (
          <div 
            key={lastAlert.id || lastAlert.clientId || Math.random()}
            className={`donation-alert fixed bottom-10 right-10 p-0 max-w-md w-full ${getAnimationClass()}`}
            style={{
              fontFamily: alertStyle.font_family || "inherit"
            }}
          >
            <Alert 
              className={cn("border-2 backdrop-blur-sm shadow-lg")}
              style={{
                backgroundColor: `${alertStyle.background_color}${isOBSMode ? "E6" : ""}`, // E6 = 90% opacity
                color: alertStyle.text_color
              }}
            >
              <Bell className="h-6 w-6" style={{ color: alertStyle.text_color }} />
              <div className="w-full">
                <AlertTitle 
                  className="text-lg font-bold" 
                  style={{ color: alertStyle.text_color }}
                >
                  {isTestDonation(lastAlert.payment_id) ? "(Test) " : ""}
                  {lastAlert.donor_name} donated {formatIndianRupees(lastAlert.amount)}
                </AlertTitle>
                {lastAlert.message && (
                  <AlertDescription 
                    className="text-base mt-2" 
                    style={{ color: alertStyle.text_color }}
                  >
                    {lastAlert.message}
                  </AlertDescription>
                )}
              </div>
            </Alert>
          </div>
        )}
      </div>
    );
  }

  // Normal mode (not OBS mode)
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Live Donation Alerts</h1>
          <p className="text-muted-foreground mb-6">Watch donations as they come in real-time</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center mt-2 sm:mt-0">
          {isConnecting ? (
            <Badge 
              variant="outline"
              className="flex items-center gap-1 bg-yellow-50 text-yellow-700 border-yellow-300"
            >
              <RefreshCw className="h-3 w-3 animate-spin" /> Connecting...
            </Badge>
          ) : connected ? (
            <Badge 
              variant="default"
              className="flex items-center gap-1"
            >
              <Wifi className="h-3 w-3" /> Connected
            </Badge>
          ) : (
            <Badge 
              variant="destructive"
              className="flex items-center gap-1"
            >
              <WifiOff className="h-3 w-3" /> Disconnected
            </Badge>
          )}
          
          {!connected && !isConnecting && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReconnect}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Reconnect
            </Button>
          )}
          
          <button
            onClick={() => setShowOBSInstructions(!showOBSInstructions)}
            className="text-sm text-primary hover:underline"
          >
            {showOBSInstructions ? "Hide OBS Setup" : "Show OBS Setup"}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <Button 
          onClick={handleManualTest}
          variant="default"
          className="flex items-center gap-2"
        >
          <Bell className="h-4 w-4" />
          Send Test Alert Now
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          This will trigger an alert in both your dashboard and any connected OBS browser sources
        </p>
      </div>

      {showOBSInstructions && (
        <Card className="mb-6 bg-muted/50">
          <CardHeader>
            <CardTitle>OBS Browser Source Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="font-medium">Secure URL for OBS Browser Source:</p>
              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={user ? `${window.location.origin}/live-alerts?obs=true&channel=${user.id}` : "Please sign in"}
                  className="flex-1 bg-background px-3 py-2 text-sm border rounded-l-md"
                />
                <button 
                  className="bg-primary text-white px-3 py-2 rounded-r-md hover:bg-primary/90 disabled:opacity-50"
                  onClick={() => {
                    const url = `${window.location.origin}/live-alerts?obs=true&channel=${user?.id}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Copied!", {
                      description: "Secure OBS URL copied to clipboard"
                    });
                  }}
                  disabled={!user}
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                This URL connects to our WebSocket server to display alerts without complex authentication
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-medium">Instructions:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>In OBS Studio, add a new "Browser" source</li>
                <li>Copy and paste the URL above into the URL field</li>
                <li>Set the width to 1280 and height to 720</li>
                <li><strong className="text-primary">Enable "Refresh browser when scene becomes active"</strong></li>
                <li>Click OK to save</li>
              </ol>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-start space-x-2">
                <RefreshCw className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-800">Troubleshooting</h3>
                  <p className="text-sm text-blue-600 mb-2">
                    If alerts aren't showing up in your OBS browser source:
                  </p>
                  <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                    <li>Click "Send Test Alert Now" button above to trigger a test alert</li>
                    <li>In OBS, right-click your browser source and select "Refresh cache of current page"</li>
                    <li>Make sure "Refresh browser when scene becomes active" is checked</li>
                    <li>Try completely removing and re-adding the browser source in OBS</li>
                    <li>Check if your internet connection is stable</li>
                    <li>Make sure your OBS is updated to the latest version</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert Display */}
      <div className="grid gap-6">
        {alerts.length > 0 ? (
          alerts.map((donation) => (
            <Alert 
              key={donation.id || donation.payment_id || donation.clientId || Math.random()}
              className={cn(
                "transition-all duration-500 p-6",
                lastAlert?.id === donation.id ? "border-brand-600 bg-brand-50/30 animate-pulse" : "",
                isTestDonation(donation.payment_id) ? "border-blue-300" : ""
              )}
            >
              <Bell className="h-6 w-6 mt-0.5" />
              <div className="w-full">
                <div className="flex justify-between items-start">
                  <AlertTitle className="font-semibold text-lg">
                    {isTestDonation(donation.payment_id) && <span className="text-blue-500 font-normal text-sm mr-1">(Test)</span>}
                    {donation.donor_name} donated {formatIndianRupees(donation.amount)}
                  </AlertTitle>
                  <span className="text-sm text-muted-foreground">
                    {donation.created_at ? formatTime(donation.created_at) : 'Just now'}
                  </span>
                </div>
                <AlertDescription className="mt-2 text-base text-muted-foreground">
                  {donation.message || "No message"}
                </AlertDescription>
              </div>
            </Alert>
          ))
        ) : (
          <Card className="p-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-xl">
                <AlertTriangle className="mr-2 h-6 w-4 text-muted-foreground" />
                No alerts yet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-base">
                Donation alerts will appear here as they come in. When someone makes a donation, 
                you'll see it instantly! Click "Send Test Alert Now" to test the system.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LiveAlertsPage;
