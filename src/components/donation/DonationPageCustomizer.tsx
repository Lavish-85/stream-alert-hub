import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DonationPageSettings } from "@/types/donation";
import { ColorPicker } from "@/components/ui/color-picker";
import { Brush, Save, Settings } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  primary_color: z.string().min(1, "Primary color is required"),
  secondary_color: z.string().min(1, "Secondary color is required"),
  goal_amount: z.coerce.number().min(1, "Goal amount must be at least 1"),
  show_donation_goal: z.boolean(),
  show_recent_donors: z.boolean(),
  custom_thank_you_message: z.string().min(1, "Thank you message is required"),
});

type FormValues = z.infer<typeof formSchema>;

export const DonationPageCustomizer = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<DonationPageSettings | null>(null);

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "Support My Stream",
      description: "Your donation will help me create better content!",
      primary_color: "#8445ff", // Brand purple
      secondary_color: "#4b1493", // Dark purple
      goal_amount: 10000,
      show_donation_goal: true,
      show_recent_donors: true,
      custom_thank_you_message: "Thank you for your donation! Your support means the world to me.",
    },
  });

  // Load existing settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Use a type assertion to work around TypeScript not knowing about donation_page_settings
        const { data, error } = await supabase
          // @ts-ignore - Ignore TypeScript error for now as the table exists in the database
          .from('donation_page_settings')
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
          
          // Update form values with existing settings
          form.reset({
            title: settings.title,
            description: settings.description,
            primary_color: settings.primary_color,
            secondary_color: settings.secondary_color,
            goal_amount: settings.goal_amount,
            show_donation_goal: settings.show_donation_goal,
            show_recent_donors: settings.show_recent_donors,
            custom_thank_you_message: settings.custom_thank_you_message,
          });
        }
      } catch (err) {
        console.error("Exception fetching settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, [user?.id]);

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
        goal_amount: values.goal_amount,
        show_donation_goal: values.show_donation_goal,
        show_recent_donors: values.show_recent_donors,
        custom_thank_you_message: values.custom_thank_you_message,
        updated_at: new Date().toISOString()
      } as DonationPageSettings;
      
      // Update or insert settings
      let operation;
      if (currentSettings?.id) {
        // @ts-ignore - Ignore TypeScript error for now as the table exists in the database
        operation = supabase
          .from('donation_page_settings')
          .update(settingsData)
          .eq('id', currentSettings.id);
      } else {
        // @ts-ignore - Ignore TypeScript error for now as the table exists in the database
        operation = supabase
          .from('donation_page_settings')
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
      // @ts-ignore - Ignore TypeScript error for now as the table exists in the database
      const { data } = await supabase
        .from('donation_page_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (data) {
        setCurrentSettings(data as unknown as DonationPageSettings);
      }
    } catch (err) {
      console.error("Exception saving settings:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5 text-brand-500" />
          Donation Page Customization
        </CardTitle>
        <CardDescription>
          Personalize your donation page to match your brand
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <FormLabel>Donation Goal (₹)</FormLabel>
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
                <FormItem>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
            
            <FormField
              control={form.control}
              name="custom_thank_you_message"
              render={({ field }) => (
                <FormItem>
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
  );
};

export default DonationPageCustomizer;
