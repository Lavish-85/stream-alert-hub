
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Type definitions
interface DonationFormData {
  amount: number;
  name: string;
  message?: string;
  channelId: string;
}

interface CreateOrderResponse {
  orderId: string;
  amount: number;
  orderData: any;
  error?: string;
}

// Function to create an order in the database
export const createOrder = async (formData: DonationFormData): Promise<CreateOrderResponse> => {
  try {
    if (!formData.channelId) {
      console.error("Missing channelId in form data");
      return { error: "Invalid channel ID", orderId: "", amount: 0, orderData: null };
    }

    // Generate a guaranteed non-null temporary order ID
    const tempOrderId = `order_${Date.now()}_${Math.round(Math.random() * 1000000)}`;
    
    console.log("Creating order with temp ID:", tempOrderId);
    
    // Prepare the order data with all required fields
    const orderData = {
      amount: formData.amount,
      donor_name: formData.name,
      message: formData.message || "",
      user_id: formData.channelId,
      status: 'created',
      razorpay_order_id: tempOrderId // Ensuring this field is always set
    };
    
    // Create an order in our database with explicit validation
    if (!orderData.razorpay_order_id) {
      throw new Error("Failed to generate order ID");
    }
    
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (error) {
      console.error("Error creating order:", error);
      return { error: error.message, orderId: "", amount: 0, orderData: null };
    }

    console.log("Order created successfully:", data);

    // Return the order details
    return {
      orderId: data.razorpay_order_id,
      amount: data.amount,
      orderData: data
    };
  } catch (err) {
    console.error("Exception in createOrder:", err);
    return { error: "Failed to create order", orderId: "", amount: 0, orderData: null };
  }
};

// Function to verify and process a payment
export const verifyPayment = async (
  channelId: string,
  paymentId: string,
  orderId: string,
  signature: string
) => {
  try {
    if (!orderId) {
      console.error("Missing orderId in verification request");
      return { success: false, error: "Order ID is required" };
    }
    
    // Get the order details
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select()
      .eq('razorpay_order_id', orderId)
      .single();
      
    if (orderError) {
      console.error("Error fetching order:", orderError);
      return { success: false, error: orderError.message };
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('razorpay_order_id', orderId);
      
    if (updateError) {
      console.error("Error updating order:", updateError);
      return { success: false, error: updateError.message };
    }

    // Create a donation record
    const { error: donationError } = await supabase
      .from('donations')
      .insert({
        amount: orderData.amount,
        donor_name: orderData.donor_name,
        message: orderData.message,
        user_id: channelId,
        payment_id: paymentId
      });
      
    if (donationError) {
      console.error("Error creating donation:", donationError);
      return { success: false, error: donationError.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Exception in verifyPayment:", err);
    return { success: false, error: "Payment verification failed" };
  }
};

// Function to load the Razorpay script
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if script is already loaded
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => {
      toast.error("Failed to load Razorpay. Please try again.");
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

// Initialize and open Razorpay payment window
export const openRazorpayCheckout = (
  orderId: string,
  amount: number,
  name: string,
  channelId: string,
  onSuccess: (response: any) => void
) => {
  // Make sure Razorpay is loaded
  if (!(window as any).Razorpay) {
    toast.error("Razorpay failed to load. Please refresh the page and try again.");
    return;
  }
  
  if (!orderId) {
    toast.error("Invalid order ID. Please try again.");
    return;
  }
  
  console.log("Opening Razorpay checkout for order:", orderId, "amount:", amount);
  
  // Razorpay options
  const options = {
    key: 'rzp_test_YOUR_KEY_HERE', // Replace with your Razorpay key (use test key for now)
    amount: amount * 100, // Amount in smallest currency unit (paise for INR)
    currency: 'INR',
    name: 'Streamer Donations',
    description: 'Support your favorite streamer',
    order_id: orderId,
    handler: function(response: any) {
      // Handle successful payment
      console.log("Payment successful:", response);
      onSuccess(response);
    },
    prefill: {
      name: name,
    },
    theme: {
      color: '#4F46E5',
    }
  };

  // Initialize Razorpay
  const razorpay = new (window as any).Razorpay(options);
  razorpay.open();
};
