
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface AlertStyle {
  id: string;
  name: string;
  description: string | null;
  background_color: string;
  text_color: string;
  font_family: string | null;
  animation_type: string | null;
  sound: string | null;
  volume: number | null;
  duration: number | null;
  is_active: boolean | null;
  user_id: string | null;
}

interface AlertStyleContextType {
  activeStyle: AlertStyle | null;
  allStyles: AlertStyle[];
  setActiveStyle: (style: AlertStyle) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

const AlertStyleContext = React.createContext<AlertStyleContextType | undefined>(undefined);

export const AlertStyleProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [activeStyle, setActiveStyleState] = React.useState<AlertStyle | null>(null);
  const [allStyles, setAllStyles] = React.useState<AlertStyle[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  // Fetch all styles and identify active one
  React.useEffect(() => {
    async function fetchStyles() {
      // If no user is authenticated, don't try to fetch styles
      if (!user) {
        setAllStyles([]);
        setActiveStyleState(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('alert_styles')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw new Error(error.message);
        
        console.log("Fetched alert styles:", data);
        
        if (data && data.length > 0) {
          setAllStyles(data);
          const active = data.find(style => style.is_active === true);
          if (active) {
            console.log("Found active style:", active);
            setActiveStyleState(active);
          }
          else if (data.length > 0) {
            console.log("No active style found, using first style:", data[0]);
            setActiveStyleState(data[0]);
          }
        } else {
          console.log("No styles found in database");
          // Create a default style for new users
          if (user) {
            await createDefaultStyle(user.id);
          }
        }
      } catch (err) {
        console.error('Error fetching alert styles:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch alert styles'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchStyles();
  }, [user]);

  // Create default style for new users
  const createDefaultStyle = async (userId: string) => {
    try {
      const defaultStyle = {
        name: "Default Style",
        description: "Default alert style for your donations",
        background_color: "#4F46E5",
        text_color: "#FFFFFF",
        font_family: "inter",
        animation_type: "fade",
        sound: "chime",
        volume: 50,
        duration: 5,
        is_active: true,
        user_id: userId
      };

      const { data, error } = await supabase
        .from('alert_styles')
        .insert(defaultStyle)
        .select()
        .single();

      if (error) throw error;

      console.log("Created default style:", data);
      setAllStyles([data]);
      setActiveStyleState(data);
      
    } catch (err) {
      console.error("Error creating default style:", err);
    }
  };

  // Update active style in database
  const setActiveStyle = async (style: AlertStyle) => {
    try {
      if (!user) throw new Error("User not authenticated");
      
      setIsLoading(true);
      console.log("Setting active style:", style);
      
      // First deactivate all styles for this user
      await supabase
        .from('alert_styles')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .neq('id', style.id);
      
      // Then activate the selected style
      const { error } = await supabase
        .from('alert_styles')
        .update({ is_active: true })
        .eq('id', style.id);
      
      if (error) throw new Error(error.message);
      
      // Update local state
      setActiveStyleState(style);
      setAllStyles(prev => 
        prev.map(s => ({
          ...s,
          is_active: s.id === style.id
        }))
      );
      
      console.log("Style activated successfully");
      
      // Show toast notification about successful update
      toast("Alert style updated", {
        description: `Now using "${style.name}" for donation alerts`
      });
      
    } catch (err) {
      console.error('Error updating active style:', err);
      setError(err instanceof Error ? err : new Error('Failed to update active style'));
      // Fix: The sonner toast doesn't use a variant property directly in the toast function
      toast("Error updating style", {
        description: "Could not update alert style. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertStyleContext.Provider value={{ activeStyle, allStyles, setActiveStyle, isLoading, error }}>
      {children}
    </AlertStyleContext.Provider>
  );
};

export const useAlertStyle = () => {
  const context = React.useContext(AlertStyleContext);
  if (context === undefined) {
    throw new Error('useAlertStyle must be used within an AlertStyleProvider');
  }
  return context;
};
