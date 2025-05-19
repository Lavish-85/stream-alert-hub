
import { Json } from '@/integrations/supabase/types';

export interface SponsorLogo {
  id: string;
  url: string;
  alt: string;
  link?: string;
}

/**
 * Safely converts JSON data from Supabase to a typed array of sponsor logos
 */
export const convertToSponsorLogos = (data: Json | null): SponsorLogo[] => {
  if (!data || !Array.isArray(data)) {
    console.log('No valid sponsor logos data found:', data);
    return [];
  }
  
  // Map and validate each item in the array
  const convertedLogos = data.filter(item => {
    // Make sure item is an object with the required fields
    const valid = typeof item === 'object' && 
           item !== null &&
           'id' in item && 
           'url' in item && 
           'alt' in item;
    
    if (!valid) {
      console.log('Invalid sponsor logo format:', item);
    }
    return valid;
  }).map(item => {
    const logo = item as Record<string, unknown>;
    
    return {
      id: String(logo.id || ''),
      url: String(logo.url || ''),
      alt: String(logo.alt || ''),
      link: logo.link ? String(logo.link) : undefined
    };
  });
  
  console.log('Converted sponsor logos:', convertedLogos);
  return convertedLogos;
};

/**
 * Converts a typed array of sponsor logos to a JSON format suitable for database storage
 */
export const convertSponsorLogosToJson = (logos: SponsorLogo[]): Json => {
  // Create a plain object array without methods
  return logos.map(logo => ({
    id: logo.id,
    url: logo.url,
    alt: logo.alt,
    link: logo.link
  })) as Json;
};
