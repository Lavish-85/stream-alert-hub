
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getOBSUrl, testRealtimeConnection, monitorWebhookConnection } from "@/utils/obsUtils";
import { Check, Copy, RefreshCw, Loader2, Activity, AlertCircle, Wifi, WifiOff, Bug } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { obsWebhookConfig, WEBHOOK_DEBUG, runWebhookDiagnostics } from "@/config/webhookConfig";
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
    diagnostics?: any;
  }>({
    isConnected: false
  });
  const [debugLogs, setDebugLogs] = useState<Array<{timestamp: Date, message: string, type: string}>>([]);
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);
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
      // Perform a full diagnostic test
      const diagnostics = await runWebhookDiagnostics(user.id);
      setDiagnosticsResult(diagnostics);
      
      addDebugLog(`Webhook diagnostics completed. Status: ${diagnostics.overallStatus}`, 
        diagnostics.overallStatus === 'HEALTHY' ? "success" : "warning");
      
      // Log the detailed results
      addDebugLog(`URL test: ${diagnostics.urlTest.message}`, 
        diagnostics.urlTest.success ? "success" : "error");
      
      // Also check realtime connection
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
      
      // Summary message
      if (diagnostics.overallStatus === 'HEALTHY' && isConnected) {
        toast.success("All connection tests passed! Your webhooks are working properly.");
      } else if (diagnostics.overallStatus === 'HEALTHY' && !isConnected) {
        toast.warning("URL tests passed but realtime connection failed. Check network settings.");
      } else {
        toast.error("Some connection tests failed. See debug console for details.");
      }
      
    } catch (error: any) {
      console.error("Error testing connections:", error);
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
                  
                  {/* Show diagnostics result if available */}
                  {diagnosticsResult && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <h5 className="font-medium text-xs mb-1">Diagnostics Result:</h5>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center">
                          <span className="font-semibold mr-1">Status:</span>
                          <Badge 
                            variant={diagnosticsResult.overallStatus === 'HEALTHY' ? 'default' : 'destructive'}
                            className="text-xs h-5"
                          >
                            {diagnosticsResult.overallStatus}
                          </Badge>
                        </div>
                        <div>
                          <span className="font-semibold">Time:</span> {new Date(diagnosticsResult.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="flex items-center">
                          <span className="font-semibold mr-1">URL Test:</span>
                          {diagnosticsResult.urlTest.success ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold">Protocol:</span> {diagnosticsResult.environment.protocol}
                        </div>
                      </div>
                    </div>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Connection Status</h3>
                  <div className="p-3 bg-muted rounded-md space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Realtime Connection:</span>
                      {connectionStatus.isConnected ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Wifi className="mr-1 h-3 w-3" /> Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <WifiOff className="mr-1 h-3 w-3" /> Disconnected
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Last Check:</span>
                      <span className="text-sm text-muted-foreground">
                        {connectionStatus.lastChecked ? 
                          connectionStatus.lastChecked.toLocaleTimeString() : 
                          'Not checked yet'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Debug Mode:</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {WEBHOOK_DEBUG ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Test Webhook</h3>
                  <div className="p-3 bg-muted rounded-md space-y-3">
                    <Button 
                      onClick={handleTestConnection}
                      disabled={isTestingConnection || !user?.id}
                      className="w-full flex items-center gap-2"
                    >
                      {isTestingConnection ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Running Test...
                        </>
                      ) : (
                        <>
                          <Bug className="h-4 w-4" />
                          Run Full Diagnostics
                        </>
                      )}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground">
                      This will test both the URL reachability and the realtime connection
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Diagnostics result display */}
              {diagnosticsResult && (
                <div className="my-4 p-3 bg-muted/50 border rounded-md">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Diagnostics Result
                  </h3>
                  
                  <div className="text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Overall Status:</span>
                      <Badge 
                        variant={diagnosticsResult.overallStatus === 'HEALTHY' ? 'default' : 'destructive'}
                        className="capitalize"
                      >
                        {diagnosticsResult.overallStatus}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">URL Test:</span>
                      <span className={diagnosticsResult.urlTest.success ? 
                        "text-green-600 dark:text-green-400" : 
                        "text-red-600 dark:text-red-400"
                      }>
                        {diagnosticsResult.urlTest.message}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Protocol:</span>
                      <code className="bg-muted-foreground/20 px-1 rounded">
                        {diagnosticsResult.environment.protocol}
                      </code>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Browser:</span>
                      <span className="truncate max-w-[200px]" title={diagnosticsResult.environment.userAgent}>
                        {diagnosticsResult.environment.userAgent.split(' ')[0]}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Timestamp:</span>
                      <span>{new Date(diagnosticsResult.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-muted p-4 rounded-md h-[400px] overflow-y-auto font-mono text-sm mt-4">
                {debugLogs.length > 0 ? (
                  debugLogs.map((log, i) => (
                    <div 
                      key={i} 
                      className={`mb-1 ${
                        log.type === 'error' ? 'text-red-500' :
                        log.type === 'success' ? 'text-green-500' :
                        log.type === 'warning' ? 'text-yellow-500' :
                        'text-muted-foreground'
                      }`}
                    >
                      [{log.timestamp.toLocaleTimeString()}] {log.message}
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-center py-20">
                    No logs yet. Run a connection test to generate logs.
                  </div>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                Tip: You can also check your browser's Developer Console (F12) for more detailed webhook logs
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SetupPage;
