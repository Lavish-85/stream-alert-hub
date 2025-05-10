import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ColorPicker } from '@/components/ui/color-picker';
import { toast } from 'sonner';
import { DollarSign, Check, Copy, PaintBucket, Target, LinkIcon, IndianRupee, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DonationLinkCard from '@/components/donation/DonationLinkCard';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Form schema for validation
const customizationFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  custom_thank_you_message: z.string().min(1, "Thank you message is required"),
  goal_amount: z.coerce.number().min(1, "Goal must be at least 1"),
  show_donation_goal: z.boolean().default(true),
  show_recent_donors: z.boolean().default(true),
  primary_color: z.string().min(1, "Primary color is required"),
  secondary_color: z.string().min(1, "Secondary color is required"),
  custom_url: z.string().optional()
});

type CustomizationFormValues = z.infer<typeof customizationFormSchema>;

const DonationCustomizePage = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  
  // Initialize form with default values
  const form = useForm<CustomizationFormValues>({
    resolver: zodResolver(customizationFormSchema),
    defaultValues: {
      title: `Support ${user?.email?.split('@')[0] || 'Me'}`,
      description: "Your donation helps me create better content for everyone to enjoy!",
      custom_thank_you_message: "Thank you so much for your generous support!",
      goal_amount: 10000,
      show_donation_goal: true,
      show_recent_donors: true,
      primary_color: "#4F46E5",
      secondary_color: "#10B981",
      custom_url: ""
    }
  });

  // Load existing settings when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) {
        toast.error("You must be logged in to customize your donation page");
        return;
      }
      
      setIsLoading(true);
      setSaveError(null);
      
      try {
        console.log("Fetching settings for user ID:", user.id);
        const { data, error } = await supabase
          .from('donation_page_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error("Error loading settings:", error);
          if (error.code !== 'PGRST116') { // Not found error
            toast.error("Failed to load your settings. Please try again.");
          }
        } else if (data) {
          console.log("Settings loaded:", data);
          
          // Populate form with existing data
          form.reset({
            title: data.title,
            description: data.description,
            custom_thank_you_message: data.custom_thank_you_message,
            goal_amount: data.goal_amount,
            show_donation_goal: data.show_donation_goal,
            show_recent_donors: data.show_recent_donors,
            primary_color: data.primary_color,
            secondary_color: data.secondary_color,
            custom_url: data.custom_url || ""
          });
          
          setLastSaved(new Date(data.updated_at));
          toast.success("Your settings have been loaded");
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
        toast.error("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user?.id, refreshKey]);

  const onSubmit = async (values: CustomizationFormValues) => {
    if (!user?.id) {
      toast.error("You must be logged in to save settings");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    
    try {
      console.log("Saving settings:", values);
      
      // Check if custom URL already exists (if provided)
      if (values.custom_url) {
        const { data: existingUrl, error: urlCheckError } = await supabase
          .from('donation_page_settings')
          .select('user_id')
          .eq('custom_url', values.custom_url)
          .neq('user_id', user.id)
          .maybeSingle();
          
        if (urlCheckError) {
          console.error("Error checking URL availability:", urlCheckError);
        }
        
        if (existingUrl) {
          toast.error("This custom URL is already taken. Please choose another.");
          setSaveError("This custom URL is already taken");
          setIsSaving(false);
          return;
        }
      }
      
      // Upsert the settings
      const { error } = await supabase
        .from('donation_page_settings')
        .upsert({
          user_id: user.id,
          title: values.title,
          description: values.description,
          custom_thank_you_message: values.custom_thank_you_message,
          goal_amount: values.goal_amount,
          show_donation_goal: values.show_donation_goal,
          show_recent_donors: values.show_recent_donors,
          primary_color: values.primary_color,
          secondary_color: values.secondary_color,
          custom_url: values.custom_url || null,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error("Error saving settings:", error);
        toast.error("Failed to save settings: " + error.message);
        setSaveError(error.message);
      } else {
        setLastSaved(new Date());
        toast.success("Donation page settings saved successfully!");
        
        // Force refresh of the DonationLinkCard
        setRefreshKey(Date.now());
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      toast.error("An error occurred while saving settings");
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(Date.now());
    toast.info("Refreshing settings...");
  };

  return (
    <div className="container p-4 mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Customize Donation Page</h1>
        <p className="text-muted-foreground">
          Personalize how your donation page looks and functions
        </p>
        
        {!user && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>
              You need to be logged in to customize your donation page
            </AlertDescription>
          </Alert>
        )}
        
        {lastSaved && (
          <p className="text-xs text-muted-foreground mt-2">
            Last saved: {lastSaved.toLocaleString()}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Donation Page Settings</CardTitle>
              <CardDescription>
                Customize the appearance and behavior of your donation page
              </CardDescription>
            </CardHeader>
            <CardContent>
              {saveError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}
              
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="appearance">Appearance</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <TabsContent value="content" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Page Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Support My Stream" {...field} />
                            </FormControl>
                            <FormDescription>
                              This will be shown as the main heading on your donation page.
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
                              <Textarea 
                                placeholder="Your support helps me create better content!"
                                className="min-h-24"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Tell your viewers why they should donate and what their donation will help you achieve.
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
                              <Textarea 
                                placeholder="Thank you for your support! It means the world to me."
                                className="min-h-24"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              This message will be shown to donors after they complete their donation.
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
                              <FormControl>
                                <ColorPicker 
                                  color={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormDescription>
                                Used for buttons and primary elements
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
                              <FormControl>
                                <ColorPicker 
                                  color={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormDescription>
                                Used for accents and highlights
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Background image upload could be added here */}
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="goal_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Donation Goal (₹)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <IndianRupee className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input 
                                  type="number" 
                                  className="pl-10" 
                                  placeholder="10000"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Set a fundraising goal to motivate your viewers
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="show_donation_goal"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Show Donation Goal</FormLabel>
                              <FormDescription>
                                Display the donation goal progress on your page
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
                                Display a list of recent supporters on your page
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
                        name="custom_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Donation URL</FormLabel>
                            <FormControl>
                              <div className="flex space-x-2">
                                <div className="flex items-center bg-muted px-3 rounded-l-md border border-r-0 border-input text-sm text-muted-foreground">
                                  {window.location.origin}/donate/
                                </div>
                                <Input 
                                  placeholder="your-custom-url" 
                                  className="rounded-l-none"
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Create a memorable link that's easier to share (optional)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <div className="flex items-center justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleRefresh}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                            Loading...
                          </>
                        ) : (
                          <>
                            Refresh
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        type="submit" 
                        className="min-w-32" 
                        disabled={isLoading || isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                            Saving...
                          </>
                        ) : (
                          <>
                            {lastSaved ? "Save Changes" : "Save Settings"}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div>
          <DonationLinkCard userId={user?.id || ""} key={refreshKey} />
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="mr-2 h-5 w-5 text-blue-500" />
                Preview
              </CardTitle>
              <CardDescription>
                See how your donation page will look
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                disabled={!user?.id}
                onClick={() => {
                  // Use the current time as a cache-busting parameter
                  const previewUrl = `/donate/${user?.id || ''}?preview=true&t=${Date.now()}`;
                  window.open(previewUrl, '_blank');
                }}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Preview Donation Page
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DonationCustomizePage;
