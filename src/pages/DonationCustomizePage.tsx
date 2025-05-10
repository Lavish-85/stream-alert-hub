
import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Palette, Check, RefreshCw, Link as LinkIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DonationLinkCard from "@/components/donation/DonationLinkCard";

// Form schema
const customizationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  goal_amount: z.coerce.number().min(1, "Goal amount must be at least 1"),
  show_donation_goal: z.boolean(),
  show_recent_donors: z.boolean(),
  primary_color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
  secondary_color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color"),
  custom_thank_you_message: z.string().min(1, "Thank you message is required"),
  custom_url: z.string().optional()
    .refine(val => !val || /^[a-z0-9-]+$/.test(val), {
      message: "Custom URL can only contain lowercase letters, numbers, and hyphens"
    }),
});

type CustomizationFormValues = z.infer<typeof customizationSchema>;

const DonationCustomizePage = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<CustomizationFormValues | null>(null);
  const [urlAvailable, setUrlAvailable] = useState<boolean | null>(null);
  const [isCheckingUrl, setIsCheckingUrl] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Initialize form
  const form = useForm<CustomizationFormValues>({
    resolver: zodResolver(customizationSchema),
    defaultValues: {
      title: 'Support My Stream',
      description: 'Your donation will help me create better content!',
      goal_amount: 10000,
      show_donation_goal: true,
      show_recent_donors: true,
      primary_color: '#8445ff',
      secondary_color: '#4b1493',
      custom_thank_you_message: 'Thank you for your donation! Your support means the world to me.',
      custom_url: '',
    },
  });

  // Fetch existing settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('donation_page_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No settings found, create default settings
            const { error: insertError } = await supabase
              .from('donation_page_settings')
              .insert({ user_id: user.id });
            
            if (insertError) throw insertError;
            
            // Fetch the newly created settings
            const { data: newSettings, error: fetchError } = await supabase
              .from('donation_page_settings')
              .select('*')
              .eq('user_id', user.id)
              .single();
            
            if (fetchError) throw fetchError;
            
            if (newSettings) {
              setSettings(newSettings);
              form.reset(newSettings);
            }
          } else {
            throw error;
          }
        } else if (data) {
          setSettings(data);
          form.reset(data);
        }
      } catch (err) {
        console.error("Error fetching donation page settings:", err);
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user, refreshKey]);

  // Debounced URL check function
  const checkCustomUrl = async (url: string) => {
    if (!url) {
      setUrlAvailable(null);
      return;
    }
    
    setIsCheckingUrl(true);
    try {
      // Check if URL is already in use (excluding current user's settings)
      const { data, error } = await supabase
        .from('donation_page_settings')
        .select('id')
        .eq('custom_url', url)
        .not('user_id', 'eq', user?.id);
      
      if (error) throw error;
      
      setUrlAvailable(data.length === 0);
    } catch (err) {
      console.error("Error checking custom URL:", err);
      toast.error("Failed to check URL availability");
    } finally {
      setIsCheckingUrl(false);
    }
  };

  // Check URL availability when the value changes
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'custom_url') {
        const customUrl = value.custom_url;
        if (customUrl) {
          const timeoutId = setTimeout(() => {
            checkCustomUrl(customUrl);
          }, 500); // Debounce
          return () => clearTimeout(timeoutId);
        } else {
          setUrlAvailable(null);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const refreshSettings = () => {
    setRefreshKey(prev => prev + 1);
  };

  const onSubmit = async (values: CustomizationFormValues) => {
    if (!user?.id) {
      toast.error("You must be logged in to save settings");
      return;
    }

    if (values.custom_url && !urlAvailable) {
      toast.error("Custom URL is not available");
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('donation_page_settings')
        .update(values)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast.success("Donation page settings saved");
      setSettings(values);
    } catch (err) {
      console.error("Error saving donation page settings:", err);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6" /> Donation Page Customization
          </h1>
          <p className="text-muted-foreground">
            Personalize your donation page to match your brand and engage your supporters
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshSettings}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Donation Page Settings</CardTitle>
              <CardDescription>
                Customize how your donation page looks and functions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <Tabs defaultValue="content" className="w-full">
                    <TabsList className="grid grid-cols-3 mb-4">
                      <TabsTrigger value="content">Content</TabsTrigger>
                      <TabsTrigger value="appearance">Appearance</TabsTrigger>
                      <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="content" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Page Title</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              This will be displayed at the top of your donation page
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Page Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} />
                            </FormControl>
                            <FormDescription>
                              A brief explanation of what the donations will be used for
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="custom_thank_you_message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Thank You Message</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={2} />
                            </FormControl>
                            <FormDescription>
                              This message will be shown to donors after a successful donation
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    
                    <TabsContent value="appearance" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="primary_color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Primary Color</FormLabel>
                              <div className="flex gap-2">
                                <div 
                                  className="w-10 h-10 rounded-md border"
                                  style={{ backgroundColor: field.value }}
                                />
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              </div>
                              <FormDescription>
                                Main color for buttons and accents
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="secondary_color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Secondary Color</FormLabel>
                              <div className="flex gap-2">
                                <div 
                                  className="w-10 h-10 rounded-md border"
                                  style={{ backgroundColor: field.value }}
                                />
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              </div>
                              <FormDescription>
                                Used for gradients and hover states
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="goal_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Donation Goal (₹)</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" step="1" {...field} />
                            </FormControl>
                            <FormDescription>
                              Set your fundraising target amount
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="show_donation_goal"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Show Donation Goal</FormLabel>
                                <FormDescription>
                                  Display progress towards your donation target
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
                        
                        <FormField
                          control={form.control}
                          name="show_recent_donors"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Show Recent Donors</FormLabel>
                                <FormDescription>
                                  Display a list of recent supporters
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
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="advanced" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="custom_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom URL Path</FormLabel>
                            <div className="flex items-center gap-2">
                              <div className="flex-shrink-0 text-sm text-muted-foreground">
                                {window.location.origin}/donate/
                              </div>
                              <FormControl>
                                <div className="relative flex-1">
                                  <Input 
                                    {...field}
                                    placeholder="my-stream" 
                                    className={cn(
                                      "pr-8",
                                      field.value && urlAvailable === true && "border-green-500",
                                      field.value && urlAvailable === false && "border-red-500"
                                    )}
                                  />
                                  {isCheckingUrl && (
                                    <Loader2 className="w-4 h-4 absolute right-2 top-3 animate-spin text-muted-foreground" />
                                  )}
                                  {!isCheckingUrl && field.value && urlAvailable === true && (
                                    <Check className="w-4 h-4 absolute right-2 top-3 text-green-500" />
                                  )}
                                </div>
                              </FormControl>
                            </div>
                            <FormDescription>
                              Create a memorable link for your donation page
                              {field.value && urlAvailable === false && (
                                <p className="text-red-500 text-xs mt-1">This URL is already taken</p>
                              )}
                              {field.value && urlAvailable === true && (
                                <p className="text-green-500 text-xs mt-1">URL is available!</p>
                              )}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                  
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Donation Link</CardTitle>
              <CardDescription>
                Your unique donation page link
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DonationLinkCard userId={user?.id || ''} customUrl={settings?.custom_url} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                See how your donation page looks
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild>
                <a href={`/donate/${user?.id}`} target="_blank" rel="noopener noreferrer">
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Open Preview
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DonationCustomizePage;
