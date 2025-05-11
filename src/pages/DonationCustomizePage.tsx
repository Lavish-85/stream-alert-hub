
import * as React from "react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, Palette } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ColorPicker } from "@/components/ui/color-picker";

// Form schema for donation page settings
const donationPageSchema = z.object({
  customUrl: z.string()
    .min(3, { message: "Custom URL must be at least 3 characters" })
    .max(30, { message: "Custom URL must be at most 30 characters" })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: "Custom URL can only contain letters, numbers, underscores and hyphens" }),
  pageTitle: z.string().max(50, { message: "Title must be at most 50 characters" }).optional(),
  bio: z.string().max(300, { message: "Bio must be at most 300 characters" }).optional(),
  goalAmount: z.coerce.number().min(0, { message: "Goal amount must be positive" }).optional(),
  showGoal: z.boolean().default(true),
  showRecentDonors: z.boolean().default(true),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
});

type DonationPageFormValues = z.infer<typeof donationPageSchema>;

const DonationCustomizePage = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [existingSettings, setExistingSettings] = useState<DonationPageFormValues | null>(null);
  
  // Initialize form with default values
  const form = useForm<DonationPageFormValues>({
    resolver: zodResolver(donationPageSchema),
    defaultValues: {
      customUrl: "",
      pageTitle: "",
      bio: "",
      goalAmount: 10000,
      showGoal: true,
      showRecentDonors: true,
      primaryColor: "#8445ff", // Updated to match database default
      accentColor: "#4b1493" // Updated to match database default
    }
  });

  // Load existing settings when component mounts
  useEffect(() => {
    const fetchDonationPageSettings = async () => {
      if (!user?.id) return;
      
      try {
        console.log("Fetching donation page settings for user:", user.id);
        
        // Check if we have settings in the donation_page_settings table
        const { data, error } = await supabase
          .from('donation_page_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) {
          console.error("Error fetching donation settings:", error);
          return;
        }
        
        if (data) {
          console.log("Found donation settings:", data);
          
          // Update form with existing settings - mapping database column names to form field names
          form.reset({
            customUrl: data.custom_url || "",
            pageTitle: data.title || "", 
            bio: data.description || "", 
            goalAmount: data.goal_amount || 10000,
            showGoal: data.show_donation_goal ?? true,
            showRecentDonors: data.show_recent_donors ?? true,
            primaryColor: data.primary_color || "#8445ff",
            accentColor: data.secondary_color || "#4b1493"
          });
          
          setExistingSettings({
            customUrl: data.custom_url || "",
            pageTitle: data.title || "",
            bio: data.description || "",
            goalAmount: data.goal_amount || 10000,
            showGoal: data.show_donation_goal ?? true,
            showRecentDonors: data.show_recent_donors ?? true,
            primaryColor: data.primary_color || "#8445ff",
            accentColor: data.secondary_color || "#4b1493"
          });
        } else {
          console.log("No existing donation settings found");
        }
        
      } catch (err) {
        console.error("Exception in fetching donation settings:", err);
      }
    };
    
    fetchDonationPageSettings();
  }, [user?.id]);
  
  const onSubmit = async (values: DonationPageFormValues) => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to save settings",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log("Saving donation page settings:", values);
      
      // Check if custom URL is already taken (except by the current user)
      const { data: existingUrl, error: urlCheckError } = await supabase
        .from('donation_page_settings')
        .select('user_id')
        .eq('custom_url', values.customUrl)
        .neq('user_id', user.id);
        
      if (urlCheckError) {
        throw new Error(`Error checking custom URL: ${urlCheckError.message}`);
      }
      
      if (existingUrl && existingUrl.length > 0) {
        toast({
          variant: "destructive",
          title: "Custom URL already taken",
          description: "Please choose a different custom URL",
        });
        setIsLoading(false);
        return;
      }
      
      // First, check if a record exists for this user
      const { data: existingRecord, error: checkError } = await supabase
        .from('donation_page_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (checkError) {
        throw new Error(`Error checking existing record: ${checkError.message}`);
      }
      
      let result;
      
      if (existingRecord) {
        // Update existing record
        result = await supabase
          .from('donation_page_settings')
          .update({
            custom_url: values.customUrl,
            title: values.pageTitle || 'Support My Stream',
            description: values.bio || null,
            goal_amount: values.goalAmount || 10000,
            show_donation_goal: values.showGoal,
            show_recent_donors: values.showRecentDonors,
            primary_color: values.primaryColor || "#8445ff",
            secondary_color: values.accentColor || "#4b1493",
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      } else {
        // Insert new record
        result = await supabase
          .from('donation_page_settings')
          .insert({
            user_id: user.id,
            custom_url: values.customUrl,
            title: values.pageTitle || 'Support My Stream',
            description: values.bio || null,
            goal_amount: values.goalAmount || 10000,
            show_donation_goal: values.showGoal,
            show_recent_donors: values.showRecentDonors,
            primary_color: values.primaryColor || "#8445ff",
            secondary_color: values.accentColor || "#4b1493",
            updated_at: new Date().toISOString()
          });
      }
        
      if (result.error) {
        throw new Error(`Error saving settings: ${result.error.message}`);
      }
      
      toast({
        title: "Settings saved",
        description: "Your donation page settings have been updated",
      });
      
      // Update the existing settings state
      setExistingSettings(values);
      
    } catch (err) {
      console.error("Error saving donation page settings:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save settings",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate donation URL for preview
  const getDonationUrl = () => {
    const baseUrl = window.location.origin;
    const customUrlParam = form.watch("customUrl");
    
    if (customUrlParam) {
      return `${baseUrl}/donate/${customUrlParam}`;
    } else if (user?.id) {
      return `${baseUrl}/donate/${user.id}`;
    }
    
    return `${baseUrl}/donate/...`;
  };

  // Watch color values for preview
  const primaryColor = form.watch("primaryColor");
  const accentColor = form.watch("accentColor");
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Donation Page Customization</h1>
        <p className="text-muted-foreground">
          Customize how your donation page looks to your supporters
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-5">
        {/* Main content - 3/5 width on md+ screens */}
        <div className="md:col-span-3 space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <TabsContent value="general" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>General Settings</CardTitle>
                      <CardDescription>
                        Configure your donation page URL and visibility options
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="customUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom URL</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <span className="bg-muted px-3 py-2 rounded-l-md border border-r-0 text-muted-foreground">
                                  {window.location.origin}/donate/
                                </span>
                                <Input 
                                  className="rounded-l-none" 
                                  placeholder="your-name" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Choose a unique URL for your donation page
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="showGoal"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-3">
                              <div>
                                <FormLabel>Show donation goal</FormLabel>
                                <FormDescription>
                                  Display your donation goal progress on your page
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        {form.watch("showGoal") && (
                          <FormField
                            control={form.control}
                            name="goalAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Goal amount (₹)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    {...field} 
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="showRecentDonors"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <FormLabel>Show recent donors</FormLabel>
                              <FormDescription>
                                Display recent donations on your page
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="appearance" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Appearance Settings</CardTitle>
                      <CardDescription>
                        Customize colors and visual elements
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="primaryColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Primary Color</FormLabel>
                              <FormControl>
                                <div className="flex space-x-2">
                                  <Input
                                    type="color"
                                    className="w-12 h-12 p-1 cursor-pointer"
                                    value={field.value}
                                    onChange={field.onChange}
                                  />
                                  <Input
                                    type="text"
                                    placeholder="#8445ff"
                                    value={field.value}
                                    onChange={field.onChange}
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>
                                Used for buttons and highlights
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="accentColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Accent Color</FormLabel>
                              <FormControl>
                                <div className="flex space-x-2">
                                  <Input
                                    type="color"
                                    className="w-12 h-12 p-1 cursor-pointer"
                                    value={field.value}
                                    onChange={field.onChange}
                                  />
                                  <Input
                                    type="text"
                                    placeholder="#4b1493"
                                    value={field.value}
                                    onChange={field.onChange}
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>
                                Used for borders and secondary elements
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="mt-2 p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Tip:</span> Choose colors that match your brand for consistency across platforms
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="content" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Content Settings</CardTitle>
                      <CardDescription>
                        Customize text and content on your donation page
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="pageTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Page Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Support my stream"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Custom title for your donation page (optional)
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bio / Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Tell your supporters why they should donate to you..."
                                className="min-h-[100px]"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              This description will appear on your donation page
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </Tabs>
        </div>
        
        {/* Sidebar - 2/5 width on md+ screens */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                Preview & Share
              </CardTitle>
              <CardDescription>
                Your donation page URL and preview
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded-md break-all font-mono text-sm">
                {getDonationUrl()}
              </div>
              
              <div className="aspect-[9/16] relative bg-slate-100 rounded-md overflow-hidden border">
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-full max-w-xs px-4 py-6 bg-white rounded-md shadow-md border flex flex-col items-center space-y-2">
                    <Avatar className="h-16 w-16">
                      {profile?.avatar_url && <AvatarImage src={profile?.avatar_url} />}
                      <AvatarFallback>{profile?.display_name?.slice(0,2) || 'SD'}</AvatarFallback>
                    </Avatar>
                    <p className="font-bold">{form.watch("pageTitle") || profile?.display_name || "Your Name"}</p>
                    <p className="text-xs text-center text-muted-foreground">
                      {form.watch("bio")?.slice(0, 50) || "Support my content!"}
                      {(form.watch("bio")?.length || 0) > 50 ? "..." : ""}
                    </p>
                    <div 
                      className="w-full h-2 rounded-full mt-1 mb-2" 
                      style={{
                        backgroundColor: primaryColor + "40",
                        backgroundImage: `linear-gradient(to right, ${primaryColor}, ${primaryColor})`
                      }}
                    />
                    <Button 
                      className="w-full" 
                      style={{
                        backgroundColor: primaryColor,
                        borderColor: accentColor,
                      }}
                    >
                      Donate Now
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col items-stretch gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  if (form.getValues().customUrl || user?.id) {
                    window.open(getDonationUrl(), "_blank");
                  } else {
                    toast({
                      title: "No URL available",
                      description: "Please set a custom URL first",
                      variant: "destructive"
                    });
                  }
                }}
                className="w-full"
              >
                Open Live Preview
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(getDonationUrl());
                  toast({
                    title: "Copied!",
                    description: "Donation URL copied to clipboard",
                  });
                }}
                className="w-full"
              >
                Copy URL
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DonationCustomizePage;
