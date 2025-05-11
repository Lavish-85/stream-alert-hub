
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import { IndianRupee, Gift, HandHeart, Heart, AlertCircle, Star, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createOrder, loadRazorpayScript, openRazorpayCheckout, verifyPayment } from '@/services/razorpayService';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import RecentDonors from "@/components/donation/RecentDonors";

// Suggested donation amounts
const SUGGESTED_AMOUNTS = [100, 500, 1000, 2000];

// Form schema
const donationFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  amount: z.coerce.number().min(1, { message: "Amount must be at least 1" }),
  message: z.string().optional(),
});

type DonationFormValues = z.infer<typeof donationFormSchema>;

const DonationPage = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [streamerInfo, setStreamerInfo] = useState<{ 
    name?: string; 
    avatar_url?: string;
    bio?: string;
  } | null>(null);
  const [donationComplete, setDonationComplete] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [donationStats, setDonationStats] = useState({
    total: 0,
    supporters: 0,
    goal: 10000, // Default goal
    average: 0
  });
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [recentDonors, setRecentDonors] = useState<Array<{
    id: string;
    name: string;
    amount: number;
    date: string;
    avatarUrl?: string;
  }>>([]);
  
  // Add state for theme colors
  const [themeColors, setThemeColors] = useState({
    primary: '#8445ff',
    accent: '#4b1493'
  });
  
  // Add state for display settings
  const [displaySettings, setDisplaySettings] = useState({
    showGoal: true,
    showRecentDonors: true,
    showSupporters: true,
    showAverage: true
  });
  
  // Initialize form
  const form = useForm<DonationFormValues>({
    resolver: zodResolver(donationFormSchema),
    defaultValues: {
      name: "",
      amount: 100,
      message: "",
    },
  });

  // Update the form value when selectedAmount changes
  useEffect(() => {
    form.setValue("amount", selectedAmount);
  }, [selectedAmount, form]);

  // Set up real-time subscription for donations
  useEffect(() => {
    if (!channelId) return;

    // Determine the actual user ID (handling custom URL case)
    const determineUserIdAndSubscribe = async () => {
      // Check if this is a custom URL - using the correct table name: donation_page_settings
      let userId = channelId;
      const { data: customUrlData, error: customUrlError } = await supabase
        .from('donation_page_settings')
        .select('user_id')
        .ilike('custom_url', channelId)
        .maybeSingle();
        
      if (!customUrlError && customUrlData) {
        userId = customUrlData.user_id;
      }

      // Subscribe to real-time updates for this user's donations
      const channel = supabase
        .channel('public:donations')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'donations',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          console.log('New donation received:', payload);
          
          // Format the new donation
          const newDonation = {
            id: `${payload.new.donor_name}-${payload.new.created_at}`,
            name: payload.new.donor_name,
            amount: Number(payload.new.amount),
            date: new Date(payload.new.created_at || '').toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric'
            }),
          };
          
          // Update the donation stats
          setDonationStats(prev => ({
            ...prev,
            total: prev.total + Number(payload.new.amount),
            supporters: prev.supporters + 1,
            average: Math.round((prev.total + Number(payload.new.amount)) / (prev.supporters + 1))
          }));
          
          // Update recent donors list
          setRecentDonors(prev => {
            const updated = [newDonation, ...prev].slice(0, 5);
            return updated;
          });
        })
        .subscribe();
        
      // Return cleanup function
      return () => {
        supabase.removeChannel(channel);
      };
    };
    
    determineUserIdAndSubscribe();
  }, [channelId]);

  // Load streamer information
  useEffect(() => {
    const fetchStreamerInfo = async () => {
      if (!channelId) {
        setError("Invalid donation link");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Invalid donation link",
        });
        return;
      }

      try {
        console.log("Fetching streamer info for channelId:", channelId);
        
        // First try to find by custom URL
        let userId = channelId;
        
        // Check if this is a custom URL - using the correct table name: donation_page_settings
        const { data: customUrlData, error: customUrlError } = await supabase
          .from('donation_page_settings')
          .select('user_id')
          .ilike('custom_url', channelId)
          .maybeSingle();
          
        if (customUrlError) {
          console.error("Error checking custom URL:", customUrlError);
        } else if (customUrlData) {
          console.log("Found user ID from custom URL:", customUrlData.user_id);
          userId = customUrlData.user_id;
        }
        
        // Fetch streamer profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, streamer_name')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching streamer info:", profileError);
          setError("Could not find this streamer");
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not find this streamer",
          });
          return;
        }

        if (profile) {
          console.log("Found streamer profile:", profile);
          
          // Also fetch additional settings - using the correct table name
          const { data: donationSettings } = await supabase
            .from('donation_page_settings')
            .select('description, title, goal_amount, show_donation_goal, show_recent_donors, primary_color, secondary_color')
            .eq('user_id', userId)
            .maybeSingle();
            
          setStreamerInfo({
            name: donationSettings?.title || profile.streamer_name || profile.display_name,
            avatar_url: profile.avatar_url,
            bio: donationSettings?.description || "Thank you for supporting my content! Your donations help me create better streams for everyone."
          });
          
          // Update goal if we have custom settings
          if (donationSettings) {
            setDonationStats(prev => ({
              ...prev,
              goal: donationSettings.goal_amount || 10000
            }));
            
            // Set theme colors from donation settings
            if (donationSettings.primary_color && donationSettings.secondary_color) {
              setThemeColors({
                primary: donationSettings.primary_color,
                accent: donationSettings.secondary_color
              });
              
              // Update CSS variables for progress bar and other themed elements
              document.documentElement.style.setProperty('--progress-background', donationSettings.primary_color);
              document.documentElement.style.setProperty('--selection-color', donationSettings.primary_color);
            }
            
            // Update display settings based on streamer preferences
            setDisplaySettings({
              showGoal: donationSettings.show_donation_goal,
              showRecentDonors: donationSettings.show_recent_donors,
              showSupporters: true, // Default to true, will be updated if we add these settings
              showAverage: true // Default to true, will be updated if we add these settings
            });
          }
        } else {
          console.error("No streamer profile found for ID:", userId);
          setError("Streamer profile not found");
          toast({
            variant: "destructive",
            title: "Error",
            description: "Streamer profile not found",
          });
          return;
        }

        // Fetch donation stats
        const { data: donations, error: donationsError } = await supabase
          .from('donations')
          .select('amount, donor_name, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!donationsError && donations) {
          const total = donations.reduce((sum, donation) => sum + Number(donation.amount), 0);
          const uniqueDonors = new Set(donations.map(d => d.donor_name)).size;
          const average = donations.length > 0 ? Math.round(total / donations.length) : 0;
          
          setDonationStats(prev => ({
            ...prev,
            total,
            supporters: uniqueDonors,
            average,
          }));
          
          // Process recent donations for the RecentDonors component
          const recent = donations.slice(0, 5).map(donation => ({
            id: `${donation.donor_name}-${donation.created_at}`,
            name: donation.donor_name,
            amount: Number(donation.amount),
            date: new Date(donation.created_at || '').toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric'
            }),
          }));
          
          setRecentDonors(recent);
        }

      } catch (err) {
        console.error("Exception fetching streamer info:", err);
        setError("Failed to load streamer information");
        toast({
          variant: "destructive",
          title: "Error", 
          description: "Failed to load streamer information",
        });
      }
    };
    
    if (channelId) {
      fetchStreamerInfo();
    } else {
      setError("Invalid donation link - missing channel ID");
    }
  }, [channelId]);

  const onSubmit = async (values: DonationFormValues) => {
    if (!channelId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid donation link - missing channel ID",
      });
      setError("Invalid donation link - missing channel ID");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Processing donation with values:", values);
      
      // Get the user ID to associate with this donation
      let userId = channelId;
      
      // Check if this is a custom URL
      const { data: customUrlData, error: customUrlError } = await supabase
        .from('donation_page_settings')
        .select('user_id')
        .ilike('custom_url', channelId)
        .maybeSingle();
        
      if (customUrlError) {
        console.error("Error checking custom URL:", customUrlError);
      } else if (customUrlData) {
        console.log("Found user ID from custom URL:", customUrlData.user_id);
        userId = customUrlData.user_id;
      }
      
      // Create an order directly in the database
      const paymentId = `manual_${Date.now()}_${Math.round(Math.random() * 1000000)}`;
      
      console.log("Using user ID for donation:", userId);
      
      // Insert donation record
      const { error: donationError } = await supabase
        .from('donations')
        .insert({
          amount: values.amount,
          donor_name: values.name,
          message: values.message || "",
          user_id: userId,
          payment_id: paymentId
        });
        
      if (donationError) {
        console.error("Error creating donation:", donationError);
        toast({
          variant: "destructive",
          title: "Error",
          description: donationError.message,
        });
        setError(`Failed to process donation: ${donationError.message}`);
        setIsLoading(false);
        return;
      }

      // Show success popup instead of navigating away
      toast({
        title: "Thank you for your donation!",
        description: "Your donation has been received.",
      });
      setShowSuccessPopup(true);
      
      // Reset the form
      form.reset({
        name: "",
        amount: 100,
        message: "",
      });
      setSelectedAmount(100);
      
      setIsLoading(false);
    } catch (err) {
      console.error("Exception processing donation:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to process donation";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    form.setValue("amount", amount);
  };

  // Handle closing success popup
  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false);
  };

  // Display error state if there's an error
  if (error && !isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 p-4" 
        style={{ 
          background: `linear-gradient(to bottom, ${themeColors.primary}10, ${themeColors.accent}05)`
        }}>
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-red-600">
              <AlertCircle className="mx-auto mb-2 h-12 w-12" />
              Error
            </CardTitle>
            <CardDescription>
              We encountered a problem
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
            <p className="text-muted-foreground">
              Please try again later or contact support.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate("/")} variant="outline" className="mr-2">Return Home</Button>
            <Button onClick={() => window.location.reload()} variant="default">Try Again</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const progressPercentage = Math.min(100, Math.round((donationStats.total / donationStats.goal) * 100));

  // Success popup component
  const SuccessPopup = () => {
    if (!showSuccessPopup) return null;
    
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 animate-fade-in">
        <Card className="w-full max-w-md shadow-xl animate-scale-in">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-green-600">
              <HandHeart className="mx-auto mb-2 h-12 w-12" />
              Thank You!
            </CardTitle>
            <CardDescription>
              Your donation has been received
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mb-4 flex flex-col items-center">
              {streamerInfo?.avatar_url && (
                <Avatar className="h-16 w-16 mb-2">
                  <AvatarImage src={streamerInfo.avatar_url} alt={streamerInfo.name} />
                  <AvatarFallback>{streamerInfo.name?.charAt(0)}</AvatarFallback>
                </Avatar>
              )}
              <p className="mb-4 text-lg">
                Thank you for supporting{" "}
                <span className="font-bold">{streamerInfo?.name}</span>
              </p>
              <div className="bg-green-100 text-green-800 p-4 rounded-lg">
                <p className="font-medium">Your donation will:</p>
                <ul className="text-sm mt-2 text-left list-disc list-inside">
                  <li>Appear in their stream shortly</li>
                  <li>Help them create better content</li>
                  <li>Support their creative journey</li>
                </ul>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center gap-3">
            <Button 
              onClick={handleCloseSuccessPopup} 
              variant="default"
              style={{
                backgroundColor: themeColors.primary,
              }}
            >
              Continue
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 color-transition" 
      style={{ 
        background: `linear-gradient(to bottom, ${themeColors.primary}10, ${themeColors.accent}05)`
      }}>
      <div className="w-full max-w-4xl flex flex-col md:flex-row gap-4">
        {/* Streamer Info Column */}
        <div className="w-full md:w-1/3">
          <div className="space-y-4">
            <Card className="shadow-lg animate-fade-in">
              <CardHeader className="text-center">
                <div className="flex flex-col items-center mb-2">
                  <Avatar className="h-20 w-20 mb-2">
                    <AvatarImage src={streamerInfo?.avatar_url} alt={streamerInfo?.name} />
                    <AvatarFallback>{streamerInfo?.name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-xl">{streamerInfo?.name}</CardTitle>
                </div>
                <CardDescription className="text-center italic">
                  {streamerInfo?.bio || "Your support helps me create better content!"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {displaySettings.showGoal && (
                    <div className="bg-white bg-opacity-60 rounded-lg p-4" style={{
                      borderLeft: `4px solid ${themeColors.primary}`,
                      boxShadow: `0 2px 10px ${themeColors.primary}20`
                    }}>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold flex items-center">
                          <IndianRupee className="h-4 w-4 mr-1 text-emerald-600" /> 
                          Total Donated
                        </h4>
                        <span className="text-lg font-bold">₹{donationStats.total.toLocaleString()}</span>
                      </div>
                      {/* Apply themed colors to progress bar */}
                      <div className="relative pt-1">
                        <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-gray-200">
                          <div 
                            style={{
                              width: `${progressPercentage}%`,
                              backgroundColor: themeColors.primary,
                            }} 
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500"
                          ></div>
                        </div>
                      </div>
                      <div className="mt-1 flex justify-between items-center text-xs">
                        <div className="text-muted-foreground">
                          {progressPercentage}% Complete
                        </div>
                        <div className="text-right text-muted-foreground font-medium" style={{ color: themeColors.accent }}>
                          Goal: ₹{donationStats.goal.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    {displaySettings.showSupporters && (
                      <div className="text-center flex-1">
                        <div className="flex items-center justify-center">
                          <Users className="h-4 w-4 mr-1 text-blue-600" />
                          <span className="text-lg font-bold">{donationStats.supporters}</span>
                        </div>
                        <span className="text-xs">Supporters</span>
                      </div>
                    )}
                    
                    {displaySettings.showAverage && (
                      <div className="text-center flex-1">
                        <div className="flex items-center justify-center">
                          <Star className="h-4 w-4 mr-1 text-amber-500" />
                          <span className="text-lg font-bold">₹{donationStats.average}</span>
                        </div>
                        <span className="text-xs">Average</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col">
                <div className="flex flex-col w-full space-y-2 text-center">
                  <p className="text-xs font-medium text-muted-foreground w-full">
                    Your donation helps {streamerInfo?.name} create quality content
                  </p>
                </div>
              </CardFooter>
            </Card>
            
            {/* Recent Donors section - only show if enabled */}
            {displaySettings.showRecentDonors && channelId && (
              <RecentDonors 
                channelId={channelId} 
                initialDonors={recentDonors} 
                className="animate-fade-in-delayed" 
              />
            )}
          </div>
        </div>

        {/* Donation Form Column */}
        <Card className="w-full md:w-2/3 shadow-lg animate-fade-in">
          <CardHeader 
            className="text-center" 
            style={{ 
              background: `linear-gradient(to right, ${themeColors.primary}15, ${themeColors.accent}10)`,
              borderBottom: `1px solid ${themeColors.primary}30` 
            }}
          >
            <CardTitle className="text-2xl font-bold" style={{
              background: `linear-gradient(to right, ${themeColors.primary}, ${themeColors.accent})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {streamerInfo?.name ? `Support ${streamerInfo.name}` : "Support this Streamer"}
            </CardTitle>
            <CardDescription>
              Your donation will appear on stream and help support great content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} />
                      </FormControl>
                      <FormDescription>
                        This name will be shown with your donation
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-2">
                  <FormLabel>Donation Amount (INR)</FormLabel>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {SUGGESTED_AMOUNTS.map(amount => (
                      <Button 
                        key={amount} 
                        type="button"
                        variant={selectedAmount === amount ? "default" : "outline"} 
                        onClick={() => handleAmountSelect(amount)}
                        className={`
                          ${selectedAmount === amount ? `ring-2 ring-offset-1` : ''}
                          hover:scale-105 transition-transform
                        `}
                        style={selectedAmount === amount ? {
                          backgroundColor: themeColors.primary,
                          borderColor: themeColors.accent,
                        } : {}}
                      >
                        ₹{amount}
                      </Button>
                    ))}
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Custom Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                            <Input
                              type="number"
                              placeholder="Enter custom amount"
                              className="pl-10"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setSelectedAmount(parseInt(e.target.value) || 0);
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add a message for the streamer"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Your message will be displayed with your donation
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="submit"
                        className="w-full relative overflow-hidden transition-all group"
                        disabled={isLoading}
                        style={{
                          background: `linear-gradient(to right, ${themeColors.primary}, ${themeColors.accent})`,
                        }}
                      >
                        <span className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity" 
                          style={{
                            background: `linear-gradient(to right, ${themeColors.accent}, ${themeColors.primary})`,
                          }}></span>
                        <span className="relative flex items-center justify-center">
                          <Gift className="mr-2 h-4 w-4" />
                          {isLoading ? "Processing..." : "Donate Now"}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent style={{
                      backgroundColor: `${themeColors.primary}10`,
                      borderColor: `${themeColors.primary}30`,
                    }}>
                      <p>Your donation will be displayed on stream!</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </form>
            </Form>
            
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div style={{
                backgroundColor: `${themeColors.primary}10`,
                borderColor: `${themeColors.primary}30`,
              }} className="p-3 rounded-md">
                <h4 className="font-semibold text-sm mb-1 flex items-center" style={{ color: themeColors.accent }}>
                  <Heart className="h-3 w-3 mr-1" /> Why donate?
                </h4>
                <p className="text-xs text-muted-foreground">
                  Your donation helps {streamerInfo?.name} create better content, improve stream quality,
                  and continue entertaining viewers like you. Every contribution makes a difference!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Success Popup */}
      <SuccessPopup />
    </div>
  );
};

export default DonationPage;
