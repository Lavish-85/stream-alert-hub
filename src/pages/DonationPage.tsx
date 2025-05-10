
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
import { DollarSign, Gift, HandHeart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createOrder, loadRazorpayScript, openRazorpayCheckout, verifyPayment } from '@/services/razorpayService';

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
  
  // Initialize form
  const form = useForm<DonationFormValues>({
    resolver: zodResolver(donationFormSchema),
    defaultValues: {
      name: "",
      amount: 100,
      message: "",
    },
  });

  // Load streamer information
  useEffect(() => {
    const fetchStreamerInfo = async () => {
      if (!channelId) {
        toast.error("Invalid donation link");
        navigate("/");
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, streamer_name')
          .eq('id', channelId)
          .single();

        if (error || !data) {
          console.error("Error fetching streamer info:", error);
          toast.error("Could not find this streamer");
          return;
        }

        setStreamerInfo({
          name: data.streamer_name || data.display_name,
          avatar_url: data.avatar_url
        });
      } catch (err) {
        console.error("Exception fetching streamer info:", err);
        toast.error("Failed to load streamer information");
      }
    };

    // Load Razorpay script on component mount
    loadRazorpayScript();
    
    if (channelId) {
      fetchStreamerInfo();
    }
  }, [channelId, navigate]);

  const onSubmit = async (values: DonationFormValues) => {
    if (!channelId) {
      toast.error("Invalid donation link");
      return;
    }

    setIsLoading(true);
    
    try {
      // Create an order
      const orderResult = await createOrder({
        amount: values.amount,
        name: values.name,
        message: values.message,
        channelId: channelId
      });

      if (orderResult.error) {
        toast.error(orderResult.error);
        setIsLoading(false);
        return;
      }

      // Process payment with Razorpay
      openRazorpayCheckout(
        orderResult.orderId,
        orderResult.amount,
        values.name,
        channelId,
        async (response) => {
          // Handle successful payment
          const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = response;
          
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
            toast.error(verificationResult.error || "Payment verification failed");
          }
          
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.error("Exception processing donation:", err);
      toast.error("Failed to process donation");
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
                disabled={isLoading}
              >
                <Gift className="mr-2 h-4 w-4" />
                {isLoading ? "Processing..." : "Donate Now"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DonationPage;
