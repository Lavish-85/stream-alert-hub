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
  FileUp,
  QrCode,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { sendTestAlert, getOBSUrl } from "@/utils/obsUtils";
import { useAuth } from "@/contexts/AuthContext";

const SetupPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [upiId, setUpiId] = useState("");
  const [upiIdError, setUpiIdError] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "success" | "error">("unknown");
  const [obsUrl, setObsUrl] = useState<string>("");
  
  // Fetch the OBS URL on component mount
  useEffect(() => {
    const fetchObsUrl = async () => {
      if (!user) return;
      
      const url = await getOBSUrl();
      if (url) {
        setObsUrl(url);
      } else {
        // Fallback if getOBSUrl fails
        setObsUrl(`${window.location.origin}/live-alerts?obs=true&user_id=${user.id}&t=${new Date().getTime()}`);
      }
    };
    
    if (user) {
      fetchObsUrl();
    }
  }, [user]);

  const validateUpiId = () => {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z]+$/;
    if (!upiId) {
      setUpiIdError("UPI VPA is required");
      return false;
    }
    if (!regex.test(upiId)) {
      setUpiIdError("Invalid UPI VPA format (e.g. username@upi)");
      return false;
    }
    setUpiIdError("");
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!validateUpiId()) return;
      // Skip to step 3 (previously step 2 was KYC)
      setCurrentStep(2);
    } else {
      setCurrentStep(currentStep + 1);
    }
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

  // Function to refresh the OBS URL
  const refreshObsUrl = async () => {
    try {
      const url = await getOBSUrl();
      if (url) {
        setObsUrl(url);
        toast({
          title: "URL Refreshed",
          description: "OBS Browser Source URL has been updated.",
        });
      } else {
        // Fallback if getOBSUrl fails
        const fallbackUrl = `${window.location.origin}/live-alerts?obs=true&user_id=${user?.id}&t=${new Date().getTime()}`;
        setObsUrl(fallbackUrl);
        toast({
          title: "URL Refreshed",
          description: "OBS Browser Source URL has been updated (fallback method).",
        });
      }
    } catch (error) {
      console.error("Error refreshing OBS URL:", error);
      toast({
        title: "Error",
        description: "Could not refresh OBS URL. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Setup your donation page</h1>
      <p className="text-muted-foreground mb-6">
        Complete the following steps to start accepting donations on your streams
      </p>
      
      <div className="mb-8">
        <Progress value={(currentStep / 3) * 100} className="h-2" />
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>UPI Setup</span>
          <span>Generate Links</span>
          <span>Test</span>
        </div>
      </div>

      <div className="space-y-8">
        {/* Step 1: UPI Setup */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Enter your UPI VPA</CardTitle>
              <CardDescription>
                We'll use this to generate payment links and QR codes for your viewers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upi-id">UPI Virtual Payment Address</Label>
                <Input
                  id="upi-id"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className={upiIdError ? "border-red-400" : ""}
                />
                {upiIdError && (
                  <p className="text-sm font-medium text-red-500">{upiIdError}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Example: yourname@paytm, yourname@ybl, yourname@okicici
                </p>
              </div>
              <Button onClick={handleNextStep} className="w-full sm:w-auto">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Generate Links (previously Step 3) */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Integration Links</CardTitle>
              <CardDescription>
                Use these to accept payments and display alerts on your stream
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="qr-code" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="qr-code">QR Code</TabsTrigger>
                  <TabsTrigger value="obs-link">OBS Browser Source</TabsTrigger>
                </TabsList>
                <TabsContent value="qr-code" className="space-y-4 pt-4">
                  <div className="mx-auto w-48 h-48 bg-white p-2 border">
                    <div className="w-full h-full flex items-center justify-center bg-muted/20">
                      <QrCode className="w-24 h-24 text-black" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-link">Payment Link</Label>
                    <div className="flex">
                      <Input
                        id="payment-link"
                        value={`upi://pay?pa=${upiId}&pn=StreamDonate&cu=INR`}
                        readOnly
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="ml-2"
                        onClick={() => handleCopy(
                          `upi://pay?pa=${upiId}&pn=StreamDonate&cu=INR`,
                          "Payment link copied to clipboard"
                        )}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Share this link or QR code with your viewers to accept donations
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="obs-link" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="obs-url">OBS Browser Source URL</Label>
                    <div className="flex">
                      <Input
                        id="obs-url"
                        value={obsUrl || "Loading..."}
                        readOnly
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
                              description: "URL not available yet. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="ml-1"
                        onClick={refreshObsUrl}
                        title="Refresh URL"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This URL includes your user ID and a timestamp parameter to ensure alerts are displayed correctly
                    </p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold">How to add to OBS:</h4>
                    <ol className="space-y-2 mt-2 list-decimal list-inside text-sm">
                      <li>In OBS, add a new "Browser Source"</li>
                      <li>Paste the URL above into the URL field</li>
                      <li>Set width to 1280 and height to 720</li>
                      <li>Check "Refresh browser when scene becomes active"</li>
                    </ol>
                  </div>
                </TabsContent>
              </Tabs>
              <Button onClick={handleNextStep}>
                Continue to Connection Test
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Connection Test (previously Step 4) */}
        {currentStep === 3 && (
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
                  <li>Share your UPI link or QR code with viewers</li>
                  <li>Customize your alert appearance in the "Alerts" tab</li>
                  <li>Track donations in the "Analytics" tab</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SetupPage;
