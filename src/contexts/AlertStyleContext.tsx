
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

// Valid animation types
export type AnimationType = "fade" | "slide" | "bounce" | "zoom";

export interface AlertStyle {
  id: string;
  name: string;
  description: string;
  background_color: string;
  text_color: string;
  font_family: string;
  animation_type: AnimationType;
  sound: string;
  volume: number;
  duration: number;
  created_at: string;
  is_active: boolean;
  user_id: string;
  show_popup?: boolean;
}

// Helper to validate animation type
const isValidAnimationType = (value: string): value is AnimationType => {
  return ["fade", "slide", "bounce", "zoom"].includes(value as string);
};

// Helper to ensure the animation type is valid
const ensureValidAnimationType = (value: string | null | undefined): AnimationType => {
  if (value && isValidAnimationType(value)) {
    return value;
  }
  return "fade"; // Default to fade
};

interface AlertStyleContextType {
  styles: AlertStyle[];
  activeStyle: AlertStyle | null;
  isLoading: boolean;
  error: string | null;
  createStyle: (style: Partial<AlertStyle>) => Promise<void>;
  updateStyle: (id: string, updates: Partial<AlertStyle>) => Promise<void>;
  deleteStyle: (id: string) => Promise<void>;
  setActiveStyle: (id: string) => Promise<void>;
  updateStyleSetting: (updates: Partial<AlertStyle>) => Promise<void>;
}

const AlertStyleContext = React.createContext<AlertStyleContextType | undefined>(undefined);

// Create a separate consumer component that doesn't directly use useAuth
export function AlertStyleConsumer({ children }: { children: (context: AlertStyleContextType) => React.ReactNode }) {
  return (
    <AlertStyleContext.Consumer>
      {(context) => {
        if (context === undefined) {
          throw new Error("AlertStyleConsumer must be used within an AlertStyleProvider");
        }
        return children(context);
      }}
    </AlertStyleContext.Consumer>
  );
}

export const AlertStyleProvider = ({ children }: { children: React.ReactNode }) => {
  // Check if we're in a context where useAuth is available
  const AuthContext = React.createContext<any | undefined>(undefined);
  const auth = React.useContext(AuthContext);
  const isAuthAvailable = auth !== undefined;
  
  // If auth is available, use it; otherwise use local state
  const authState = isAuthAvailable ? useAuth() : { user: null };
  const { user } = authState || {};
  
  const [styles, setStyles] = React.useState<AlertStyle[]>([]);
  const [activeStyle, setActiveStyleState] = React.useState<AlertStyle | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch alert styles when user changes
  React.useEffect(() => {
    if (!user) {
      // Clear styles if no user is authenticated
      setStyles([]);
      setActiveStyleState(null);
      setIsLoading(false);
      return;
    }

    const fetchAlertStyles = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from("alert_styles")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        console.log("Fetched alert styles:", data);
        
        // Properly convert and validate animation types
        const typedStyles = data.map(style => ({
          ...style,
          animation_type: ensureValidAnimationType(style.animation_type)
        })) as AlertStyle[];
        
        setStyles(typedStyles);

        // Find active style
        const active = typedStyles.find(style => style.is_active === true);
        if (active) {
          console.log("Found active style:", active);
          setActiveStyleState(active);
        } else if (typedStyles.length > 0) {
          // If no active style, set the first one as active
          await setActiveStyle(typedStyles[0].id);
        }

        setIsLoading(false);
      } catch (error: any) {
        console.error("Error fetching alert styles:", error);
        setError(error.message);
        setIsLoading(false);
      }
    };

    fetchAlertStyles();
  }, [user]);

  // Create a new alert style
  const createStyle = async (style: Partial<AlertStyle>) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Ensure required fields have default values
      const newStyle = {
        name: style.name || "Default Style",
        background_color: style.background_color || "#111827",
        text_color: style.text_color || "#ffffff",
        user_id: user.id,
        is_active: false,
        description: style.description || "",
        font_family: style.font_family || "inherit",
        animation_type: ensureValidAnimationType(style.animation_type),
        sound: style.sound || "",
        volume: style.volume || 50,
        duration: style.duration || 5
      };

      const { data, error } = await supabase
        .from("alert_styles")
        .insert([newStyle])
        .select();

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const createdStyle = {
          ...data[0],
          animation_type: ensureValidAnimationType(data[0].animation_type)
        } as AlertStyle;
        
        setStyles(prevStyles => [...prevStyles, createdStyle]);
      }

      setIsLoading(false);
    } catch (error: any) {
      console.error("Error creating alert style:", error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  // Update an existing alert style
  const updateStyle = async (id: string, updates: Partial<AlertStyle>) => {
    try {
      setIsLoading(true);
      setError(null);

      // Make sure animation_type is valid if it exists
      const safeUpdates = {
        ...updates,
        animation_type: updates.animation_type ? 
          ensureValidAnimationType(updates.animation_type) : undefined
      };

      const { data, error } = await supabase
        .from("alert_styles")
        .update(safeUpdates)
        .eq("id", id)
        .select();

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const updatedStyle = {
          ...data[0],
          animation_type: ensureValidAnimationType(data[0].animation_type)
        } as AlertStyle;
        
        setStyles(prevStyles => 
          prevStyles.map(style => 
            style.id === id ? updatedStyle : style
          )
        );
        
        // Update active style if this was the one updated
        if (activeStyle?.id === id) {
          setActiveStyleState(updatedStyle);
        }
      }

      setIsLoading(false);
    } catch (error: any) {
      console.error("Error updating alert style:", error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  // Delete an alert style
  const deleteStyle = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { error } = await supabase
        .from("alert_styles")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      setStyles(prevStyles => prevStyles.filter(style => style.id !== id));
      
      // If the active style was deleted, set a new active style
      if (activeStyle?.id === id) {
        const remainingStyles = styles.filter(style => style.id !== id);
        if (remainingStyles.length > 0) {
          await setActiveStyle(remainingStyles[0].id);
        } else {
          setActiveStyleState(null);
        }
      }

      setIsLoading(false);
    } catch (error: any) {
      console.error("Error deleting alert style:", error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  // Set the active style
  const setActiveStyle = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // First, set all styles to inactive
      await supabase
        .from("alert_styles")
        .update({ is_active: false })
        .eq("user_id", user?.id);

      // Then set the selected style to active
      const { data, error } = await supabase
        .from("alert_styles")
        .update({ is_active: true })
        .eq("id", id)
        .select();

      if (error) {
        throw error;
      }

      // Update local state
      setStyles(prevStyles => 
        prevStyles.map(style => ({
          ...style,
          is_active: style.id === id
        }))
      );
      
      if (data && data.length > 0) {
        const newActiveStyle = {
          ...data[0],
          animation_type: ensureValidAnimationType(data[0].animation_type) 
        } as AlertStyle;
        
        setActiveStyleState(newActiveStyle);
      }

      setIsLoading(false);
    } catch (error: any) {
      console.error("Error setting active style:", error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  // Update only specific settings on the active style
  const updateStyleSetting = async (updates: Partial<AlertStyle>) => {
    if (!activeStyle) return;
    return updateStyle(activeStyle.id, updates);
  };

  return (
    <AlertStyleContext.Provider
      value={{
        styles,
        activeStyle,
        isLoading,
        error,
        createStyle,
        updateStyle,
        deleteStyle,
        setActiveStyle,
        updateStyleSetting,
      }}
    >
      {children}
    </AlertStyleContext.Provider>
  );
};

export const useAlertStyle = () => {
  const context = React.useContext(AlertStyleContext);
  if (context === undefined) {
    throw new Error("useAlertStyle must be used within an AlertStyleProvider");
  }
  return context;
};
