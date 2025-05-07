
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
 * Generates or retrieves an OBS access token for the current user
 * This token is used to authenticate OBS browser sources
 */
export const getOrCreateOBSToken = async () => {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("No authenticated user found");
      return { error: "User not authenticated" };
    }

    console.log("Getting or creating OBS token for user:", user.id);

    // Check if the user already has a token
    const { data: existingToken, error: fetchError } = await supabase
      .from('obs_tokens')
      .select('token')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (fetchError) {
      console.error("Error fetching existing token:", fetchError);
      return { error: fetchError };
    }
    
    if (existingToken?.token) {
      console.log("Found existing OBS token");
      return { token: existingToken.token };
    }
    
    console.log("Creating new OBS token");
    // Generate a new secure token (UUID v4 for simplicity)
    const newToken = uuidv4();
    
    // Insert the new token into the database
    const { error: insertError } = await supabase
      .from('obs_tokens')
      .insert({
        user_id: user.id,
        token: newToken
      });
    
    if (insertError) {
      console.error("Error creating OBS token:", insertError);
      return { error: insertError };
    }
    
    return { token: newToken };
  } catch (err) {
    console.error("Exception in getOrCreateOBSToken:", err);
    return { error: err };
  }
};

/**
 * Validates an OBS token and returns the associated user ID
 */
export const validateOBSToken = async (token: string) => {
  try {
    if (!token) {
      console.error("No token provided");
      return { error: "No token provided" };
    }
    
    console.log("Validating OBS token:", token);
    
    // Find the token in the database
    const { data: tokenData, error } = await supabase
      .from('obs_tokens')
      .select('user_id, created_at')
      .eq('token', token)
      .maybeSingle();
    
    if (error) {
      console.error("Database error validating OBS token:", error);
      return { error: error };
    }
    
    if (!tokenData) {
      console.error("Token not found in database");
      return { error: "Token not found" };
    }
    
    console.log("Token validated successfully for user:", tokenData.user_id);
    
    // Update last_used_at timestamp
    await supabase
      .from('obs_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token', token);
    
    return { userId: tokenData.user_id };
  } catch (err) {
    console.error("Exception in validateOBSToken:", err);
    return { error: err };
  }
};

/**
 * Regenerates a new OBS token for the current user, invalidating any previous ones
 */
export const regenerateOBSToken = async () => {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("No authenticated user found");
      return { error: "User not authenticated" };
    }

    console.log("Regenerating OBS token for user:", user.id);
    
    // Generate a new secure token
    const newToken = uuidv4();
    
    // First delete any existing tokens for this user
    const { error: deleteError } = await supabase
      .from('obs_tokens')
      .delete()
      .eq('user_id', user.id);
    
    if (deleteError) {
      console.error("Error deleting existing tokens:", deleteError);
      return { error: deleteError };
    }
    
    // Create a new token
    const { error: insertError } = await supabase
      .from('obs_tokens')
      .insert({
        user_id: user.id,
        token: newToken
      });
    
    if (insertError) {
      console.error("Error creating regenerated OBS token:", insertError);
      return { error: insertError };
    }
    
    return { token: newToken };
  } catch (err) {
    console.error("Exception in regenerateOBSToken:", err);
    return { error: err };
  }
};

/**
 * Generates an OBS URL with the user's token and cache-busting parameters
 */
export const getOBSUrl = async (forceRegenerateToken = false) => {
  try {
    let tokenResult;
    
    if (forceRegenerateToken) {
      // Force regenerate a new token (will invalidate previous ones)
      tokenResult = await regenerateOBSToken();
    } else {
      // Get or create an OBS token for the current user
      tokenResult = await getOrCreateOBSToken();
    }
    
    const { token, error } = tokenResult;
    
    if (error || !token) {
      console.error("Error generating OBS token:", error);
      return null;
    }
    
    // Create the OBS URL with the token and a timestamp to prevent caching
    return `${window.location.origin}/live-alerts?obs=true&token=${token}&t=${new Date().getTime()}`;
  } catch (error) {
    console.error("Error generating OBS URL:", error);
    return null;
  }
};
