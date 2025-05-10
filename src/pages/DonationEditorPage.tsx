import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { DonationPageCustomizerFull } from "@/components/donation/DonationPageCustomizerFull";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, PaintBucket, Check } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColorPicker } from "@/components/ui/color-picker";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { hexToHsl } from "@/lib/utils";

const themeFormSchema = z.object({
  primaryColor: z.string().min(1, "Primary color is required"),
  primaryForeground: z.string().min(1, "Primary foreground is required"),
  secondaryColor: z.string().min(1, "Secondary color is required"),
  secondaryForeground: z.string().min(1, "Secondary foreground is required"),
  backgroundColor: z.string().min(1, "Background color is required"),
  foregroundColor: z.string().min(1, "Foreground color is required"),
  accentColor: z.string().min(1, "Accent color is required"),
  accentForeground: z.string().min(1, "Accent foreground is required"),
});

type ThemeFormValues = z.infer<typeof themeFormSchema>;

const DonationEditorPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  // Get the active tab from the URL search params
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl === "theme" ? "theme" : "donation");
  
  // Theme customization form
  const themeForm = useForm<ThemeFormValues>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: {
      primaryColor: "#8445ff",
      primaryForeground: "#ffffff",
      secondaryColor: "#4b1493",
      secondaryForeground: "#ffffff",
      backgroundColor: "#ffffff",
      foregroundColor: "#000000",
      accentColor: "#f3f1ff",
      accentForeground: "#8445ff"
    }
  });

  // Load saved theme colors from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("appTheme");
    if (savedTheme) {
      try {
        const themeValues = JSON.parse(savedTheme);
        themeForm.reset(themeValues);
        applyThemeColors(themeValues);
      } catch (e) {
        console.error("Error parsing saved theme", e);
      }
    }
  }, []);

  // Apply theme colors to CSS variables
  const applyThemeColors = (colors: ThemeFormValues) => {
    // Convert hex to HSL for CSS variables
    const root = document.documentElement;
    
    // Apply primary colors
    root.style.setProperty('--primary', hexToHsl(colors.primaryColor));
    root.style.setProperty('--primary-foreground', hexToHsl(colors.primaryForeground));
    
    // Apply secondary colors
    root.style.setProperty('--secondary', hexToHsl(colors.secondaryColor));
    root.style.setProperty('--secondary-foreground', hexToHsl(colors.secondaryForeground));
    
    // Apply background and foreground
    root.style.setProperty('--background', hexToHsl(colors.backgroundColor));
    root.style.setProperty('--foreground', hexToHsl(colors.foregroundColor));
    
    // Apply accent
    root.style.setProperty('--accent', hexToHsl(colors.accentColor));
    root.style.setProperty('--accent-foreground', hexToHsl(colors.accentForeground));

    // Update brand colors in Tailwind
    root.style.setProperty('--brand-500', colors.primaryColor);
    root.style.setProperty('--brand-900', colors.secondaryColor);
  };

  // Convert HEX color to HSL format needed by CSS variables
  const hexToHsl = (hex: string): string => {
    // Remove the # if present
    hex = hex.replace('#', '');
    
    // Convert hex to RGB
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;
    
    // Find the max and min values to calculate the lightness
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    
    // Calculate the lightness
    let l = (max + min) / 2;
    
    let s = 0;
    let h = 0;
    
    if (max !== min) {
      // Calculate the saturation
      s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
      
      // Calculate the hue
      if (max === r) {
        h = (g - b) / (max - min) + (g < b ? 6 : 0);
      } else if (max === g) {
        h = (b - r) / (max - min) + 2;
      } else {
        h = (r - g) / (max - min) + 4;
      }
      h *= 60;
    }
    
    // Round values
    h = Math.round(h);
    s = Math.round(s * 100);
    l = Math.round(l * 100);
    
    return `${h} ${s}% ${l}%`;
  };

  // Save theme to localStorage when form is submitted
  const onSaveTheme = (data: ThemeFormValues) => {
    localStorage.setItem("appTheme", JSON.stringify(data));
    applyThemeColors(data);
    toast.success("Theme colors saved and applied!");
  };
  
  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Update URL without full page reload
    const newSearchParams = new URLSearchParams(location.search);
    if (value === "theme") {
      newSearchParams.set("tab", "theme");
    } else {
      newSearchParams.delete("tab");
    }
    
    const newUrl = `${location.pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`;
    window.history.pushState({}, '', newUrl);
  };
  
  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Donation Page Editor</CardTitle>
            <CardDescription>You need to be logged in to access this page</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-2">
            <Link to="/settings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Settings
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Donation Page Editor</h1>
        </div>
      </div>
      
      <Tabs 
        value={activeTab} 
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-2 w-[400px]">
          <TabsTrigger value="donation">Donation Page</TabsTrigger>
          <TabsTrigger value="theme">App Theme</TabsTrigger>
        </TabsList>
        
        <TabsContent value="donation">
          <div className="grid grid-cols-1 gap-6">
            <DonationPageCustomizerFull />
          </div>
        </TabsContent>
        
        <TabsContent value="theme">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PaintBucket className="mr-2 h-5 w-5 text-brand-500" />
                Theme Color Customization
              </CardTitle>
              <CardDescription>
                Customize the colors used throughout the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...themeForm}>
                <form onSubmit={themeForm.handleSubmit(onSaveTheme)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Primary Colors */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Primary Colors</h3>
                      
                      <FormField
                        control={themeForm.control}
                        name="primaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Color</FormLabel>
                            <FormControl>
                              <ColorPicker color={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormDescription>
                              Main brand color for buttons and interactive elements
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={themeForm.control}
                        name="primaryForeground"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Foreground</FormLabel>
                            <FormControl>
                              <ColorPicker color={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormDescription>
                              Text color that appears on primary color backgrounds
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Secondary Colors */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Secondary Colors</h3>
                      
                      <FormField
                        control={themeForm.control}
                        name="secondaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secondary Color</FormLabel>
                            <FormControl>
                              <ColorPicker color={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormDescription>
                              Used for secondary buttons and elements
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={themeForm.control}
                        name="secondaryForeground"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secondary Foreground</FormLabel>
                            <FormControl>
                              <ColorPicker color={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormDescription>
                              Text color for secondary elements
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Background Colors */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Background & Text</h3>
                      
                      <FormField
                        control={themeForm.control}
                        name="backgroundColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Background Color</FormLabel>
                            <FormControl>
                              <ColorPicker color={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormDescription>
                              Main background color for the application
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={themeForm.control}
                        name="foregroundColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Foreground Color</FormLabel>
                            <FormControl>
                              <ColorPicker color={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormDescription>
                              Main text color for the application
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Accent Colors */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Accent Colors</h3>
                      
                      <FormField
                        control={themeForm.control}
                        name="accentColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Accent Color</FormLabel>
                            <FormControl>
                              <ColorPicker color={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormDescription>
                              Used for highlights and subtle backgrounds
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={themeForm.control}
                        name="accentForeground"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Accent Foreground</FormLabel>
                            <FormControl>
                              <ColorPicker color={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormDescription>
                              Text color for accent elements
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full">
                    <Check className="mr-2 h-4 w-4" />
                    Save & Apply Theme Colors
                  </Button>
                </form>
              </Form>
              
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Theme Color Preview</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-primary"></div>
                    <span className="mt-2 text-sm">Primary</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-secondary"></div>
                    <span className="mt-2 text-sm">Secondary</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-accent"></div>
                    <span className="mt-2 text-sm">Accent</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-background border"></div>
                    <span className="mt-2 text-sm">Background</span>
                  </div>
                </div>
                
                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-primary text-primary-foreground rounded-md">
                    Primary button style
                  </div>
                  <div className="p-4 bg-secondary text-secondary-foreground rounded-md">
                    Secondary button style
                  </div>
                  <div className="p-4 bg-accent text-accent-foreground rounded-md">
                    Accent element style
                  </div>
                  <div className="p-4 bg-background text-foreground border rounded-md">
                    Background with text
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Theme changes will be saved to your browser's local storage and applied to the entire application.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DonationEditorPage;
