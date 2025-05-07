
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useAlertStyle, AlertStyle } from "@/contexts/AlertStyleContext";
import { useAuth } from "@/contexts/AuthContext";
import { validateOBSToken, getOBSUrl } from "@/utils/obsUtils";

// Define the donation type based on our Supabase schema
interface Donation {
  id: number;
  payment_id: string;
  amount: number;
  donor_name: string;
  message: string | null;
  created_at: string;
  user_id: string | null;
}

const LiveAlertsPage = () => {
  const [alerts, setAlerts] = useState<Donation[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastAlert, setLastAlert] = useState<Donation | null>(null);
  const [showOBSInstructions, setShowOBSInstructions] = useState(false);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'error'>('loading');
  const { activeStyle } = useAlertStyle();
  const { user } = useAuth();
  
  // Get parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const isOBSMode = urlParams.get('obs') === 'true';
  const obsToken = urlParams.get('token');
  
  // State for token-authenticated userId
  const [tokenUserId, setTokenUserId] = useState<string | null>(null);
  
  // The effective userId to use for subscriptions
  // In OBS mode with token, use the token's userId
  // Otherwise, use the authenticated user's ID
  const effectiveUserId = isOBSMode && tokenUserId ? tokenUserId : user?.id;

  // Validate token if in OBS mode
  useEffect(() => {
    const validateToken = async () => {
      // Only validate if in OBS mode and we have a token
      if (!isOBSMode || !obsToken) {
        if (!isOBSMode) {
          // Not in OBS mode, so we rely on regular authentication
          setAuthStatus(user ? 'authenticated' : 'error');
        } else {
          // In OBS mode but no token provided
          console.error("OBS Mode active but no token provided");
          setAuthStatus('error');
        }
        return;
      }

      console.log("LiveAlertsPage: Validating OBS token");
      const { userId, error } = await validateOBSToken(obsToken);
      
      if (error || !userId) {
        console.error("LiveAlertsPage: Token validation failed:", error);
        setAuthStatus('error');
        return;
      }
      
      console.log("LiveAlertsPage: Token validated successfully, using user ID:", userId);
      setTokenUserId(userId);
      setAuthStatus('authenticated');
    };
    
    validateToken();
  }, [isOBSMode, obsToken, user]);

  console.log("LiveAlertsPage: Auth Status:", authStatus);
  console.log("LiveAlertsPage: Effective user ID:", effectiveUserId);
  console.log("LiveAlertsPage: Is OBS Mode:", isOBSMode);
  console.log("LiveAlertsPage: OBS Token:", obsToken ? "Provided" : "Not provided");
  console.log("LiveAlertsPage: Active style:", activeStyle);

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
    return payment_id.startsWith('test_');
  };

  // Set up real-time subscription when userId is available
  useEffect(() => {
    // Don't attempt to subscribe if no valid user ID is available or if authentication failed
    if (!effectiveUserId || authStatus !== 'authenticated') {
      console.log("LiveAlertsPage: No valid user ID available or authentication failed, skipping donation subscription");
      return;
    }

    console.log("LiveAlertsPage: Setting up subscription for user:", effectiveUserId);

    // Subscribe to real-time updates for donations for this specific user
    const channel = supabase
      .channel('public:donations')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'donations',
          filter: `user_id=eq.${effectiveUserId}`
        }, 
        (payload) => {
          const newDonation = payload.new as Donation;
          console.log('LiveAlertsPage: New donation received:', newDonation);
          
          // Add to alerts list
          setAlerts(prevAlerts => [newDonation, ...prevAlerts].slice(0, 20));
          
          // Set as last alert to highlight it
          setLastAlert(newDonation);
          
          // Show toast notification if not in OBS mode
          if (!isOBSMode) {
            const isTest = isTestDonation(newDonation.payment_id) ? " (Test)" : "";
            toast(newDonation.donor_name + isTest + " donated " + formatIndianRupees(newDonation.amount), {
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
        console.log('LiveAlertsPage: Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setConnected(true);
        } else {
          setConnected(false);
        }
      });

    // Fetch the initial 20 most recent donations for this user
    const fetchRecentDonations = async () => {
      if (!effectiveUserId) return;
      
      console.log("LiveAlertsPage: Fetching recent donations for user:", effectiveUserId);
      
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('LiveAlertsPage: Error fetching recent donations:', error);
        return;
      }
      
      if (data) {
        console.log("LiveAlertsPage: Fetched donations:", data.length);
        setAlerts(data);
      }
    };

    fetchRecentDonations();

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
    };
  }, [effectiveUserId, authStatus, activeStyle?.duration, isOBSMode]);

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

  // If in OBS mode and authentication failed, show an error
  if (isOBSMode && authStatus === 'error') {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-4">
        <Alert variant="destructive" className="max-w-md shadow-lg">
          <AlertTriangle className="h-6 w-6" />
          <AlertTitle>Authentication Failed</AlertTitle>
          <AlertDescription>
            The OBS authentication token is invalid or expired. Please generate a new OBS link in the StreamDonate dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If in OBS mode and still loading authentication, show a loading state
  if (isOBSMode && authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-transparent">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
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
    
    console.log("LiveAlertsPage: Using alert style in OBS mode:", alertStyle);
    
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
              <p className="font-medium">Secure URL for OBS Browser Source:</p>
              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={user ? "Loading secure OBS URL..." : "Please sign in"}
                  className="flex-1 bg-background px-3 py-2 text-sm border rounded-l-md"
                />
                <button 
                  className="bg-primary text-white px-3 py-2 rounded-r-md hover:bg-primary/90 disabled:opacity-50"
                  onClick={async () => {
                    const url = await getOBSUrl();
                    if (url) {
                      navigator.clipboard.writeText(url);
                      toast("Copied!", {
                        description: "Secure OBS URL copied to clipboard"
                      });
                    } else {
                      toast("Error", {
                        description: "Could not generate URL. Please try again."
                      });
                    }
                  }}
                  disabled={!user}
                >
                  Generate & Copy
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                This secure URL contains a unique token that allows OBS to display your alerts without requiring login
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-medium">Instructions:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>In OBS Studio, add a new "Browser" source</li>
                <li>Click "Generate & Copy" and paste the URL into the URL field</li>
                <li>Set the width to 1280 and height to 720</li>
                <li>Enable "Refresh browser when scene becomes active"</li>
                <li>Click OK to save</li>
              </ol>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
              <h3 className="font-medium mb-1">Security Note</h3>
              <p className="text-sm">
                The OBS URL contains a secure token that is tied to your account. Keep this URL private and regenerate it
                if you suspect it has been compromised.
              </p>
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
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-start space-x-2">
                <RefreshCw className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-800">Authentication Issues?</h3>
                  <p className="text-sm text-blue-600 mb-2">
                    If your OBS is showing authentication errors, go to the Setup page and click "Regenerate New Token".
                    This will create a new token and invalidate the old one.
                  </p>
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
              key={donation.id}
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
