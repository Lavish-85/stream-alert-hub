
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
import { toast } from "sonner";
import { DollarSign, Gift, HandHeart, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createOrder, loadRazorpayScript, openRazorpayCheckout, verifyPayment } from '@/services/razorpayService';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const [streamerInfo, setStreamerInfo] = useState<{ name?: string; avatar_url?: string } | null>(null);
  const [donationComplete, setDonationComplete] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize form
  const form = useForm<DonationFormValues>({
    resolver: zodResolver(donationFormSchema),
    defaultValues: {
      name: "",
      amount: 100,
      message: "",
    },
  });

  // Load Razorpay script and streamer information
  useEffect(() => {
    const loadRazorpay = async () => {
      const loaded = await loadRazorpayScript();
      setRazorpayLoaded(loaded);
      if (!loaded) {
        setError("Could not load payment system. Please try again later.");
        toast.error("Could not load payment system. Please try again later.");
      }
    };
    
    const fetchStreamerInfo = async () => {
      if (!channelId) {
        setError("Invalid donation link");
        toast.error("Invalid donation link");
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, streamer_name')
          .eq('id', channelId)
          .maybeSingle();

        if (error || !data) {
          console.error("Error fetching streamer info:", error);
          setError("Could not find this streamer");
          toast.error("Could not find this streamer");
          return;
        }

        setStreamerInfo({
          name: data.streamer_name || data.display_name,
          avatar_url: data.avatar_url
        });
      } catch (err) {
        console.error("Exception fetching streamer info:", err);
        setError("Failed to load streamer information");
        toast.error("Failed to load streamer information");
      }
    };
    
    loadRazorpay();
    
    if (channelId) {
      fetchStreamerInfo();
    } else {
      setError("Invalid donation link - missing channel ID");
    }
  }, [channelId, navigate]);

  const onSubmit = async (values: DonationFormValues) => {
    if (!channelId) {
      toast.error("Invalid donation link");
      setError("Invalid donation link - missing channel ID");
      return;
    }

    if (!razorpayLoaded) {
      toast.error("Payment system is not ready. Please refresh the page.");
      setError("Payment system is not ready");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Creating donation order with values:", values);
      
      // Create an order
      const orderResult = await createOrder({
        amount: values.amount,
        name: values.name,
        message: values.message,
        channelId: channelId
      });

      if (orderResult.error) {
        console.error("Order creation error:", orderResult.error);
        toast.error(orderResult.error);
        setError(`Failed to create order: ${orderResult.error}`);
        setIsLoading(false);
        return;
      }

      if (!orderResult.orderId) {
        console.error("Missing order ID in order result:", orderResult);
        toast.error("Failed to generate order ID");
        setError("Failed to generate order ID");
        setIsLoading(false);
        return;
      }

      console.log("Order created successfully:", orderResult);

      // Process payment with Razorpay
      openRazorpayCheckout(
        orderResult.orderId,
        orderResult.amount,
        values.name,
        channelId,
        async (response) => {
          // Handle successful payment
          const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = response;
          
          console.log("Payment successful, verifying payment:", {
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id,
            signature: razorpay_signature
          });
          
          const verificationResult = await verifyPayment(
            channelId,
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature
          );

          if (verificationResult.success) {
            toast.success("Thank you for your donation!");
            setDonationComplete(true);
          } else {
            setError(verificationResult.error || "Payment verification failed");
            toast.error(verificationResult.error || "Payment verification failed");
          }
          
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.error("Exception processing donation:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to process donation";
      toast.error(errorMessage);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // Handle donation success page
  if (donationComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-lg">
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
            <p className="mb-4 text-lg">
              Thank you for supporting{" "}
              <span className="font-bold">{streamerInfo?.name}</span>
            </p>
            <p className="text-muted-foreground">
              Your donation will appear in their stream shortly.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate("/")} variant="outline">Return Home</Button>
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Support {streamerInfo?.name || "this Streamer"}</CardTitle>
          <CardDescription>
            Your donation will appear on stream
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
              
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Donation Amount (INR)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="100"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Choose any amount you'd like to donate
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
              
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !razorpayLoaded}
              >
                <Gift className="mr-2 h-4 w-4" />
                {isLoading ? "Processing..." : "Donate Now"}
              </Button>
              
              {!razorpayLoaded && (
                <p className="text-center text-sm text-amber-600">
                  Payment system is loading... Please wait.
                </p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DonationPage;
