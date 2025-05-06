import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  streamer_name?: string | null;
  channel_link?: string | null;
};

interface AuthContextType {
  user: any | null;
  session: any | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = React.useState<any | null>(null);
  const [session, setSession] = React.useState<any | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Clean up auth state - important to prevent auth limbo states
  const cleanupAuthState = () => {
    localStorage.removeItem('supabase.auth.token');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
  };

  // Load user profile data
  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error loading profile:", error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error("Error in loadProfile:", error);
    }
  };

  // Initialize auth state
  React.useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("Auth state changed:", event);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Defer loading profile to prevent Supabase SDK deadlocks
        if (currentSession?.user) {
          setTimeout(() => {
            loadProfile(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        // If signed out and not on auth page, redirect to auth
        if (event === 'SIGNED_OUT' && !window.location.pathname.includes('/auth')) {
          navigate('/auth');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        loadProfile(currentSession.user.id);
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Clean up existing state first
      cleanupAuthState();
      
      // Attempt global sign out before signing in
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
        console.error("Error during pre-signin signout:", err);
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast("Signed in successfully");
      navigate('/');
    } catch (error: any) {
      console.error("Error signing in:", error);
      toast("Error signing in", {
        description: error.message || "Please check your credentials and try again."
      });
      throw error; // Rethrow so the component can handle it
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, metadata: Record<string, any> = {}) => {
    try {
      setIsLoading(true);
      
      // Clean up existing state first
      cleanupAuthState();
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) throw error;
      
      // Check if user is already registered
      if (data.user && data.user.identities?.length === 0) {
        throw new Error("User already registered");
      }
      
      // If signup successful and not in confirmation required mode
      if (data.user && !data.session) {
        toast("Account created successfully", {
          description: "Please check your email for a confirmation link."
        });
      } else if (data.session) {
        // If signup and auto-signin successful
        toast("Account created successfully");
        
        // Update the profile with streamer information
        if (data.user && (metadata.streamer_name || metadata.channel_link)) {
          await supabase
            .from("profiles")
            .update({
              streamer_name: metadata.streamer_name,
              channel_link: metadata.channel_link
            })
            .eq("id", data.user.id);
        }
        
        navigate('/');
      }
    } catch (error: any) {
      console.error("Error signing up:", error);
      
      // Handle specific error messages
      let errorMessage = error.message || "Please try again with a different email.";
      
      toast("Error signing up", {
        description: errorMessage
      });
      
      throw error; // Rethrow so the component can handle it
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setIsLoading(true);
      
      // Clean up auth state
      cleanupAuthState();
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignore errors
        console.error("Error during signout:", err);
      }
      
      toast("Signed out successfully");
      navigate('/auth');
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast("Error signing out", {
        description: error.message || "Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;
      
      // Refresh profile data
      await loadProfile(user.id);
      
      toast("Profile updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast("Error updating profile", {
        description: error.message || "Please try again."
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
