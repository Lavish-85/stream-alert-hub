
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
import { DollarSign, Gift, HandHeart, Heart, AlertCircle, Star, Users } from "lucide-react";
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
        // Fetch streamer profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, streamer_name')
          .eq('id', channelId)
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
          setStreamerInfo({
            name: profile.streamer_name || profile.display_name,
            avatar_url: profile.avatar_url,
            bio: "Thank you for supporting my content! Your donations help me create better streams for everyone."
          });
        }

        // Fetch donation stats
        const { data: donations, error: donationsError } = await supabase
          .from('donations')
          .select('amount, donor_name, created_at')
          .eq('user_id', channelId)
          .order('created_at', { ascending: false });

        if (!donationsError && donations) {
          const total = donations.reduce((sum, donation) => sum + donation.amount, 0);
          const uniqueDonors = new Set(donations.map(d => d.donor_name)).size;
          const average = donations.length > 0 ? Math.round(total / donations.length) : 0;
          
          setDonationStats({
            total,
            supporters: uniqueDonors,
            goal: Math.max(10000, Math.ceil(total * 1.5 / 10000) * 10000), // Set goal higher than current total
            average
          });
          
          // Process recent donations for the RecentDonors component
          const recent = donations.slice(0, 5).map(donation => ({
            id: `${donation.donor_name}-${donation.created_at}`,
            name: donation.donor_name,
            amount: donation.amount,
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
      
      // Create an order directly in the database
      const paymentId = `manual_${Date.now()}_${Math.round(Math.random() * 1000000)}`;
      
      // Insert donation record
      const { error: donationError } = await supabase
        .from('donations')
        .insert({
          amount: values.amount,
          donor_name: values.name,
          message: values.message || "",
          user_id: channelId,
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

      // Show success and set donation as complete
      toast({
        title: "Thank you for your donation!",
        description: "Your donation has been received.",
      });
      setDonationComplete(true);
      
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

  // Handle donation success page
  if (donationComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-lg animate-fade-in">
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
            <div className="mb-6 flex flex-col items-center">
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
              <div className="w-full max-w-xs mx-auto">
                <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-4">
                  <p className="font-medium">Your donation will:</p>
                  <ul className="text-sm mt-2 text-left list-disc list-inside">
                    <li>Appear in their stream shortly</li>
                    <li>Help them create better content</li>
                    <li>Support their creative journey</li>
                  </ul>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground italic">
              "Your generosity means the world to me!" - {streamerInfo?.name}
            </p>
          </CardContent>
          <CardFooter className="flex justify-center gap-3">
            <Button onClick={() => setDonationComplete(false)} variant="outline">
              <Heart className="mr-1 h-4 w-4" />
              Donate Again
            </Button>
            <Button onClick={() => navigate("/")} variant="default">
              Return Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Display error state if there's an error
  if (error && !isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 p-4">
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-50 to-indigo-100 p-4">
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
                  <div className="bg-white bg-opacity-60 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-emerald-600" /> 
                        Total Donated
                      </h4>
                      <span className="text-lg font-bold">₹{donationStats.total.toLocaleString()}</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                    <div className="mt-1 text-xs text-right text-muted-foreground">
                      Goal: ₹{donationStats.goal.toLocaleString()}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <div className="text-center flex-1">
                      <div className="flex items-center justify-center">
                        <Users className="h-4 w-4 mr-1 text-blue-600" />
                        <span className="text-lg font-bold">{donationStats.supporters}</span>
                      </div>
                      <span className="text-xs">Supporters</span>
                    </div>
                    <div className="text-center flex-1">
                      <div className="flex items-center justify-center">
                        <Star className="h-4 w-4 mr-1 text-amber-500" />
                        <span className="text-lg font-bold">₹{donationStats.average}</span>
                      </div>
                      <span className="text-xs">Average</span>
                    </div>
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
            
            {/* Recent Donors section */}
            {recentDonors.length > 0 && (
              <RecentDonors donors={recentDonors} className="animate-fade-in-delayed" />
            )}
          </div>
        </div>

        {/* Donation Form Column */}
        <Card className="w-full md:w-2/3 shadow-lg animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-800">
              Support {streamerInfo?.name || "this Streamer"}
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
                          ${selectedAmount === amount ? 'ring-2 ring-brand-500 ring-offset-1' : ''}
                          hover:scale-105 transition-transform
                        `}
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
                            <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
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
                        className="w-full relative overflow-hidden transition-all group bg-gradient-to-r from-brand-500 to-brand-700"
                        disabled={isLoading}
                      >
                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-brand-600 to-brand-800 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                        <span className="relative flex items-center justify-center">
                          <Gift className="mr-2 h-4 w-4" />
                          {isLoading ? "Processing..." : "Donate Now"}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-brand-50 border-brand-100">
                      <p>Your donation will be displayed on stream!</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </form>
            </Form>
            
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="bg-brand-50 p-3 rounded-md">
                <h4 className="font-semibold text-sm text-brand-800 mb-1 flex items-center">
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
    </div>
  );
};

export default DonationPage;
