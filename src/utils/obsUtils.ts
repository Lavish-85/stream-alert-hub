
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
      
      // Update last_used_at timestamp to prevent premature expiration
      await supabase
        .from('obs_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('token', existingToken.token);
        
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
        token: newToken,
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString()
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
 * Improved to be more robust with detailed logging
 */
export const validateOBSToken = async (token: string) => {
  try {
    if (!token) {
      console.error("No token provided");
      return { error: "No token provided" };
    }
    
    console.log("Validating OBS token:", token);
    
    // Find the token in the database with more detailed logging
    const { data: tokenData, error } = await supabase
      .from('obs_tokens')
      .select('user_id, created_at, last_used_at')
      .eq('token', token)
      .maybeSingle();
    
    // Log detailed information about the query result
    console.log("Token validation query result:", { 
      tokenData: tokenData ? "Found" : "Not found", 
      error: error || "No error" 
    });
    
    if (error) {
      console.error("Database error validating OBS token:", error);
      return { error: error };
    }
    
    if (!tokenData) {
      console.error("Token not found in database");
      
      // Additional logging to help debug
      const { count, error: countError } = await supabase
        .from('obs_tokens')
        .select('*', { count: 'exact', head: true });
      
      console.log(`Total tokens in database: ${count || 'unknown'}, Query error: ${countError || 'None'}`);
      
      return { error: "Token not found" };
    }
    
    // Calculate token age in days to check for expiration
    const createdAt = new Date(tokenData.created_at);
    const now = new Date();
    const tokenAgeInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // Token expiration check - expires after 30 days of creation
    if (tokenAgeInDays > 30) {
      console.error("Token expired (older than 30 days)");
      return { error: "Token expired" };
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
    // Note: We're explicitly using delete and insert instead of upsert to avoid potential issues
    const { error: deleteError } = await supabase
      .from('obs_tokens')
      .delete()
      .eq('user_id', user.id);
    
    if (deleteError) {
      console.error("Error deleting existing tokens:", deleteError);
      return { error: deleteError };
    }
    
    // Create a new token AFTER confirming deletion was successful
    const { error: insertError } = await supabase
      .from('obs_tokens')
      .insert({
        user_id: user.id,
        token: newToken,
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error("Error creating regenerated OBS token:", insertError);
      return { error: insertError };
    }
    
    console.log("Successfully regenerated OBS token");
    return { token: newToken };
  } catch (err) {
    console.error("Exception in regenerateOBSToken:", err);
    return { error: err };
  }
};

/**
 * Generates an OBS URL with the user's token and cache-busting parameters
 * Enhanced with stronger cache-busting and forced regeneration capability
 */
export const getOBSUrl = async (forceRegenerateToken = false) => {
  try {
    let tokenResult;
    
    if (forceRegenerateToken) {
      // Force regenerate a new token (will invalidate previous ones)
      console.log("Forcing token regeneration");
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
    
    // Create the OBS URL with the token and stronger cache-busting parameters
    // Add a unique ID to prevent caching issues
    const uniqueId = uuidv4().substring(0, 8);
    const timestamp = new Date().getTime();
    const baseUrl = typeof window !== 'undefined' ? 
      window.location.origin : 
      'https://your-app-url.com'; // Fallback for SSR contexts
    
    console.log("Generated OBS URL with token, timestamp, and uniqueId");
    return `${baseUrl}/live-alerts?obs=true&token=${token}&t=${timestamp}&uid=${uniqueId}`;
  } catch (error) {
    console.error("Error generating OBS URL:", error);
    return null;
  }
};

/**
 * Checks if an OBS token exists for the current user
 */
export const checkUserHasToken = async () => {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("No authenticated user found");
      return { hasToken: false, error: "User not authenticated" };
    }

    // Check if the user already has a token
    const { data: existingToken, error: fetchError } = await supabase
      .from('obs_tokens')
      .select('token')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (fetchError) {
      console.error("Error checking for existing token:", fetchError);
      return { hasToken: false, error: fetchError };
    }
    
    return { 
      hasToken: !!existingToken?.token,
      token: existingToken?.token 
    };
  } catch (err) {
    console.error("Exception in checkUserHasToken:", err);
    return { hasToken: false, error: err };
  }
};
