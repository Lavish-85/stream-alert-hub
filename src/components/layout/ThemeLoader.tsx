
import React, { useEffect } from 'react';
import { loadSavedTheme } from '@/lib/utils';

export const ThemeLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Load theme when the component mounts
    loadSavedTheme();
    
    // Listen for storage events to update theme in real-time across tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'appTheme') {
        loadSavedTheme();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return <>{children}</>;
};

export default ThemeLoader;
