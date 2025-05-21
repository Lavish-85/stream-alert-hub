import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createAlertWebSocket } from "@/utils/alertWebSocketUtils";
import WebSocketService from "@/services/websocketService";
import { toast } from "@/components/ui/sonner";

const LiveAlertsPage = () => {
  const { user, getWebSocketAuthToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isOBSMode = searchParams.get('obs') === 'true';
  const tokenFromUrl = searchParams.get('token');
  
  const [connected, setConnected] = useState(false);
  const [donations, setDonations] = useState<any[]>([]);
  const webSocketRef = useRef<WebSocketService | null>(null);

  useEffect(() => {
    let userId = user?.id;
    let authToken: string | undefined;
    
    const initWebSocket = async () => {
      try {
        // In OBS mode, use the token from the URL
        if (isOBSMode && tokenFromUrl) {
          // Use the token directly from the URL
          userId = tokenFromUrl;
          authToken = tokenFromUrl;
        } else if (!isOBSMode && user) {
          // In regular mode, get an auth token for the current user
          authToken = await getWebSocketAuthToken();
          userId = user.id;
        } else if (!isOBSMode && !user) {
          // Not in OBS mode and no user, redirect to auth
          toast({
            title: "Authentication Required",
            description: "Please log in to view alerts"
          });
          navigate("/auth");
          return;
        }
        
        if (!userId) {
          console.error("No user ID or token available for WebSocket connection");
          return;
        }

        // Create WebSocket connection
        webSocketRef.current = createAlertWebSocket({
          channelId: userId,
          token: authToken,
          onMessage: handleWebSocketMessage,
          onConnect: () => setConnected(true),
          onDisconnect: () => setConnected(false),
          onError: (error) => {
            console.error("WebSocket error:", error);
            toast({
              title: "Connection Error",
              description: "Failed to connect to alert service",
              variant: "destructive"
            });
          }
        });
        
        return () => {
          // Clean up WebSocket on unmount
          if (webSocketRef.current) {
            webSocketRef.current.close();
          }
        };
      } catch (error) {
        console.error("Error setting up WebSocket connection:", error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to alert service",
          variant: "destructive"
        });
      }
    };

    initWebSocket();
    
    // Return cleanup function
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
    };
  }, [user, navigate, isOBSMode, tokenFromUrl, getWebSocketAuthToken]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    console.log("Received alert data:", data);
    
    // Handle alerts based on type
    if (data.type === 'alert' && data.alertType === 'donation') {
      // Add the new donation to the list
      setDonations(prev => [data.data, ...prev.slice(0, 9)]);
      
      // Show toast notification
      if (!isOBSMode) {
        toast({
          title: "New Donation",
          description: `${data.data.donor_name} donated ₹${data.data.amount}`
        });
      }
    }
  };

  // The rest of your existing LiveAlertsPage component remains the same
  // Just render the donations or alert display as before

  return (
    <div>
      {/* Your existing LiveAlertsPage UI here */}
      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Live Alerts</h1>
          <p className={connected ? "text-green-500" : "text-red-500"}>
            {connected ? "Connected" : "Disconnected"}
          </p>
        </div>
        
        <div className="space-y-4">
          {donations.map((donation, index) => (
            <div key={index} className="bg-card p-4 rounded-lg shadow">
              <p className="font-bold">{donation.donor_name}</p>
              <p>₹{donation.amount}</p>
              {donation.message && <p>{donation.message}</p>}
            </div>
          ))}
          
          {donations.length === 0 && (
            <p className="text-muted-foreground">No recent donations</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveAlertsPage;
