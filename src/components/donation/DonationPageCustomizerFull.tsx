
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DonationPageSettings } from "@/types/donation";
import { ColorPicker } from "@/components/ui/color-picker";
import { Save, Settings, Brush, Image, PaintBucket, MessageSquare, ToggleLeft, Goal, Eye } from "lucide-react";
import DonationPagePreview from "@/components/donation/DonationPagePreview";
import { FileUploader } from "@/components/ui/file-uploader";

// Create a type-safe way to use the donation_page_settings table
const donationPageSettingsTable = 'donation_page_settings';

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  primary_color: z.string().min(1, "Primary color is required"),
  secondary_color: z.string().min(1, "Secondary color is required"),
  background_color: z.string().min(1, "Background color is required"),
  goal_amount: z.coerce.number().min(1, "Goal amount must be at least 1"),
  show_donation_goal: z.boolean(),
  show_recent_donors: z.boolean(),
  use_background_image: z.boolean(),
  custom_thank_you_message: z.string().min(1, "Thank you message is required"),
});

type FormValues = z.infer<typeof formSchema>;

export const DonationPageCustomizerFull = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<DonationPageSettings | null>(null);
  const [previewSettings, setPreviewSettings] = useState<DonationPageSettings | null>(null);
  const [streamerInfo, setStreamerInfo] = useState<{ name?: string; avatar_url?: string }>({});
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [useBackgroundImage, setUseBackgroundImage] = useState(false);

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "Support My Stream",
      description: "Your donation will help me create better content!",
      primary_color: "#8445ff", // Brand purple
      secondary_color: "#4b1493", // Dark purple
      background_color: "#f8f9fa", // Light background
      goal_amount: 10000,
      show_donation_goal: true,
      show_recent_donors: true,
      use_background_image: false,
      custom_thank_you_message: "Thank you for your donation! Your support means the world to me.",
    },
    mode: "onChange", // Enable real-time validation
  });

  // Update preview settings when form values change
  const updatePreview = useCallback(() => {
    const formValues = form.getValues();
    if (currentSettings) {
      setPreviewSettings({
        ...currentSettings,
        title: formValues.title,
        description: formValues.description,
        primary_color: formValues.primary_color,
        secondary_color: formValues.secondary_color,
        background_color: formValues.background_color,
        goal_amount: formValues.goal_amount,
        show_donation_goal: formValues.show_donation_goal,
        show_recent_donors: formValues.show_recent_donors,
        custom_thank_you_message: formValues.custom_thank_you_message,
        background_image: useBackgroundImage ? backgroundImageUrl : null,
      });
    }
  }, [form, currentSettings, useBackgroundImage, backgroundImageUrl]);

  // Watch form changes for real-time preview updates
  useEffect(() => {
    const subscription = form.watch(updatePreview);
    return () => subscription.unsubscribe();
  }, [form, updatePreview]);

  // Load existing settings and streamer info on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Fetch streamer profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, streamer_name, avatar_url')
          .eq('id', user.id)
          .single();
          
        if (profile) {
          setStreamerInfo({
            name: profile.streamer_name || profile.display_name,
            avatar_url: profile.avatar_url
          });
        }
        
        // Use the string literal and cast the result
        // @ts-ignore - The table exists in the database but TypeScript doesn't know about it yet
        const { data, error } = await supabase
          .from(donationPageSettingsTable)
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error("Error fetching settings:", error);
          return;
        }
        
        if (data) {
          // Cast the data to our DonationPageSettings type
          const settings = data as unknown as DonationPageSettings;
          setCurrentSettings(settings);
          setPreviewSettings(settings);
          
          // Set background image if it exists
          if (settings.background_image) {
            setBackgroundImageUrl(settings.background_image);
            setUseBackgroundImage(true);
          }
          
          // Update form values with existing settings
          form.reset({
            title: settings.title,
            description: settings.description,
            primary_color: settings.primary_color,
            secondary_color: settings.secondary_color,
            background_color: settings.background_color || "#f8f9fa",
            goal_amount: settings.goal_amount,
            show_donation_goal: settings.show_donation_goal,
            show_recent_donors: settings.show_recent_donors,
            use_background_image: !!settings.background_image,
            custom_thank_you_message: settings.custom_thank_you_message,
          });
        }
      } catch (err) {
        console.error("Exception fetching settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user?.id, form]);

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    if (!user?.id) {
      toast.error("You must be logged in to save settings");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const settingsData = {
        user_id: user.id,
        title: values.title,
        description: values.description,
        primary_color: values.primary_color,
        secondary_color: values.secondary_color,
        background_color: values.background_color,
        background_image: useBackgroundImage ? backgroundImageUrl : null,
        goal_amount: values.goal_amount,
        show_donation_goal: values.show_donation_goal,
        show_recent_donors: values.show_recent_donors,
        custom_thank_you_message: values.custom_thank_you_message,
        updated_at: new Date().toISOString()
      } as DonationPageSettings;
      
      // Update or insert settings
      let operation;
      if (currentSettings?.id) {
        // @ts-ignore - The table exists in the database but TypeScript doesn't know about it yet
        operation = supabase
          .from(donationPageSettingsTable)
          .update(settingsData)
          .eq('id', currentSettings.id);
      } else {
        // @ts-ignore - The table exists in the database but TypeScript doesn't know about it yet
        operation = supabase
          .from(donationPageSettingsTable)
          .insert([settingsData]);
      }
      
      const { error } = await operation;
      
      if (error) {
        console.error("Error saving settings:", error);
        toast.error("Failed to save settings");
        return;
      }
      
      toast.success("Donation page settings saved successfully");
      
      // Refresh settings
      // @ts-ignore - The table exists in the database but TypeScript doesn't know about it yet
      const { data } = await supabase
        .from(donationPageSettingsTable)
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (data) {
        setCurrentSettings(data as unknown as DonationPageSettings);
        setPreviewSettings(data as unknown as DonationPageSettings);
      }
    } catch (err) {
      console.error("Exception saving settings:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle background image upload
  const handleImageUpload = async (file: File) => {
    if (!user?.id) return;
    
    try {
      // Create a unique file path in the storage bucket
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/donation-bg-${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('donation-images')
        .upload(filePath, file);
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('donation-images')
        .getPublicUrl(filePath);
        
      if (urlData) {
        setBackgroundImageUrl(urlData.publicUrl);
        setUseBackgroundImage(true);
        form.setValue('use_background_image', true);
        
        // Update the preview immediately
        updatePreview();
        toast.success("Background image uploaded successfully");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5 text-brand-500" />
              Donation Page Customization
            </CardTitle>
            <CardDescription>
              Create a fully customized donation page for your viewers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="basic">
                  <TabsList className="grid grid-cols-4 mb-6">
                    <TabsTrigger value="basic">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Basic</span>
                    </TabsTrigger>
                    <TabsTrigger value="colors">
                      <PaintBucket className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Colors</span>
                    </TabsTrigger>
                    <TabsTrigger value="background">
                      <Image className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Background</span>
                    </TabsTrigger>
                    <TabsTrigger value="display">
                      <Eye className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Display</span>
                    </TabsTrigger>
                  </TabsList>
                
                  {/* Basic Information Tab */}
                  <TabsContent value="basic">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              The main title of your donation page
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="goal_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <Goal className="h-4 w-4 mr-1" />
                              Donation Goal (₹)
                            </FormLabel>
                            <FormControl>
                              <Input type="number" min="1" step="100" {...field} />
                            </FormControl>
                            <FormDescription>
                              Set your donation goal amount
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Page Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Your donation will help me create better content!"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Tell your viewers why they should donate
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="custom_thank_you_message"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Thank You Message</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Thank you for your donation!"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Message shown after a successful donation
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  {/* Colors Tab */}
                  <TabsContent value="colors">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="primary_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Color</FormLabel>
                            <FormControl>
                              <ColorPicker color={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormDescription>
                              Main color for buttons and highlights
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
                              <ColorPicker color={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormDescription>
                              Color for accents and secondary elements
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="background_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Page Background Color</FormLabel>
                            <FormControl>
                              <ColorPicker color={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormDescription>
                              Background color for the donation page
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  {/* Background Tab */}
                  <TabsContent value="background">
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="use_background_image"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Use Background Image</FormLabel>
                              <FormDescription>
                                Use an image instead of a solid color for the background
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={useBackgroundImage}
                                onCheckedChange={(checked) => {
                                  setUseBackgroundImage(checked);
                                  field.onChange(checked);
                                  updatePreview();
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {useBackgroundImage && (
                        <div className="space-y-4">
                          <div className="border rounded-lg p-4">
                            <h3 className="text-sm font-medium mb-2">Upload Background Image</h3>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleImageUpload(e.target.files[0]);
                                }
                              }}
                              className="w-full text-sm"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                              Recommended size: 1920x1080px or similar aspect ratio
                            </p>
                          </div>
                          
                          {backgroundImageUrl && (
                            <div className="relative border rounded-lg overflow-hidden">
                              <img 
                                src={backgroundImageUrl} 
                                alt="Background preview" 
                                className="w-full h-40 object-cover"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute top-2 right-2"
                                type="button"
                                onClick={() => {
                                  setBackgroundImageUrl(null);
                                  setUseBackgroundImage(false);
                                  form.setValue('use_background_image', false);
                                  updatePreview();
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  {/* Display Tab */}
                  <TabsContent value="display">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="show_donation_goal"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Show Donation Goal</FormLabel>
                              <FormDescription>
                                Display progress towards your donation goal
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
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Show Recent Donors</FormLabel>
                              <FormDescription>
                                Display list of recent donors on your page
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
                </Tabs>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  variant="default"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Customization Settings"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              <Brush className="inline h-4 w-4 mr-1" />
              Changes will be immediately applied to your donation page
            </p>
          </CardFooter>
        </Card>
      </div>
      
      <div>
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Eye className="mr-2 h-5 w-5 text-brand-500" />
              Live Preview
            </CardTitle>
            <CardDescription>
              See how your donation page will look in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previewSettings && (
              <DonationPagePreview settings={previewSettings} streamerInfo={streamerInfo} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DonationPageCustomizerFull;
