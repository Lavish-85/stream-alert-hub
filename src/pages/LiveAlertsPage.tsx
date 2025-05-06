
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useAlertStyle, AlertStyle } from "@/contexts/AlertStyleContext";

// Define the donation type based on our Supabase schema
interface Donation {
  id: number;
  payment_id: string;
  amount: number;
  donor_name: string;
  message: string | null;
  created_at: string;
}

const LiveAlertsPage = () => {
  const [alerts, setAlerts] = useState<Donation[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastAlert, setLastAlert] = useState<Donation | null>(null);
  const [showOBSInstructions, setShowOBSInstructions] = useState(false);
  const { activeStyle } = useAlertStyle();

  console.log("Current active style:", activeStyle);

  // Format amount as Indian Rupees
  const formatIndianRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  useEffect(() => {
    // Subscribe to real-time updates for donations
    const channel = supabase
      .channel('public:donations')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'donations' 
        }, 
        (payload) => {
          const newDonation = payload.new as Donation;
          console.log('New donation received:', newDonation);
          
          // Add to alerts list
          setAlerts(prevAlerts => [newDonation, ...prevAlerts].slice(0, 20));
          
          // Set as last alert to highlight it
          setLastAlert(newDonation);
          
          // Show toast notification if not in OBS mode
          const isOBSMode = new URLSearchParams(window.location.search).get('obs') === 'true';
          if (!isOBSMode) {
            toast(newDonation.donor_name + " donated " + formatIndianRupees(newDonation.amount), {
              description: newDonation.message || "No message",
            });
          }
          
          // Reset last alert highlight after several seconds
          const duration = activeStyle?.duration || 5;
          setTimeout(() => {
            setLastAlert(null);
          }, duration * 1000);
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setConnected(true);
        } else {
          setConnected(false);
        }
      });

    // Fetch the initial 20 most recent donations
    const fetchRecentDonations = async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Error fetching recent donations:', error);
        return;
      }
      
      if (data) {
        setAlerts(data);
      }
    };

    fetchRecentDonations();

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
    };
  }, [activeStyle?.duration]);

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

  // Generate OBS URL with timestamp to prevent caching
  const getOBSUrl = () => {
    const baseUrl = `${window.location.origin}/live-alerts?obs=true`;
    return `${baseUrl}&t=${new Date().getTime()}`;
  };

  // Extract query parameters to check if we're in OBS mode
  const isOBSMode = new URLSearchParams(window.location.search).get('obs') === 'true';

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
    
    console.log("Using alert style in OBS mode:", alertStyle);
    
    return (
      <div className="obs-container" style={{ 
        background: 'transparent',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {lastAlert && (
          <div 
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Live Donation Alerts</h1>
          <p className="text-muted-foreground">Watch donations as they come in real-time</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center mt-2 sm:mt-0">
          <Badge 
            variant={connected ? "default" : "destructive"}
          >
            {connected ? "Connected" : "Disconnected"}
          </Badge>
          <button
            onClick={() => setShowOBSInstructions(!showOBSInstructions)}
            className="text-sm text-primary hover:underline"
          >
            {showOBSInstructions ? "Hide OBS Setup" : "Show OBS Setup"}
          </button>
        </div>
      </div>

      {showOBSInstructions && (
        <Card className="mb-6 bg-muted/50">
          <CardHeader>
            <CardTitle>OBS Browser Source Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="font-medium">URL for OBS Browser Source:</p>
              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={getOBSUrl()}
                  className="flex-1 bg-background px-3 py-2 text-sm border rounded-l-md"
                />
                <button 
                  className="bg-primary text-white px-3 py-2 rounded-r-md hover:bg-primary/90"
                  onClick={() => {
                    navigator.clipboard.writeText(getOBSUrl());
                    toast("Copied!", {
                      description: "OBS URL copied to clipboard"
                    });
                  }}
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                This URL includes a timestamp parameter to prevent caching when styles change
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-medium">Instructions:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>In OBS Studio, add a new "Browser" source</li>
                <li>Paste the URL above into the URL field</li>
                <li>Set the width to 1280 and height to 720</li>
                <li>Enable "Refresh browser when scene becomes active"</li>
                <li>Click OK to save</li>
              </ol>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
              <h3 className="font-medium mb-1">Current Alert Style</h3>
              <p className="text-sm">
                {activeStyle ? (
                  <>Using "{activeStyle.name}" style for alerts - customize in the Alerts page</>
                ) : (
                  <>No alert style selected. Visit the Alerts page to choose and customize one.</>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert Display */}
      <div className="grid gap-6">
        {alerts.length > 0 ? (
          alerts.map((donation) => (
            <Alert 
              key={donation.id}
              className={cn(
                "transition-all duration-500 p-6",
                lastAlert?.id === donation.id ? "border-brand-600 bg-brand-50/30 animate-pulse" : ""
              )}
            >
              <Bell className="h-6 w-6 mt-0.5" />
              <div className="w-full">
                <div className="flex justify-between items-start">
                  <AlertTitle className="font-semibold text-lg">
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
                <AlertTriangle className="mr-2 h-6 w-6 text-muted-foreground" />
                No alerts yet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-base">
                Donation alerts will appear here as they come in. When someone makes a donation, 
                you'll see it instantly!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LiveAlertsPage;
