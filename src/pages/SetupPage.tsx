import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getOBSUrl, testRealtimeConnection } from "@/utils/obsUtils";
import { Check, Copy, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const SetupPage = () => {
  const [obsURL, setObsURL] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
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
    };

    generateAndCheckToken();
  }, [user?.id]);

  const handleTestConnection = async () => {
    if (!user?.id) {
      toast.error("Please sign in to test the connection.");
      return;
    }

    setIsTestingConnection(true);
    try {
      const isConnected = await testRealtimeConnection(user.id);
      if (isConnected) {
        toast.success("Realtime connection test successful!");
      } else {
        toast.error("Realtime connection test failed. Check your internet connection and try again.");
      }
    } catch (error: any) {
      console.error("Error testing realtime connection:", error);
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
      toast.success("OBS URL copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy OBS URL:", error);
      toast.error("Failed to copy OBS URL to clipboard.");
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Setup Instructions</h1>

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
              "Test Realtime Connection"
            )}
          </Button>
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
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupPage;
