
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

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
  const [activeStyle, setActiveStyleState] = React.useState<AlertStyle | null>(null);
  const [allStyles, setAllStyles] = React.useState<AlertStyle[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  // Fetch all styles and identify active one
  React.useEffect(() => {
    async function fetchStyles() {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('alert_styles')
          .select('*')
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
        }
      } catch (err) {
        console.error('Error fetching alert styles:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch alert styles'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchStyles();
  }, []);

  // Update active style in database
  const setActiveStyle = async (style: AlertStyle) => {
    try {
      setIsLoading(true);
      console.log("Setting active style:", style);
      
      // First deactivate all styles
      await supabase
        .from('alert_styles')
        .update({ is_active: false })
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
