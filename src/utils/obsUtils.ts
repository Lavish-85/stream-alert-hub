
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

/**
 * Sends a test alert to the OBS browser source
 * This creates a temporary donation record in the database
 * that the LiveAlertsPage will pick up and display
 */
export const sendTestAlert = async () => {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("No authenticated user found");
      return { error: "User not authenticated" };
    }

    const testDonation = {
      payment_id: `test_${uuidv4().substring(0, 8)}`,
      amount: 100,
      donor_name: "Test Donation",
      message: "This is a test donation alert.",
      user_id: user.id
      // Removed is_test field as it doesn't exist in the database
    };

    // Insert the test donation into the database
    const { data, error } = await supabase
      .from('donations')
      .insert(testDonation)
      .select()
      .single();

    if (error) {
      console.error("Error sending test alert:", error);
      return { error };
    }

    return { data };
  } catch (err) {
    console.error("Exception in sendTestAlert:", err);
    return { error: err };
  }
};

/**
 * Generates an OBS URL with cache-busting parameters
 */
export const getOBSUrl = () => {
  // Get the current user's ID if available
  const getUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id;
  };

  // Use the current user's ID as a parameter if available
  return getUserId().then(userId => {
    const baseUrl = `${window.location.origin}/live-alerts?obs=true`;
    const timeParam = `t=${new Date().getTime()}`;
    const userParam = userId ? `&user_id=${userId}` : '';
    
    return `${baseUrl}&${timeParam}${userParam}`;
  });
};
