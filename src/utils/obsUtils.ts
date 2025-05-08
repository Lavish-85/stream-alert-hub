
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

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

    console.log("Test alert sent successfully:", data);
    toast.success("Test alert sent");
    return { data };
  } catch (err) {
    console.error("Exception in sendTestAlert:", err);
    return { error: err };
  }
};

/**
 * Gets the OBS URL with the user's channel ID
 */
export const getOBSUrl = async () => {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("No authenticated user found");
      return null;
    }
    
    // Create the OBS URL with the user ID as channel
    const baseUrl = typeof window !== 'undefined' ? 
      window.location.origin : 
      'https://your-app-url.com'; // Fallback for SSR contexts
    
    return `${baseUrl}/live-alerts?obs=true&channel=${user.id}`;
  } catch (error) {
    console.error("Error generating OBS URL:", error);
    return null;
  }
};

/**
 * Checks if a user exists in the database
 */
export const checkUserHasToken = async () => {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("No authenticated user found");
      return { hasToken: false, error: "User not authenticated" };
    }

    // For Supabase Realtime approach, we don't need tokens anymore
    // Just check if the user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profileError) {
      console.error("Error checking user profile:", profileError);
      return { hasToken: false, error: profileError };
    }
    
    return { 
      hasToken: !!profile,
      userId: user.id 
    };
  } catch (err) {
    console.error("Exception in checkUserProfile:", err);
    return { hasToken: false, error: err };
  }
};

/**
 * Tests if the realtime subscription works
 * Returns a promise that resolves to true if a connection can be established
 */
export const testRealtimeConnection = async (channelId: string): Promise<boolean> => {
  try {
    let testSuccessful = false;
    let timeoutId: NodeJS.Timeout | null = null;
    
    return new Promise((resolve) => {
      // Set up a timeout to resolve the promise after 5 seconds if no success
      timeoutId = setTimeout(() => {
        console.log("Realtime test timed out");
        if (!testSuccessful) {
          resolve(false);
        }
      }, 5000);

      // Create a temporary channel to test if realtime is working
      const channel = supabase
        .channel(`test-${channelId}`)
        .on('presence', { event: 'sync' }, () => {
          console.log("Realtime presence sync successful");
          testSuccessful = true;
          if (timeoutId) clearTimeout(timeoutId);
          channel.unsubscribe();
          resolve(true);
        })
        .on('presence', { event: 'join' }, () => {
          console.log("Realtime presence join successful");
          testSuccessful = true;
          if (timeoutId) clearTimeout(timeoutId);
          channel.unsubscribe();
          resolve(true);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            console.log("Realtime subscription successful");
            await channel.track({ user: channelId, online_at: new Date().toISOString() });
          }
        });
        
      // Also test a Postgres change to be thorough
      supabase
        .channel(`test-postgres-${channelId}`)
        .on('postgres_changes', { 
          event: '*',
          schema: 'public',
          table: 'donations',
          filter: `user_id=eq.${channelId}`
        }, () => {
          console.log("Postgres changes subscription successful");
          testSuccessful = true;
          if (timeoutId) clearTimeout(timeoutId);
          resolve(true);
        })
        .subscribe();
    });
  } catch (error) {
    console.error("Error testing realtime connection:", error);
    return false;
  }
};
