
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert hex color code to HSL format for CSS variables
export function hexToHsl(hex: string): string {
  // Remove the # if present
  hex = hex.replace('#', '');
  
  // Convert hex to RGB
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Find the max and min values to calculate the lightness
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  // Calculate the lightness
  let l = (max + min) / 2;
  
  let s = 0;
  let h = 0;
  
  if (max !== min) {
    // Calculate the saturation
    s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
    
    // Calculate the hue
    if (max === r) {
      h = (g - b) / (max - min) + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / (max - min) + 2;
    } else {
      h = (r - g) / (max - min) + 4;
    }
    h *= 60;
  }
  
  // Round values
  h = Math.round(h);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
}

// Apply theme colors from localStorage
export function loadSavedTheme() {
  try {
    const savedTheme = localStorage.getItem("appTheme");
    if (savedTheme) {
      const themeColors = JSON.parse(savedTheme);
      const root = document.documentElement;
      
      // Apply primary colors
      root.style.setProperty('--primary', hexToHsl(themeColors.primaryColor));
      root.style.setProperty('--primary-foreground', hexToHsl(themeColors.primaryForeground));
      
      // Apply secondary colors
      root.style.setProperty('--secondary', hexToHsl(themeColors.secondaryColor));
      root.style.setProperty('--secondary-foreground', hexToHsl(themeColors.secondaryForeground));
      
      // Apply background and foreground
      root.style.setProperty('--background', hexToHsl(themeColors.backgroundColor));
      root.style.setProperty('--foreground', hexToHsl(themeColors.foregroundColor));
      
      // Apply accent
      root.style.setProperty('--accent', hexToHsl(themeColors.accentColor));
      root.style.setProperty('--accent-foreground', hexToHsl(themeColors.accentForeground));

      // Update brand colors in Tailwind
      root.style.setProperty('--brand-500', themeColors.primaryColor);
      root.style.setProperty('--brand-900', themeColors.secondaryColor);
    }
  } catch (e) {
    console.error("Error loading saved theme", e);
  }
}
