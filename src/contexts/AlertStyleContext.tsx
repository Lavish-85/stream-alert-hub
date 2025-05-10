
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface AlertStyle {
  id: string;
  name: string;
  text_color: string;
  background_color: string;
  volume?: number;
  duration: number;
  animation_type?: "fade" | "slide" | "bounce" | "zoom"; // Fixed animation_type to be a union type
  sound?: string;
  font_family?: string;
  description?: string;
  is_active?: boolean;
  user_id?: string;
  created_at?: string;
  show_popup?: boolean;
}

interface AlertStyleContextType {
  activeStyle: AlertStyle | null;
  allStyles: AlertStyle[];
  setActiveStyle: (style: AlertStyle) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  updateStyleSetting: (style: AlertStyle) => Promise<void>; // Added missing method
  createStyle: (style: Omit<AlertStyle, 'id' | 'created_at'>) => Promise<void>; // Added missing method
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
          // Ensure data conforms to AlertStyle by mapping and validating animation_type
          const validatedStyles: AlertStyle[] = data.map(style => ({
            ...style,
            // Ensure animation_type is one of the allowed values
            animation_type: validateAnimationType(style.animation_type)
          }));
          
          setAllStyles(validatedStyles);
          const active = validatedStyles.find(style => style.is_active === true);
          if (active) {
            console.log("Found active style:", active);
            setActiveStyleState(active);
          }
          else if (validatedStyles.length > 0) {
            console.log("No active style found, using first style:", validatedStyles[0]);
            setActiveStyleState(validatedStyles[0]);
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
  
  // Helper function to validate animation_type
  const validateAnimationType = (type?: string): "fade" | "slide" | "bounce" | "zoom" => {
    if (type === "fade" || type === "slide" || type === "bounce" || type === "zoom") {
      return type;
    }
    return "fade"; // Default to fade if invalid type
  };

  // Create default style for new users
  const createDefaultStyle = async (userId: string) => {
    try {
      const defaultStyle = {
        name: "Default Style",
        description: "Default alert style for your donations",
        background_color: "#4F46E5",
        text_color: "#FFFFFF",
        font_family: "inter",
        animation_type: "fade" as const,
        sound: "chime",
        volume: 50,
        duration: 5,
        is_active: true,
        user_id: userId,
        show_popup: true
      };

      const { data, error } = await supabase
        .from('alert_styles')
        .insert(defaultStyle)
        .select()
        .single();

      if (error) throw error;

      console.log("Created default style:", data);
      
      // Cast the data to ensure TypeScript is happy about the animation_type
      const validatedStyle: AlertStyle = {
        ...data,
        animation_type: validateAnimationType(data.animation_type)
      };
      
      setAllStyles([validatedStyle]);
      setActiveStyleState(validatedStyle);
      
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
      toast("Error updating style", {
        description: "Could not update alert style. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // New method: update style settings
  const updateStyleSetting = async (style: AlertStyle): Promise<void> => {
    try {
      if (!user) throw new Error("User not authenticated");
      if (!style.id) throw new Error("Style ID is required");
      
      setIsLoading(true);
      
      // Ensure animation_type is valid
      const validatedStyle = {
        ...style,
        animation_type: validateAnimationType(style.animation_type)
      };
      
      // Update the style in the database
      const { error } = await supabase
        .from('alert_styles')
        .update({
          name: validatedStyle.name,
          text_color: validatedStyle.text_color,
          background_color: validatedStyle.background_color,
          volume: validatedStyle.volume,
          duration: validatedStyle.duration,
          animation_type: validatedStyle.animation_type,
          sound: validatedStyle.sound,
          font_family: validatedStyle.font_family,
          description: validatedStyle.description,
          show_popup: validatedStyle.show_popup
        })
        .eq('id', validatedStyle.id);
      
      if (error) throw new Error(error.message);
      
      // Update local state
      if (activeStyle?.id === validatedStyle.id) {
        setActiveStyleState(validatedStyle);
      }
      
      setAllStyles(prev => 
        prev.map(s => s.id === validatedStyle.id ? validatedStyle : s)
      );
      
      toast("Style updated", {
        description: `"${validatedStyle.name}" settings updated`
      });
      
    } catch (err) {
      console.error('Error updating style settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to update style settings'));
      toast("Error updating style", {
        description: "Could not update alert style. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // New method: create a new style
  const createStyle = async (styleData: Omit<AlertStyle, 'id' | 'created_at'>): Promise<void> => {
    try {
      if (!user) throw new Error("User not authenticated");
      
      setIsLoading(true);
      
      // Ensure animation_type is valid
      const validatedStyleData = {
        ...styleData,
        animation_type: validateAnimationType(styleData.animation_type),
        user_id: user.id
      };
      
      // Insert the new style
      const { data, error } = await supabase
        .from('alert_styles')
        .insert(validatedStyleData)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      if (!data) throw new Error("No data returned from style creation");
      
      // Cast the data to ensure TypeScript is happy about the animation_type
      const newStyle: AlertStyle = {
        ...data,
        animation_type: validateAnimationType(data.animation_type)
      };
      
      // Update local state
      setAllStyles(prev => [newStyle, ...prev]);
      
      // Set as active if requested
      if (newStyle.is_active) {
        await setActiveStyle(newStyle);
      }
      
      toast("New style created", {
        description: `"${newStyle.name}" has been created`
      });
      
    } catch (err) {
      console.error('Error creating style:', err);
      setError(err instanceof Error ? err : new Error('Failed to create style'));
      toast("Error creating style", {
        description: "Could not create alert style. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertStyleContext.Provider value={{ 
      activeStyle, 
      allStyles, 
      setActiveStyle, 
      isLoading, 
      error,
      updateStyleSetting,
      createStyle
    }}>
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
