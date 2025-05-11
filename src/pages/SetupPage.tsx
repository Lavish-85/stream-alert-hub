
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  ExternalLink,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { sendTestAlert, getWebSocketUrl } from "@/utils/obsUtils";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import DonationLinkCard from "@/components/donation/DonationLinkCard";
import { Link } from "react-router-dom";

const SetupPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "success" | "error">("unknown");
  const [obsUrl, setObsUrl] = useState<string>("");
  const [wsConnectionStatus, setWsConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [wsRef, setWsRef] = useState<WebSocket | null>(null);
  const [donationPageUrl, setDonationPageUrl] = useState<string>("");

  useEffect(() => {
    // Generate OBS URL when user is available
    if (user) {
      const url = `${window.location.origin}/live-alerts?obs=true&channel=${user.id}`;
      setObsUrl(url);
      
      // Set donation page URL
      setDonationPageUrl(`${window.location.origin}/donate/${user.id}`);
      
      // Test WebSocket connection
      testWebSocketConnection(user.id);
    }
    
    return () => {
      // Close WebSocket connection when component unmounts
      if (wsRef) {
        wsRef.close();
      }
    };
  }, [user]);
  
  // Test WebSocket connection to verify edge function is working
  const testWebSocketConnection = (channelId: string) => {
    try {
      setWsConnectionStatus("connecting");
      
      // Close existing connection if any
      if (wsRef) {
        wsRef.close();
      }
      
      // Create WebSocket connection using the helper
      const wsUrl = getWebSocketUrl(channelId);
      console.log("Testing WebSocket connection:", wsUrl);
      
      const socket = new WebSocket(wsUrl);
      setWsRef(socket);
      
      socket.onopen = async () => {
        console.log("WebSocket connected");
        setWsConnectionStatus("connected");
        
        // Send hello message to test connection
        socket.send(JSON.stringify({ 
          type: "hello", 
          channel: channelId,
          mode: "consumer"
        }));
        
        // Keep connection active for testing but close after a while
        setTimeout(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.close();
          }
        }, 10000); // Keep open longer for testing
      };
      
      socket.onmessage = (event) => {
        console.log("WebSocket test message received:", event.data);
        try {
          const data = JSON.parse(event.data);
          if (data.type === "welcome") {
            toast({
              title: "WebSocket Connected",
              description: "Successfully connected to the alert system.",
            });
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };
      
      socket.onclose = () => {
        console.log("WebSocket test connection closed");
        // Only change status if explicitly disconnected, not on normal close
        if (wsConnectionStatus === "connecting") {
          setWsConnectionStatus("disconnected");
        }
      };
      
      socket.onerror = (error) => {
        console.error("WebSocket test connection error:", error);
        setWsConnectionStatus("disconnected");
        toast({
          title: "Connection Error",
          description: "Could not connect to WebSocket server. Please try again later.",
          variant: "destructive",
        });
      };
    } catch (error) {
      console.error("Error testing WebSocket connection:", error);
      setWsConnectionStatus("disconnected");
      toast({
        title: "Connection Error",
        description: "Could not connect to WebSocket server. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleNextStep = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleCopy = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: message,
    });
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus("unknown");
    
    try {
      // Send a test alert through Supabase
      const { error } = await sendTestAlert();
      
      if (error) {
        console.error("Test alert error:", error);
        setConnectionStatus("error");
        toast({
          title: "Connection failed",
          description: "Could not send test alert. Please check your setup.",
          variant: "destructive",
        });
      } else {
        setConnectionStatus("success");
        toast({
          title: "Connection successful!",
          description: "Your OBS browser source is ready to receive alerts.",
        });
      }
    } catch (err) {
      console.error("Test connection error:", err);
      setConnectionStatus("error");
      toast({
        title: "Connection failed",
        description: "Could not send test alert. Please check your setup.",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const openDonationPage = () => {
    if (!user?.id) {
      toast({
        title: "Not available",
        description: "You need to be logged in to preview the donation page.",
        variant: "destructive",
      });
      return;
    }
    
    window.open(donationPageUrl, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Setup your donation page</h1>
      <p className="text-muted-foreground mb-6">
        Complete the following steps to start accepting donations on your streams
      </p>
      
      <div className="mb-8">
        <Progress value={(currentStep / 2) * 100} className="h-2" />
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>Generate Links</span>
          <span>Test</span>
        </div>
      </div>

      <div className="space-y-8">
        {/* Step 1: Generate Links */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Integration Links</span>
                {wsConnectionStatus === "connected" && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 flex items-center gap-1 border-green-200">
                    <Wifi className="h-3 w-3" /> WebSocket Connected
                  </Badge>
                )}
                {wsConnectionStatus === "connecting" && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 flex items-center gap-1 border-yellow-200">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Connecting...
                  </Badge>
                )}
                {wsConnectionStatus === "disconnected" && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 flex items-center gap-1 border-red-200">
                    <WifiOff className="h-3 w-3" /> Disconnected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Use these to accept payments and display alerts on your stream
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="donation-page" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="donation-page">Donation Page</TabsTrigger>
                  <TabsTrigger value="obs-link">OBS Browser Source</TabsTrigger>
                </TabsList>
                
                <TabsContent value="donation-page" className="space-y-4 pt-4">
                  <Alert variant="default" className="bg-blue-50 border-blue-200">
                    <ExternalLink className="h-5 w-5 text-blue-600" />
                    <AlertTitle className="text-blue-800">Web Donation Page</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      Share this donation page with your viewers for a seamless donation experience directly through a web browser.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="donation-page-url">Donation Page URL:</Label>
                    <div className="flex">
                      <Input
                        id="donation-page-url"
                        value={donationPageUrl || "Loading..."}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="ml-2"
                        onClick={() => {
                          if (donationPageUrl) {
                            handleCopy(donationPageUrl, "Donation page URL copied to clipboard");
                          } else {
                            toast({
                              title: "Error",
                              description: "URL not available yet. Please wait.",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={!donationPageUrl}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This URL directs your viewers to a customized donation page where they can easily contribute
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={openDonationPage}
                      disabled={!user?.id}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Preview Donation Page
                    </Button>
                    
                    <Link to="/donation-customize">
                      <Button 
                        variant="outline"
                        className="flex-1"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Customize Donation Page
                      </Button>
                    </Link>
                  </div>
                  
                  {/* Show example of the donation page as a card or image */}
                  {user?.id && (
                    <div className="mt-6 border rounded-lg p-4">
                      <h3 className="font-medium mb-2">Donation Page Preview</h3>
                      <DonationLinkCard userId={user.id} />
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="obs-link" className="space-y-4 pt-4">
                  <Alert variant="default" className="bg-blue-50 border-blue-200">
                    <Wifi className="h-5 w-5 text-blue-600" />
                    <AlertTitle className="text-blue-800">WebSocket Connection System</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      We've upgraded to a more reliable WebSocket-based alert system. Copy and use the URL below in your OBS browser source.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="obs-url">OBS Browser Source URL:</Label>
                    <div className="flex">
                      <Input
                        id="obs-url"
                        value={obsUrl || "Loading..."}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="ml-2"
                        onClick={() => {
                          if (obsUrl) {
                            handleCopy(obsUrl, "OBS URL copied to clipboard");
                          } else {
                            toast({
                              title: "Error",
                              description: "URL not available yet. Please wait.",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={!obsUrl}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This URL connects to our WebSocket server for reliable real-time alerts
                    </p>
                  </div>

                  {/* Instructions */}
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <h3 className="font-medium text-yellow-800">Important: OBS Settings</h3>
                    </div>
                    <ul className="text-sm text-yellow-700 mt-2 space-y-1 ml-6 list-disc">
                      <li><strong>Always enable "Refresh browser when scene becomes active"</strong> in OBS browser source settings</li>
                      <li>Set width to 1280 and height to 720</li>
                      <li>Clear browser cache if you experience connection issues</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold">How to add to OBS:</h4>
                    <ol className="space-y-2 mt-2 list-decimal list-inside text-sm">
                      <li>In OBS, add a new "Browser Source"</li>
                      <li>Copy and paste the URL above into the URL field</li>
                      <li>Set width to 1280 and height to 720</li>
                      <li><strong className="text-primary">Check "Refresh browser when scene becomes active"</strong></li>
                      <li>Click OK to save</li>
                    </ol>
                  </div>
                  
                  {wsConnectionStatus !== "connected" && (
                    <Button 
                      onClick={() => user && testWebSocketConnection(user.id)}
                      variant="outline"
                      className="w-full"
                      disabled={!user || wsConnectionStatus === "connecting"}
                    >
                      {wsConnectionStatus === "connecting" ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Test WebSocket Connection
                        </>
                      )}
                    </Button>
                  )}
                </TabsContent>
              </Tabs>
              <Button onClick={handleNextStep}>
                Continue to Connection Test
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Connection Test */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Connection Test</CardTitle>
              <CardDescription>
                Verify your OBS browser source is working correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border rounded-lg p-6 flex flex-col items-center">
                <div className="mb-4">
                  {connectionStatus === "unknown" ? (
                    <div className="w-16 h-16 rounded-full border-4 border-muted flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-muted-foreground/10"></div>
                    </div>
                  ) : connectionStatus === "success" ? (
                    <CheckCircle2 className="w-16 h-16 text-green-500" />
                  ) : (
                    <XCircle className="w-16 h-16 text-red-500" />
                  )}
                </div>
                <h3 className="text-lg font-medium mb-2">
                  {connectionStatus === "unknown"
                    ? "Test your connection"
                    : connectionStatus === "success"
                    ? "Connection successful!"
                    : "Connection failed"}
                </h3>
                <p className="text-sm text-center text-muted-foreground mb-4">
                  {connectionStatus === "unknown"
                    ? "This will send a test alert to your OBS browser source"
                    : connectionStatus === "success"
                    ? "Your OBS browser source is correctly configured"
                    : "Unable to connect to your OBS browser source"}
                </p>
                <Button
                  onClick={testConnection}
                  disabled={isTestingConnection}
                  variant={connectionStatus === "success" ? "outline" : "default"}
                  className={cn(
                    connectionStatus === "success" && "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                  )}
                >
                  {isTestingConnection ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : connectionStatus === "success" ? (
                    "Send Another Test Alert"
                  ) : connectionStatus === "error" ? (
                    "Try Again"
                  ) : (
                    "Test Connection"
                  )}
                </Button>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold">Next Steps:</h4>
                <ul className="space-y-2 mt-2 list-disc list-inside text-sm">
                  <li>Share your donation page URL with viewers</li>
                  <li>Customize your alert appearance in the "Alerts" tab</li>
                  <li>Track donations in the "Analytics" tab</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start space-x-2">
                  <RefreshCw className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-800">Troubleshooting</h3>
                    <p className="text-sm text-blue-600 mb-2">
                      If you're experiencing issues with your OBS alerts, try these steps:
                    </p>
                    <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                      <li>Make sure the WebSocket connection is established (check for "WebSocket Connected" badge)</li>
                      <li>In OBS, right-click your browser source and select "Refresh cache of current page"</li>
                      <li>Make sure "Refresh browser when scene becomes active" is checked</li>
                      <li>Try completely removing and re-adding the browser source in OBS</li>
                      <li>Verify that your internet connection is stable</li>
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SetupPage;
