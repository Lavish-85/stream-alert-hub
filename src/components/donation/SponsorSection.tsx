
import React from 'react';
import { BadgeIndianRupee, ExternalLink } from 'lucide-react';
import { SponsorLogo } from '@/utils/sponsorUtils';

interface SponsorSectionProps {
  sponsorBanner: {
    imageUrl: string | null;
    link: string | null;
  };
  sponsorLogos: SponsorLogo[];
  showSponsors: boolean;
  themeColors: {
    primary: string;
    accent: string;
  };
}

const SponsorSection: React.FC<SponsorSectionProps> = ({ 
  sponsorBanner, 
  sponsorLogos, 
  showSponsors,
  themeColors 
}) => {
  if (!showSponsors || (sponsorLogos.length === 0 && !sponsorBanner.imageUrl)) {
    return null;
  }

  return (
    <div 
      className="relative overflow-hidden rounded-lg shadow-lg mb-4 border animate-fade-in"
      style={{
        borderColor: `${themeColors.primary}50`,
        background: `linear-gradient(135deg, ${themeColors.primary}10, ${themeColors.accent}15)`,
      }}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-16 h-16 -mt-8 -mr-8 rounded-full bg-opacity-20" 
        style={{ backgroundColor: `${themeColors.primary}40` }} />
      <div className="absolute bottom-0 left-0 w-24 h-24 -mb-12 -ml-12 rounded-full bg-opacity-10" 
        style={{ backgroundColor: `${themeColors.accent}30` }} />
        
      <div className="relative z-10 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold flex items-center" style={{ color: themeColors.primary }}>
            <BadgeIndianRupee className="h-5 w-5 mr-2 animate-pulse" style={{ color: themeColors.accent }} />
            <span style={{ 
              background: `linear-gradient(to right, ${themeColors.primary}, ${themeColors.accent})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Our Sponsors
            </span>
          </h3>
          
          <div className="px-2 py-1 text-xs rounded-full font-medium" 
            style={{ 
              backgroundColor: `${themeColors.accent}20`,
              color: themeColors.accent
            }}>
            Featured
          </div>
        </div>

        {/* Sponsor Banner */}
        {sponsorBanner.imageUrl && (
          <div className="w-full mb-4 transform transition-transform hover:scale-[1.01] overflow-hidden rounded-md shadow-md">
            {sponsorBanner.link ? (
              <a 
                href={sponsorBanner.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block relative group"
              >
                <img 
                  src={sponsorBanner.imageUrl}
                  alt="Featured Sponsor"
                  className="w-full h-auto rounded-md"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                  <ExternalLink className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </a>
            ) : (
              <img 
                src={sponsorBanner.imageUrl}
                alt="Featured Sponsor"
                className="w-full h-auto rounded-md"
              />
            )}
          </div>
        )}
        
        {/* Sponsor Logos */}
        {sponsorLogos.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3" style={{ color: themeColors.accent }}>
              Supported by
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {sponsorLogos.map((logo) => (
                <div 
                  key={logo.id} 
                  className="bg-white bg-opacity-80 p-2 rounded-md shadow transform transition-transform hover:scale-105 hover:shadow-md"
                  style={{ borderBottom: `2px solid ${themeColors.primary}40` }}
                >
                  {logo.link ? (
                    <a 
                      href={logo.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block h-12 relative group"
                    >
                      <img 
                        src={logo.url} 
                        alt={logo.alt} 
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-300 rounded-md"></div>
                    </a>
                  ) : (
                    <div className="h-12 flex items-center justify-center">
                      <img 
                        src={logo.url} 
                        alt={logo.alt} 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="text-xs text-center mt-1 font-medium truncate">
                    {logo.alt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="text-xs text-center mt-4 text-muted-foreground">
          These amazing sponsors help support quality content
        </div>
      </div>
    </div>
  );
};

export default SponsorSection;
