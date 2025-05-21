
import { supabase } from "@/integrations/supabase/client";

// Function to send alerts through both WebSocket and Supabase
export const sendDonationAlert = async (
  userId: string,
  donation: {
    id?: number;
    payment_id: string;
    amount: number;
    donor_name: string;
    message: string | null;
    created_at?: string;
  }
) => {
  try {
    // First, try to send via custom WebSocket API
    await sendCustomWebSocketAlert(userId, donation);
    return true;
  } catch (error) {
    console.error("Error sending custom WebSocket alert:", error);
    
    // If custom WebSocket fails, the database insert will still trigger Supabase realtime
    console.log("Falling back to Supabase realtime for alert delivery");
    return false;
  }
};

// Helper function to send an alert through our custom WebSocket server
const sendCustomWebSocketAlert = async (userId: string, donation: any) => {
  const ALERT_API_URL = "https://alerts-ws.your-domain.com/api/send-alert";
  
  const response = await fetch(ALERT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      channelId: userId,
      alertData: {
        type: "donation",
        ...donation
      },
      // In a real implementation, you would have a server-side API key for authentication
      // This is just a placeholder
      token: "server_api_key"
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to send alert: ${response.statusText}`);
  }
  
  return await response.json();
};
