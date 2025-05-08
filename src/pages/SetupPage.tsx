
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
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { sendTestAlert, getOBSUrl, checkUserHasToken, regenerateOBSToken } from "@/utils/obsUtils";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SetupPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [upiId, setUpiId] = useState("");
  const [upiIdError, setUpiIdError] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "success" | "error">("unknown");
  const [obsUrl, setObsUrl] = useState<string>("");
  const [isGeneratingUrl, setIsGeneratingUrl] = useState(false);
  const [hasExistingToken, setHasExistingToken] = useState(false);
  const [tokenGenerationRetries, setTokenGenerationRetries] = useState(0);
  const [regenerationStatus, setRegenerationStatus] = useState<"idle" | "success" | "error">("idle");
  const MAX_RETRIES = 2;
  
  // Enhanced token check and OBS URL generation with retries
  useEffect(() => {
    const checkTokenAndGetUrl = async () => {
      if (!user) return;
      
      setIsGeneratingUrl(true);
      try {
        // First check if user has an existing token
        const { hasToken } = await checkUserHasToken();
        setHasExistingToken(hasToken);
        
        // Get or generate the OBS URL
        let url = await getOBSUrl();
        
        // If URL generation failed but we have a token, try regenerating
        if (!url && hasToken) {
          console.log("Initial URL generation failed, trying forced regeneration");
          url = await getOBSUrl(true);
          
          if (url) {
            setTokenGenerationRetries(prev => prev + 1);
            toast({
              title: "Token Regenerated",
              description: "Previous token may have been invalid. New URL has been generated.",
            });
          }
        }
        
        // Set the URL if we have one
        if (url) {
          setObsUrl(url);
        } else {
          console.error("Failed to generate OBS URL after retries");
          toast({
            title: "Token Generation Issue",
            description: "Could not generate a valid token. Please try the 'Regenerate New Token' button.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error generating OBS URL:", error);
        toast({
          title: "Error",
          description: "Could not connect to the server. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsGeneratingUrl(false);
      }
    };
    
    if (user) {
      checkTokenAndGetUrl();
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

  // Function to generate/regenerate the OBS URL with enhanced reliability
  const generateObsUrl = async (forceRegenerateToken = false) => {
    setIsGeneratingUrl(true);
    try {
      let url = await getOBSUrl(forceRegenerateToken);
      
      // If URL generation failed and we haven't exceeded retry limit
      if (!url && tokenGenerationRetries < MAX_RETRIES) {
        console.log(`URL generation failed, retrying (attempt ${tokenGenerationRetries + 1})`);
        
        // Force token regeneration on retry
        url = await getOBSUrl(true);
        setTokenGenerationRetries(prev => prev + 1);
      }
      
      if (url) {
        setObsUrl(url);
        setHasExistingToken(true);
        toast({
          title: forceRegenerateToken ? "URL Regenerated" : "URL Generated",
          description: forceRegenerateToken 
            ? "New secure OBS Browser Source URL has been created. Previous URL is no longer valid."
            : "Secure OBS Browser Source URL has been created.",
        });
      } else {
        // Suggest manual token regeneration if retries failed
        toast({
          title: "URL Generation Failed",
          description: "Please try clicking the 'Regenerate New Token' button to create a fresh token.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating OBS URL:", error);
      toast({
        title: "Error",
        description: "Could not generate URL. Server may be unavailable.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingUrl(false);
    }
  };

  // Direct function for token regeneration with enhanced feedback
  const handleForceTokenRegeneration = async () => {
    setIsGeneratingUrl(true);
    setRegenerationStatus("idle");
    
    try {
      // First directly regenerate the token
      const { token, error } = await regenerateOBSToken();
      
      if (error || !token) {
        console.error("Error during forced token regeneration:", error);
        setRegenerationStatus("error");
        toast({
          title: "Token Regeneration Failed",
          description: "Could not create new token. Please try again later.",
          variant: "destructive",
        });
        return;
      }
      
      // Now get a URL with the new token
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const timestamp = new Date().getTime();
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/live-alerts?obs=true&token=${token}&t=${timestamp}&uid=${uniqueId}`;
      
      setObsUrl(url);
      setHasExistingToken(true);
      setRegenerationStatus("success");
      
      toast({
        title: "Token Successfully Regenerated",
        description: "New OBS URL created. Update this in your OBS browser source and refresh the cache.",
      });
      
    } catch (error) {
      console.error("Exception during forced token regeneration:", error);
      setRegenerationStatus("error");
      toast({
        title: "Unexpected Error",
        description: "Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingUrl(false);
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

        {/* Step 2: Generate Links */}
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
                    <Label htmlFor="obs-url">Secure OBS Browser Source URL</Label>
                    <div className="flex">
                      <Input
                        id="obs-url"
                        value={obsUrl || "Click Generate to create a secure URL"}
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
                              description: "Generate a URL first before copying.",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={!obsUrl || isGeneratingUrl}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="ml-1"
                        onClick={() => generateObsUrl(false)}
                        disabled={isGeneratingUrl || hasExistingToken}
                        title={hasExistingToken ? "You already have a token" : "Generate Secure URL"}
                      >
                        {isGeneratingUrl ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileUp className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This secure URL contains a unique token that allows OBS to display your alerts without requiring login
                    </p>
                  </div>

                  {/* Enhanced troubleshooting information */}
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <h3 className="font-medium text-yellow-800">Important: OBS Settings</h3>
                    </div>
                    <ul className="text-sm text-yellow-700 mt-2 space-y-1 ml-6 list-disc">
                      <li><strong>Always enable "Refresh browser when scene becomes active"</strong> in OBS browser source settings</li>
                      <li>Set width to 1280 and height to 720</li>
                      <li>If you see authentication errors, use the "Regenerate New Token" button below</li>
                    </ul>
                  </div>

                  {/* Show success/error alerts for token regeneration */}
                  {regenerationStatus === "success" && (
                    <Alert variant="default" className="bg-green-50 border-green-200">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <AlertTitle className="text-green-800">Token Regenerated Successfully</AlertTitle>
                      <AlertDescription className="text-green-700">
                        Your OBS token has been updated. Copy the new URL above and update it in your OBS browser source.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {regenerationStatus === "error" && (
                    <Alert variant="destructive">
                      <XCircle className="h-5 w-5" />
                      <AlertTitle>Regeneration Failed</AlertTitle>
                      <AlertDescription>
                        Could not regenerate token. Please try again in a few moments.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Enhanced token regeneration section */}
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-md">
                    <div className="flex items-start space-x-2">
                      <RefreshCw className="h-5 w-5 text-rose-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-rose-800">Regenerate Token</h3>
                        <p className="text-sm text-rose-600 mb-2">
                          Having authentication issues? Generate a new token to replace the existing one.
                          <strong> This will invalidate previous links.</strong>
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700"
                          onClick={handleForceTokenRegeneration}
                          disabled={isGeneratingUrl}
                        >
                          {isGeneratingUrl ? (
                            <><RefreshCw className="mr-1 h-3 w-3 animate-spin" /> Regenerating...</>
                          ) : (
                            <>Regenerate New Token</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold">How to add to OBS:</h4>
                    <ol className="space-y-2 mt-2 list-decimal list-inside text-sm">
                      <li>In OBS, add a new "Browser Source"</li>
                      <li>Generate and copy the URL above, then paste it into the URL field</li>
                      <li>Set width to 1280 and height to 720</li>
                      <li><strong className="text-primary">Check "Refresh browser when scene becomes active"</strong></li>
                      <li>Click "Refresh cache of current page" if you regenerate the token</li>
                    </ol>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
                    <h4 className="font-medium mb-1">Troubleshooting</h4>
                    <p className="text-sm">
                      If you still see authentication errors after regenerating:
                    </p>
                    <ul className="list-disc list-inside text-sm mt-1">
                      <li>Clear your browser cache</li>
                      <li>Try completely removing and re-adding the browser source in OBS</li>
                      <li>Make sure you've updated the URL in OBS after regenerating the token</li>
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>
              <Button onClick={handleNextStep}>
                Continue to Connection Test
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Connection Test */}
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

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start space-x-2">
                  <RefreshCw className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-800">Troubleshooting</h3>
                    <p className="text-sm text-blue-600 mb-2">
                      If your OBS is showing authentication errors, try these steps:
                    </p>
                    <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                      <li>Go back to the "Generate Links" step and click "Regenerate New Token"</li>
                      <li>Copy the new URL and update it in your OBS Browser Source</li>
                      <li>Make sure to check "Refresh browser when scene becomes active" in OBS</li>
                      <li>Sometimes you need to completely remove and re-add the Browser Source in OBS</li>
                      <li>Try clearing your browser cache if you're still having issues</li>
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
