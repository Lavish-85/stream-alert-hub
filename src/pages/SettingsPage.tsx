
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CreditCard,
  Copy,
  Save,
  Trash,
  Link,
  Mail,
  Bell,
  Key,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SettingsPage = () => {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("https://discord.com/api/webhooks/12345");
  
  const [notificationPreferences, setNotificationPreferences] = useState({
    email: true,
    push: false,
    discord: true,
    webhook: false,
  });
  
  const [apiTokens] = useState([
    {
      id: "1",
      name: "OBS Integration",
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      createdAt: "2023-05-21T14:32:17Z",
    },
    {
      id: "2",
      name: "Discord Bot",
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      createdAt: "2023-06-15T09:14:52Z",
    },
  ]);
  
  const [newTokenName, setNewTokenName] = useState("");
  
  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "New password and confirmation must be identical.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Password updated",
      description: "Your password has been changed successfully.",
    });
    
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };
  
  const handleToggleNotification = (key: keyof typeof notificationPreferences) => {
    setNotificationPreferences({
      ...notificationPreferences,
      [key]: !notificationPreferences[key],
    });
    
    toast({
      title: "Notification preferences updated",
      description: `${key.charAt(0).toUpperCase() + key.slice(1)} notifications ${!notificationPreferences[key] ? 'enabled' : 'disabled'}.`,
    });
  };
  
  const handleSaveWebhook = () => {
    toast({
      title: "Webhook URL saved",
      description: "Your custom webhook has been configured.",
    });
  };
  
  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({
      title: "API token copied",
      description: "The token has been copied to your clipboard.",
    });
  };
  
  const handleGenerateToken = () => {
    if (!newTokenName) {
      toast({
        title: "Token name required",
        description: "Please provide a name for your new token.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "New token generated",
      description: "Your API token has been created and copied to clipboard.",
    });
    
    setNewTokenName("");
  };
  
  const handleDeleteAccount = () => {
    toast({
      title: "Account deletion initiated",
      description: "We've sent a confirmation email. Please follow instructions to complete the process.",
      duration: 5000,
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
      <p className="text-muted-foreground mb-6">
        Manage your account, notifications and API access
      </p>

      <Tabs defaultValue="subscription" className="space-y-8">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="api">API Tokens</TabsTrigger>
        </TabsList>

        {/* Subscription Tab */}
        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plan</CardTitle>
              <CardDescription>
                Manage your subscription and billing details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className={cn(
                  "relative cursor-pointer border-2",
                  "border-primary/30 bg-primary/5"
                )}>
                  <Badge variant="outline" className="absolute top-2 right-2 bg-primary/10 text-primary border-primary/20">
                    Current
                  </Badge>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Free Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-2xl font-bold mb-2">₹0</p>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-center">
                        <CheckIcon className="mr-2" /> Basic alert customization
                      </li>
                      <li className="flex items-center">
                        <CheckIcon className="mr-2" /> Up to ₹50,000/month
                      </li>
                      <li className="flex items-center">
                        <CheckIcon className="mr-2" /> 7-day analytics
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="cursor-pointer hover:border-brand-300 hover:shadow-sm transition-all">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Pro Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-2xl font-bold mb-2">₹999<span className="text-muted-foreground text-sm font-normal">/month</span></p>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-center">
                        <CheckIcon className="mr-2" /> Advanced customization
                      </li>
                      <li className="flex items-center">
                        <CheckIcon className="mr-2" /> Up to ₹2,00,000/month
                      </li>
                      <li className="flex items-center">
                        <CheckIcon className="mr-2" /> 30-day analytics
                      </li>
                      <li className="flex items-center">
                        <CheckIcon className="mr-2" /> Priority support
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full">Upgrade</Button>
                  </CardFooter>
                </Card>
                
                <Card className="cursor-pointer hover:border-brand-300 hover:shadow-sm transition-all">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Enterprise</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-2xl font-bold mb-2">₹2,999<span className="text-muted-foreground text-sm font-normal">/month</span></p>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-center">
                        <CheckIcon className="mr-2" /> White-labeled service
                      </li>
                      <li className="flex items-center">
                        <CheckIcon className="mr-2" /> Unlimited donations
                      </li>
                      <li className="flex items-center">
                        <CheckIcon className="mr-2" /> 1-year analytics history
                      </li>
                      <li className="flex items-center">
                        <CheckIcon className="mr-2" /> Dedicated support
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">Contact Sales</Button>
                  </CardFooter>
                </Card>
              </div>
              
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-start space-x-4">
                  <CreditCard className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">Need help choosing a plan?</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Compare all features, or contact our sales team for custom pricing options tailored to your needs.
                    </p>
                    <div className="mt-3 flex gap-3">
                      <Button variant="outline" size="sm">Compare Plans</Button>
                      <Button size="sm">Contact Sales</Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how and when you would like to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive donation and payment notifications via email
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationPreferences.email}
                    onCheckedChange={() => handleToggleNotification("email")}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Get push notifications in your browser
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationPreferences.push}
                    onCheckedChange={() => handleToggleNotification("push")}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-5 w-5 flex items-center justify-center text-muted-foreground">
                      <svg className="h-4 w-4" viewBox="0 0 127 96" fill="currentColor">
                        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Discord Integration</p>
                      <p className="text-sm text-muted-foreground">
                        Send donation alerts to your Discord server
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationPreferences.discord}
                    onCheckedChange={() => handleToggleNotification("discord")}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Link className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Custom Webhook</p>
                      <p className="text-sm text-muted-foreground">
                        Send donation events to your own endpoint
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationPreferences.webhook}
                    onCheckedChange={() => handleToggleNotification("webhook")}
                  />
                </div>
                
                {notificationPreferences.webhook && (
                  <div className="bg-muted p-4 rounded-lg mt-2">
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <div className="flex mt-2">
                      <Input
                        id="webhook-url"
                        placeholder="https://your-service.com/webhook"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                      />
                      <Button onClick={handleSaveWebhook} size="sm" className="ml-2">
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      We'll send a POST request with donation details to this URL.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit">Update Password</Button>
                </form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>
                  Manage your connected social accounts and services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-[#4285F4] flex items-center justify-center text-white">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        <path d="M1 1h22v22H1z" fill="none" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Google</p>
                      <p className="text-sm text-muted-foreground">
                        Connected as john.sharma@gmail.com
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Disconnect</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-[#6441a5] flex items-center justify-center text-white">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Twitch</p>
                      <p className="text-sm text-muted-foreground">
                        Not connected
                      </p>
                    </div>
                  </div>
                  <Button size="sm">Connect</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center text-white">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                        <path d="M21.543 7.104c.015.211.015.423.015.636 0 6.507-4.954 14.01-14.01 14.01v-.003A13.94 13.94 0 0 1 0 19.539a9.88 9.88 0 0 0 7.287-2.041 4.93 4.93 0 0 1-4.6-3.42 4.916 4.916 0 0 0 2.223-.084A4.926 4.926 0 0 1 .96 9.167v-.062a4.887 4.887 0 0 0 2.235.616A4.928 4.928 0 0 1 1.67 3.148 13.98 13.98 0 0 0 11.82 8.292a4.929 4.929 0 0 1 8.39-4.49 9.868 9.868 0 0 0 3.128-1.196 4.941 4.941 0 0 1-2.165 2.724A9.828 9.828 0 0 0 24 4.555a10.019 10.019 0 0 1-2.457 2.549z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Twitter</p>
                      <p className="text-sm text-muted-foreground">
                        Not connected
                      </p>
                    </div>
                  </div>
                  <Button size="sm">Connect</Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Account Deletion</CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete your account, all of your data will be 
                  permanently removed. This action cannot be undone.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete Account</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete 
                        your account and remove all your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* API Tokens Tab */}
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Tokens</CardTitle>
              <CardDescription>
                Manage tokens for API access to your StreamDonate account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {apiTokens.map((token) => (
                  <div 
                    key={token.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1 mb-4 sm:mb-0">
                      <div className="flex items-center">
                        <h4 className="font-medium">{token.name}</h4>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {new Date(token.createdAt).toLocaleDateString()}
                        </Badge>
                      </div>
                      <div className="flex items-center">
                        <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
                          {token.token.substring(0, 20)}...
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleCopyToken(token.token)} 
                          className="h-6 w-6 ml-1"
                        >
                          <Copy className="h-3 w-3" />
                          <span className="sr-only">Copy token</span>
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Permissions
                      </Button>
                      <Button variant="destructive" size="sm">
                        <Trash className="h-4 w-4 mr-2" />
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Generate New Token</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Label htmlFor="token-name" className="sr-only">Token Name</Label>
                    <Input
                      id="token-name"
                      placeholder="Token name (e.g. OBS Integration)"
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleGenerateToken}>
                    <Key className="h-4 w-4 mr-2" />
                    Generate Token
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tokens have full access to your account. Keep them secure!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Simple check icon component for the pricing cards
const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-4 w-4 text-brand-600", className)}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default SettingsPage;
