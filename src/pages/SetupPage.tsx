
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getOBSUrl, testRealtimeConnection, monitorWebhookConnection } from "@/utils/obsUtils";
import { Check, Copy, RefreshCw, Loader2, Activity, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { obsWebhookConfig, WEBHOOK_DEBUG } from "@/config/webhookConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SetupPage = () => {
  const [obsURL, setObsURL] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    isConnected: boolean;
    lastChecked?: Date;
    uptime?: number;
  }>({
    isConnected: false
  });
  const [debugLogs, setDebugLogs] = useState<Array<{timestamp: Date, message: string, type: string}>>([]);
  const { user } = useAuth();

  useEffect(() => {
    const generateAndCheckToken = async () => {
      if (!user?.id) return;

      // Generate OBS URL
      const url = await getOBSUrl();
      setObsURL(url);

      // Check if user has a valid token
      const { hasToken } = await supabase.auth.getUser()
        .then(() => ({ hasToken: true }))
        .catch(() => ({ hasToken: false }));
      setIsTokenValid(hasToken);
      
      // Add debug log
      if (WEBHOOK_DEBUG) {
        addDebugLog("Generated OBS URL: " + url, "info");
        addDebugLog("User token status: " + (hasToken ? "Valid" : "Invalid"), hasToken ? "success" : "error");
      }
    };

    generateAndCheckToken();
  }, [user?.id]);

  // Add a debug log entry
  const addDebugLog = (message: string, type: string = "info") => {
    setDebugLogs(prev => [...prev, {
      timestamp: new Date(),
      message,
      type
    }]);
  };

  const handleTestConnection = async () => {
    if (!user?.id) {
      toast.error("Please sign in to test the connection.");
      return;
    }

    setIsTestingConnection(true);
    addDebugLog("Starting connection test...", "info");
    
    try {
      const isConnected = await testRealtimeConnection(user.id);
      if (isConnected) {
        addDebugLog("Realtime connection test successful!", "success");
        toast.success("Realtime connection test successful!");
      } else {
        addDebugLog("Realtime connection test failed", "error");
        toast.error("Realtime connection test failed. Check your internet connection and try again.");
      }
      
      // Also check webhook monitoring
      const status = await monitorWebhookConnection(user.id);
      setConnectionStatus(status);
      
      addDebugLog("Webhook connection status: " + (status.isConnected ? "Connected" : "Disconnected"), 
        status.isConnected ? "success" : "error");
      
    } catch (error: any) {
      console.error("Error testing realtime connection:", error);
      addDebugLog(`Connection test error: ${error.message || "Unknown error"}`, "error");
      toast.error(`Failed to test connection: ${error.message || "Unknown error"}`);
    } finally {
      setIsTestingConnection(false);
    };
  };

  const handleCopyClick = async () => {
    if (!obsURL) {
      toast.error("OBS URL not available. Please try again.");
      return;
    }

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(obsURL);
      addDebugLog("OBS URL copied to clipboard", "success");
      toast.success("OBS URL copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy OBS URL:", error);
      addDebugLog("Failed to copy OBS URL", "error");
      toast.error("Failed to copy OBS URL to clipboard.");
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Setup Instructions</h1>

      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="debug">Debug Console</TabsTrigger>
        </TabsList>
        
        <TabsContent value="setup">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>1. Configure OBS Browser Source</CardTitle>
              <CardDescription>
                Add a browser source to OBS Studio with the following settings:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">OBS Browser Source URL:</p>
                <div className="flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={obsURL || "Loading..."}
                    className="flex-1 bg-gray-100 dark:bg-gray-800 text-sm border rounded-l-md px-3 py-2"
                  />
                  <Button
                    variant="outline"
                    className="rounded-r-md"
                    onClick={handleCopyClick}
                    disabled={!obsURL || isCopying}
                  >
                    {isCopying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Copying...
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy URL
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Copy this URL and paste it into the URL field of your OBS browser source.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Recommended OBS Settings:</p>
                <ul className="list-disc list-inside text-sm">
                  <li>Width: 1920</li>
                  <li>Height: 1080</li>
                  <li>
                    <strong className="font-semibold">Enable "Refresh browser when scene becomes active"</strong>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>2. Test Realtime Connection</CardTitle>
              <CardDescription>
                Verify that your OBS browser source is receiving live updates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleTestConnection}
                disabled={isTestingConnection || !user?.id}
                className="w-full"
              >
                {isTestingConnection ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <Activity className="mr-2 h-4 w-4" />
                    Test Webhook Connection
                  </>
                )}
              </Button>
              
              {connectionStatus.lastChecked && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <h4 className="font-medium text-sm flex items-center">
                    Connection Status:
                    {connectionStatus.isConnected ? (
                      <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                        <Check className="mr-1 h-3 w-3" /> Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-200">
                        <AlertCircle className="mr-1 h-3 w-3" /> Disconnected
                      </Badge>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last checked: {connectionStatus.lastChecked?.toLocaleTimeString()}
                  </p>
                  {connectionStatus.uptime !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      Connection uptime: {connectionStatus.uptime}%
                    </p>
                  )}
                </div>
              )}
            </CardContent>
            {isTokenValid !== null && (
              <CardFooter className="justify-between">
                <p className="text-sm">Realtime Status:</p>
                {isTokenValid ? (
                  <Badge variant="outline">
                    <Check className="mr-2 h-4 w-4" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    Disconnected
                  </Badge>
                )}
              </CardFooter>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTitle>No Alerts Showing?</AlertTitle>
                <AlertDescription>
                  If you are not seeing alerts in your OBS browser source, try the following:
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Make sure the OBS browser source URL is correct.</li>
                    <li>
                      In OBS, right-click your browser source and select "Refresh cache of current page".
                    </li>
                    <li>
                      Ensure that the "Refresh browser when scene becomes active" option is enabled in your
                      OBS browser source properties.
                    </li>
                    <li>Check your internet connection.</li>
                    <li>Check the Debug Console tab for detailed connection logs.</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="debug">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Webhook Debug Console</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDebugLogs([])}
                >
                  Clear Logs
                </Button>
              </CardTitle>
              <CardDescription>
                View detailed logs about webhook connections and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-md h-[400px] overflow-y-auto font-mono text-sm">
                {debugLogs.length > 0 ? (
                  debugLogs.map((log, i) => (
                    <div 
                      key={i} 
                      className={`mb-1 ${
                        log.type === 'error' ? 'text-red-500' :
                        log.type === 'success' ? 'text-green-500' :
                        'text-muted-foreground'
                      }`}
                    >
                      [{log.timestamp.toLocaleTimeString()}] {log.message}
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-center py-20">
                    No logs yet. Test the connection to generate logs.
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <Button 
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running Test...
                    </>
                  ) : (
                    "Run Connection Test"
                  )}
                </Button>
                
                <p className="text-xs text-muted-foreground mt-2">
                  When enabled, webhook debug logs will also appear in your browser's Developer Console (F12)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SetupPage;
