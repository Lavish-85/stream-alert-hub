
import { useEffect } from 'react';
import { loadSavedTheme } from '@/lib/utils';

export function useThemeLoader() {
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
}
