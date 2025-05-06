
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

const AlertStyleContext = createContext<AlertStyleContextType | undefined>(undefined);

export const AlertStyleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeStyle, setActiveStyleState] = useState<AlertStyle | null>(null);
  const [allStyles, setAllStyles] = useState<AlertStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all styles and identify active one
  useEffect(() => {
    async function fetchStyles() {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('alert_styles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw new Error(error.message);
        
        if (data) {
          setAllStyles(data);
          const active = data.find(style => style.is_active === true);
          if (active) setActiveStyleState(active);
          else if (data.length > 0) setActiveStyleState(data[0]);
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
    } catch (err) {
      console.error('Error updating active style:', err);
      setError(err instanceof Error ? err : new Error('Failed to update active style'));
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
  const context = useContext(AlertStyleContext);
  if (context === undefined) {
    throw new Error('useAlertStyle must be used within an AlertStyleProvider');
  }
  return context;
};
