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
import { Loader2, Save, Palette, ImageIcon, Link2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ColorPicker } from "@/components/ui/color-picker";
import { convertToSponsorLogos, convertSponsorLogosToJson, SponsorLogo } from "@/utils/sponsorUtils";
import { toast as sonnerToast } from "sonner";

// Form schema for donation page settings
const donationPageSchema = z.object({
  customUrl: z.string()
    .min(3, { message: "Custom URL must be at least 3 characters" })
    .max(30, { message: "Custom URL must be at most 30 characters" })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: "Custom URL can only contain letters, numbers, underscores and hyphens" }),
  pageTitle: z.string().max(50, { message: "Title must be at most 50 characters" }).optional(),
  cardTitle: z.string().max(50, { message: "Card title must be at most 50 characters" }).optional(),
  bio: z.string().max(300, { message: "Bio must be at most 300 characters" }).optional(),
  goalAmount: z.coerce.number().min(0, { message: "Goal amount must be positive" }).optional(),
  showGoal: z.boolean().default(true),
  showRecentDonors: z.boolean().default(true),
  showSupporters: z.boolean().default(true),
  showAverage: z.boolean().default(true),
  showSponsors: z.boolean().default(true),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  sponsorBannerImage: z.string().optional(),
  sponsorBannerLink: z.string().optional(),
});

type DonationPageFormValues = z.infer<typeof donationPageSchema>;

const DonationCustomizePage = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [existingSettings, setExistingSettings] = useState<DonationPageFormValues | null>(null);
  const [sponsorLogos, setSponsorLogos] = useState<SponsorLogo[]>([]);
  const [newLogo, setNewLogo] = useState<Partial<SponsorLogo>>({
    id: '',
    url: '',
    alt: '',
    link: ''
  });
  
  // Initialize form with default values
  const form = useForm<DonationPageFormValues>({
    resolver: zodResolver(donationPageSchema),
    defaultValues: {
      customUrl: "",
      pageTitle: "",
      cardTitle: "Support",
      bio: "",
      goalAmount: 10000,
      showGoal: true,
      showRecentDonors: true,
      showSupporters: true,
      showAverage: true,
      showSponsors: true,
      primaryColor: "#8445ff", // Updated to match database default
      accentColor: "#4b1493", // Updated to match database default
      sponsorBannerImage: "",
      sponsorBannerLink: "",
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
          
          // Convert sponsor logos from JSON
          const logosList = convertToSponsorLogos(data.sponsor_logos);
          setSponsorLogos(logosList);

          // Update form with existing settings - mapping database column names to form field names
          form.reset({
            customUrl: data.custom_url || "",
            pageTitle: data.title || "", 
            cardTitle: data.title || "Support", // Using title as cardTitle since card_title doesn't exist
            bio: data.description || "", 
            goalAmount: data.goal_amount || 10000,
            showGoal: data.show_donation_goal ?? true,
            showRecentDonors: data.show_recent_donors ?? true,
            showSupporters: data.show_supporters ?? true,
            showAverage: data.show_average ?? true,
            showSponsors: data.show_sponsors ?? true,
            primaryColor: data.primary_color || "#8445ff",
            accentColor: data.secondary_color || "#4b1493",
            sponsorBannerImage: data.sponsor_banner_image || "",
            sponsorBannerLink: data.sponsor_banner_link || "",
          });
          
          setExistingSettings({
            customUrl: data.custom_url || "",
            pageTitle: data.title || "",
            cardTitle: data.title || "Support", // Using title as cardTitle since card_title doesn't exist
            bio: data.description || "",
            goalAmount: data.goal_amount || 10000,
            showGoal: data.show_donation_goal ?? true,
            showRecentDonors: data.show_recent_donors ?? true,
            showSupporters: data.show_supporters ?? true,
            showAverage: data.show_average ?? true,
            showSponsors: data.show_sponsors ?? true,
            primaryColor: data.primary_color || "#8445ff",
            accentColor: data.secondary_color || "#4b1493",
            sponsorBannerImage: data.sponsor_banner_image || "",
            sponsorBannerLink: data.sponsor_banner_link || "",
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
      
      // Convert sponsor logos to JSON for database storage
      const sponsorLogosJson = convertSponsorLogosToJson(sponsorLogos);
      
      let result;
      
      if (existingRecord) {
        // Update existing record
        result = await supabase
          .from('donation_page_settings')
          .update({
            custom_url: values.customUrl,
            title: values.cardTitle || 'Support', // Using cardTitle for both title (no separate card_title column)
            description: values.bio || null,
            goal_amount: values.goalAmount || 10000,
            show_donation_goal: values.showGoal,
            show_recent_donors: values.showRecentDonors,
            show_supporters: values.showSupporters,
            show_average: values.showAverage,
            show_sponsors: values.showSponsors,
            primary_color: values.primaryColor || "#8445ff",
            secondary_color: values.accentColor || "#4b1493",
            sponsor_banner_image: values.sponsorBannerImage || null,
            sponsor_banner_link: values.sponsorBannerLink || null,
            sponsor_logos: sponsorLogosJson,
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
            title: values.cardTitle || 'Support', // Using cardTitle for both title (no separate card_title column)
            description: values.bio || null,
            goal_amount: values.goalAmount || 10000,
            show_donation_goal: values.showGoal,
            show_recent_donors: values.showRecentDonors,
            show_supporters: values.showSupporters,
            show_average: values.showAverage,
            show_sponsors: values.showSponsors,
            primary_color: values.primaryColor || "#8445ff",
            secondary_color: values.accentColor || "#4b1493",
            sponsor_banner_image: values.sponsorBannerImage || null,
            sponsor_banner_link: values.sponsorBannerLink || null,
            sponsor_logos: sponsorLogosJson,
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

  // Functions to manage sponsor logos
  const addSponsorLogo = () => {
    // Validate required fields
    if (!newLogo.url || !newLogo.alt) {
      sonnerToast.error("Logo URL and alt text are required");
      return;
    }
    
    // Generate a unique ID if not provided
    const logoToAdd: SponsorLogo = {
      id: newLogo.id || `logo_${Date.now()}`,
      url: newLogo.url,
      alt: newLogo.alt,
      link: newLogo.link
    };
    
    setSponsorLogos([...sponsorLogos, logoToAdd]);
    
    // Reset form
    setNewLogo({ id: '', url: '', alt: '', link: '' });
    
    sonnerToast.success("Sponsor logo added");
  };
  
  const removeSponsorLogo = (id: string) => {
    setSponsorLogos(sponsorLogos.filter(logo => logo.id !== id));
    sonnerToast.success("Sponsor logo removed");
  };

  // Watch color values for preview
  const primaryColor = form.watch("primaryColor");
  const accentColor = form.watch("accentColor");
  const cardTitle = form.watch("cardTitle");
  const showSupporters = form.watch("showSupporters");
  const showAverage = form.watch("showAverage");
  const showSponsors = form.watch("showSponsors");
  
  // Create a render function for the sponsor banner preview
  const renderSponsorBannerPreview = (imageUrl: string) => {
    if (!imageUrl) return (
      <p className="text-muted-foreground">No banner image set</p>
    );
    
    return (
      <img 
        src={imageUrl} 
        alt="Sponsor banner preview" 
        className="object-cover w-full h-full" 
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/500x100?text=Banner+Preview';
        }}
      />
    );
  };
  
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
              <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
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
                      
                      <FormField
                        control={form.control}
                        name="showSupporters"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <FormLabel>Show supporters count</FormLabel>
                              <FormDescription>
                                Display the number of supporters on your page
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
                        name="showAverage"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <FormLabel>Show average donation</FormLabel>
                              <FormDescription>
                                Display the average donation amount on your page
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
                        name="showSponsors"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <FormLabel>Show sponsors</FormLabel>
                              <FormDescription>
                                Display your sponsor logos and banner on your page
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
                                <ColorPicker color={field.value || "#8445ff"} onChange={field.onChange} className="w-full" />
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
                                <ColorPicker color={field.value || "#4b1493"} onChange={field.onChange} className="w-full" />
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
                        name="cardTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Card Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Support"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Title shown on the donation card
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
                
                <TabsContent value="sponsors" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Sponsor Banner</CardTitle>
                      <CardDescription>
                        Add a banner image for your main sponsor
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="sponsorBannerImage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Banner Image URL</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="https://example.com/sponsor-banner.png"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              URL to your sponsor's banner image
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="sponsorBannerLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Banner Link</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <Link2 className="h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="https://sponsor-website.com"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              URL that opens when visitors click on your sponsor banner
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                      
                      {form.watch("sponsorBannerImage") && (
                        <div className="mt-2 p-2 border rounded-md">
                          <p className="text-xs text-muted-foreground mb-1">Banner preview:</p>
                          <div className="aspect-[5/1] bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                            {renderSponsorBannerPreview(form.watch("sponsorBannerImage") || "")}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Sponsor Logos</CardTitle>
                      <CardDescription>
                        Add logos of your sponsors to display on your donation page
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="space-y-4 p-4 border rounded-md">
                        <h4 className="text-sm font-medium">Add New Sponsor Logo</h4>
                        
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <Label htmlFor="logoUrl">Logo Image URL</Label>
                            <div className="flex items-center space-x-2 mt-1">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              <Input
                                id="logoUrl"
                                placeholder="https://example.com/logo.png"
                                value={newLogo.url || ''}
                                onChange={(e) => setNewLogo({...newLogo, url: e.target.value})}
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="logoAlt">Logo Alt Text</Label>
                            <Input
                              id="logoAlt"
                              placeholder="Sponsor Name"
                              value={newLogo.alt || ''}
                              onChange={(e) => setNewLogo({...newLogo, alt: e.target.value})}
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="logoLink">Logo Link (Optional)</Label>
                            <div className="flex items-center space-x-2 mt-1">
                              <Link2 className="h-4 w-4 text-muted-foreground" />
                              <Input
                                id="logoLink"
                                placeholder="https://sponsor-website.com"
                                value={newLogo.link || ''}
                                onChange={(e) => setNewLogo({...newLogo, link: e.target.value})}
                              />
                            </div>
                          </div>
                          
                          <Button 
                            type="button" 
                            onClick={addSponsorLogo}
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add Logo
                          </Button>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Current Sponsor Logos</h4>
                        
                        {sponsorLogos.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                            {sponsorLogos.map((logo) => (
                              <div key={logo.id} className="border rounded-md p-3 flex flex-col">
                                <div className="h-16 flex items-center justify-center mb-2 bg-gray-50 rounded overflow-hidden">
                                  <img 
                                    src={logo.url} 
                                    alt={logo.alt} 
                                    className="max-h-14 max-w-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150x50?text=Logo';
                                    }} 
                                  />
                                </div>
                                <div className="text-xs truncate text-center mb-1">{logo.alt}</div>
                                <div className="mt-auto pt-2">
                                  <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    className="w-full"
                                    onClick={() => removeSponsorLogo(logo.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 bg-muted/30 rounded-md">
                            <p className="text-muted-foreground">No sponsor logos added yet</p>
                          </div>
                        )}
                      </div>
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
                <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto color-transition"
                  style={{ 
                    background: `linear-gradient(to bottom, ${primaryColor}10, ${accentColor}05)`
                  }}>
                  <div className="w-full max-w-xs px-4 py-6 bg-white rounded-md shadow-md border flex flex-col items-center space-y-2 color-transition">
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
                      className="w-full h-2 rounded-full mt-1 mb-2 color-transition" 
                      style={{
                        backgroundColor: `${primaryColor}40`,
                        background: `linear-gradient(to right, ${primaryColor} 50%, ${primaryColor}40 50%)`
                      }}
                    />
                    <div className="w-full text-center font-medium mb-2 color-transition">
                      {cardTitle || "Support"}
                    </div>
                    
                    {/* Supporter/Average metrics preview */}
                    {(showSupporters || showAverage) && (
                      <div className="w-full flex justify-around mb-2">
                        {showSupporters && (
                          <div className="text-center flex-1">
                            <div className="text-xs text-gray-500">Supporters</div>
                            <div className="font-bold">12</div>
                          </div>
                        )}
                        
                        {showAverage && (
                          <div className="text-center flex-1">
                            <div className="text-xs text-gray-500">Average</div>
                            <div className="font-bold">₹500</div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Sponsor section preview */}
                    {showSponsors && sponsorLogos.length > 0 && (
                      <div className="w-full mt-2 mb-3">
                        <div className="text-xs text-center text-gray-500 mb-1">Sponsors</div>
                        <div className="flex flex-wrap justify-center gap-2">
                          {sponsorLogos.slice(0, 3).map((logo) => (
                            <div key={logo.id} className="h-8 w-12 bg-gray-50 rounded p-1 flex items-center justify-center">
                              <img 
                                src={logo.url} 
                                alt={logo.alt} 
                                className="max-h-6 max-w-full object-contain"
                              />
                            </div>
                          ))}
                          {sponsorLogos.length > 3 && (
                            <div className="h-8 w-8 bg-gray-50 rounded p-1 flex items-center justify-center text-xs text-gray-500">
                              +{sponsorLogos.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      className="w-full donation-button color-transition" 
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
