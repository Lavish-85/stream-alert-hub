import React, { useState } from "react";
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
import { getOBSUrl, copyToClipboard } from "@/utils/obsUtils";
import { toast } from "@/components/ui/sonner";

const SetupPage = () => {
  const { toast: hookToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [upiId, setUpiId] = useState("");
  const [upiIdError, setUpiIdError] = useState("");
  const [kycStatus, setKycStatus] = useState<"pending" | "approved" | "none">("none");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "success" | "error">("unknown");

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
    }
    setCurrentStep(currentStep + 1);
  };

  const handleFileUpload = () => {
    hookToast({
      title: "KYC documents uploaded",
      description: "We'll review your documents within 24 hours.",
    });
    setKycStatus("pending");
  };

  const handleCopy = (text: string, message: string) => {
    copyToClipboard(text, () => {
      toast(message);
    });
  };

  const testConnection = () => {
    setIsTestingConnection(true);
    setConnectionStatus("unknown");
    
    // Simulate API call that tests the connection to OBS
    setTimeout(() => {
      setIsTestingConnection(false);
      setConnectionStatus("success");
      toast("Connection successful!", {
        description: "Your OBS browser source is ready to receive alerts.",
      });
    }, 1500);
  };

  // Render OBS URL input with automatic refresh
  const renderOBSUrlInput = () => {
    return (
      <div className="space-y-2">
        <Label htmlFor="obs-url">OBS Browser Source URL</Label>
        <div className="flex">
          <Input
            id="obs-url"
            value={getOBSUrl()}
            readOnly
          />
          <Button
            variant="outline"
            size="icon"
            className="ml-2"
            onClick={() => handleCopy(
              getOBSUrl(),
              "OBS URL copied to clipboard"
            )}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          This URL includes a timestamp parameter to ensure alerts update instantly when styles change
        </p>
      </div>
    );
  };

  // ... keep existing code (render UI elements)
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Setup your donation page</h1>
      <p className="text-muted-foreground mb-6">
        Complete the following steps to start accepting donations on your streams
      </p>
      
      <div className="mb-8">
        <Progress value={(currentStep / 4) * 100} className="h-2" />
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>UPI Setup</span>
          <span>KYC</span>
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

        {/* Step 2: KYC */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>KYC Documentation</CardTitle>
              <CardDescription>
                Required for monthly donations exceeding ₹50,000
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>PAN Card</Label>
                      {kycStatus !== "none" && (
                        <Badge variant={kycStatus === "approved" ? "outline" : "secondary"}>
                          {kycStatus === "approved" ? "Approved" : "Pending"}
                        </Badge>
                      )}
                    </div>
                    <div className="h-32 border border-dashed rounded-md flex items-center justify-center bg-muted/50">
                      <div className="flex flex-col items-center space-y-2 text-muted-foreground">
                        <FileUp className="h-8 w-8" />
                        <span className="text-sm">Upload PAN Card</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 border rounded-lg p-4 space-y-3">
                    <Label>Bank Proof</Label>
                    <div className="h-32 border border-dashed rounded-md flex items-center justify-center bg-muted/50">
                      <div className="flex flex-col items-center space-y-2 text-muted-foreground">
                        <FileUp className="h-8 w-8" />
                        <span className="text-sm">Upload Bank Statement</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  You can skip this step if your monthly donations are under ₹50,000.
                  You can complete KYC later from the Settings page.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>
                  Skip for now
                </Button>
                <Button onClick={() => {
                  handleFileUpload();
                  handleNextStep();
                }}>
                  Upload & Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Generate Links */}
        {currentStep === 3 && (
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
                  {/* Use the renderOBSUrlInput function */}
                  {renderOBSUrlInput()}
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold">How to add to OBS:</h4>
                    <ol className="space-y-2 mt-2 list-decimal list-inside text-sm">
                      <li>In OBS, add a new "Browser Source"</li>
                      <li>Paste the URL above into the URL field</li>
                      <li>Set width to 1280 and height to 720</li>
                      <li className="font-medium text-primary">Important: Check "Shutdown source when not visible" and "Refresh browser when scene becomes active"</li>
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

        {/* Step 4: Connection Test */}
        {currentStep === 4 && (
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
