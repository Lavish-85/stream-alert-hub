
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { DonationPageSettings } from "@/types/donation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Users, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DonationPagePreviewProps {
  settings: DonationPageSettings;
  streamerInfo?: {
    name?: string;
    avatar_url?: string;
  };
}

const DonationPagePreview: React.FC<DonationPagePreviewProps> = ({
  settings,
  streamerInfo
}) => {
  const { user } = useAuth();
  const donationStats = {
    total: 5000,
    supporters: 25,
    goal: settings.goal_amount,
    average: 200
  };
  
  const progressPercentage = Math.min(100, Math.round((donationStats.total / donationStats.goal) * 100));
  
  // Generate CSS variables for custom colors
  const customStyles = {
    "--primary-color": settings.primary_color,
    "--secondary-color": settings.secondary_color,
  } as React.CSSProperties;

  return (
    <div 
      className="border rounded-lg overflow-hidden shadow-md max-w-md w-full mx-auto relative bg-white bg-opacity-95"
      style={customStyles}
    >
      {/* Header Section */}
      <div className="p-4 text-center" style={{ backgroundColor: settings.primary_color, color: "#fff" }}>
        <div className="flex flex-col items-center mb-2">
          <Avatar className="h-16 w-16 mb-2 border-2 border-white">
            <AvatarImage 
              src={streamerInfo?.avatar_url || "https://github.com/shadcn.png"} 
              alt={streamerInfo?.name || settings.title} 
            />
            <AvatarFallback>{(streamerInfo?.name || settings.title).charAt(0)}</AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold">{streamerInfo?.name || "Streamer Name"}</h2>
        </div>
        <h3 className="text-lg font-semibold mb-1">{settings.title}</h3>
        <p className="text-sm text-white text-opacity-90">{settings.description}</p>
      </div>
      
      {/* Goal Progress */}
      {settings.show_donation_goal && (
        <div className="px-4 py-3">
          <div className="bg-white bg-opacity-60 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-semibold flex items-center">
                <DollarSign className="h-4 w-4 mr-1" style={{ color: settings.primary_color }} /> 
                Total Donated
              </h4>
              <span className="text-lg font-bold">₹{donationStats.total.toLocaleString()}</span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-2" 
              style={{ 
                backgroundColor: `${settings.secondary_color}30`,
                "--progress-fill": settings.primary_color
              } as React.CSSProperties}
            />
            <div className="mt-1 text-xs text-right text-muted-foreground">
              Goal: ₹{donationStats.goal.toLocaleString()}
            </div>
          </div>
          
          <div className="flex justify-between mt-3">
            <div className="text-center flex-1">
              <div className="flex items-center justify-center">
                <Users className="h-4 w-4 mr-1" style={{ color: settings.secondary_color }} />
                <span className="text-lg font-bold">{donationStats.supporters}</span>
              </div>
              <span className="text-xs">Supporters</span>
            </div>
            <div className="text-center flex-1">
              <div className="flex items-center justify-center">
                <Star className="h-4 w-4 mr-1" style={{ color: settings.primary_color }} />
                <span className="text-lg font-bold">₹{donationStats.average}</span>
              </div>
              <span className="text-xs">Average</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Donation Button Preview */}
      <div className="px-4 pb-4">
        <button 
          className="w-full py-2 px-4 rounded-md text-white font-medium"
          style={{ backgroundColor: settings.primary_color }}
        >
          Donate Now
        </button>
      </div>
      
      {/* Thank You Message Preview */}
      <div className="px-4 pb-4 text-center">
        <p className="text-xs text-muted-foreground italic">
          "{settings.custom_thank_you_message}"
        </p>
      </div>
    </div>
  );
};

export default DonationPagePreview;
