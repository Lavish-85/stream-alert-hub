
import React, { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  Save,
  Trash,
  Key,
  ShieldCheck,
  Upload,
  User,
  Plus,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";

const SettingsPage = () => {
  const { profile, user, updateProfile, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile?.avatar_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  
  // Form schema for profile update
  const profileFormSchema = z.object({
    display_name: z.string().min(2, "Display name must be at least 2 characters."),
    streamer_name: z.string().optional(),
    channel_link: z.string().url("Must be a valid URL").or(z.string().length(0)).optional(),
  });
  
  // Initialize form with profile data
  const profileForm = useForm({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      display_name: profile?.display_name || "",
      streamer_name: profile?.streamer_name || "",
      channel_link: profile?.channel_link || "",
    },
  });

  // Update form when profile data changes
  React.useEffect(() => {
    if (profile) {
      profileForm.reset({
        display_name: profile.display_name || "",
        streamer_name: profile.streamer_name || "",
        channel_link: profile.channel_link || "",
      });
    }
  }, [profile]);
  
  const handleProfileUpdate = async (data: z.infer<typeof profileFormSchema>) => {
    try {
      let avatarUrl = profile?.avatar_url;
      
      // Upload new avatar if selected
      if (selectedFile && user) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${user.id}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('avatars')
          .upload(filePath, selectedFile);
          
        if (uploadError) {
          throw uploadError;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
          
        avatarUrl = publicUrl;
      }
      
      // Update profile
      await updateProfile({ 
        display_name: data.display_name,
        streamer_name: data.streamer_name,
        channel_link: data.channel_link,
        avatar_url: avatarUrl 
      });
      
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error("Error updating profile", {
        description: error.message
      });
    }
  };
  
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPasswordSubmitting(true);
    
    try {
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match", {
          description: "New password and confirmation must be identical."
        });
        return;
      }
      
      if (newPassword.length < 8) {
        toast.error("Password too short", {
          description: "Password must be at least 8 characters long."
        });
        return;
      }
      
      // First verify current password by attempting a sign-in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });
      
      if (signInError) {
        toast.error("Current password is incorrect", {
          description: "Please enter your current password correctly."
        });
        return;
      }
      
      // If current password is correct, proceed with password update
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast.success("Password updated", {
        description: "Your password has been changed successfully."
      });
      
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Error updating password", {
        description: error.message
      });
    } finally {
      setIsPasswordSubmitting(false);
    }
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null);
      return;
    }
    
    const file = e.target.files[0];
    setSelectedFile(file);
    
    // Create image preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    
    return () => URL.revokeObjectURL(objectUrl);
  };
  
  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success("API token copied", {
      description: "The token has been copied to your clipboard."
    });
  };
  
  const handleGenerateToken = () => {
    if (!newTokenName) {
      toast.error("Token name required", {
        description: "Please provide a name for your new token."
      });
      return;
    }
    
    toast.success("New token generated", {
      description: "Your API token has been created and copied to clipboard."
    });
    
    setNewTokenName("");
  };
  
  const handleDeleteAccount = async () => {
    try {
      // Attempt to delete the user's account
      const { error } = await supabase.auth.admin.deleteUser(user?.id || "");
      
      if (error) throw error;
      
      // Sign out the user after deletion
      await signOut();
      
      toast.success("Account deleted", {
        description: "Your account has been successfully deleted."
      });
    } catch (error: any) {
      toast.error("Error deleting account", {
        description: error.message || "Please try again later."
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
      <p className="text-muted-foreground mb-6">
        Manage your account, subscription and API access
      </p>

      <Tabs defaultValue="account" className="space-y-8">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your profile details and streamer information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                      <div className="relative" onClick={handleAvatarClick}>
                        <Avatar className="w-24 h-24 cursor-pointer">
                          {previewUrl && <AvatarImage src={previewUrl} />}
                          <AvatarFallback className="text-lg">
                            {profile?.display_name 
                              ? profile.display_name.slice(0, 2).toUpperCase() 
                              : user?.email?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 rounded-full bg-primary p-1 cursor-pointer">
                          <Upload size={16} className="text-primary-foreground" />
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          ref={fileInputRef}
                          accept="image/*" 
                          onChange={handleImageChange}
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="font-medium">Profile Picture</p>
                        <p className="text-sm text-muted-foreground">
                          Click the avatar to upload a new profile picture
                        </p>
                      </div>
                    </div>
                    
                    <FormField
                      control={profileForm.control}
                      name="display_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="streamer_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Streamer Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="channel_link"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Channel Link</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://example.com/channel" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit">Save Profile</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
            
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
                  <Button type="submit" disabled={isPasswordSubmitting}>
                    {isPasswordSubmitting ? "Updating..." : "Update Password"}
                  </Button>
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
