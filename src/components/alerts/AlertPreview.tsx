
import React from "react";
import { cn } from "@/lib/utils";
import { AnimationType } from "@/contexts/AlertStyleContext";

interface AlertPreviewProps {
  textColor: string;
  backgroundColor: string;
  animationType: AnimationType;
  fontFamily: string;
}

const AlertPreview: React.FC<AlertPreviewProps> = ({
  textColor,
  backgroundColor,
  animationType,
  fontFamily,
}) => {
  return (
    <div className="relative w-full aspect-video border rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center">
      <div 
        className={cn(
          "p-4 rounded-md shadow-lg flex flex-col items-center",
          animationType === "fade" && "animate-fade-in",
          animationType === "slide" && "animate-slide-in-right",
          animationType === "bounce" && "animate-bounce-in",
          animationType === "zoom" && "animate-zoom-in"
        )}
        style={{
          backgroundColor,
          color: textColor,
          fontFamily,
          maxWidth: "80%"
        }}
      >
        <div className="flex items-center gap-3 w-full mb-2">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold">
            D
          </div>
          <div className="flex-1">
            <div className="font-bold">Donor Name</div>
            <div className="text-sm opacity-80">just donated</div>
          </div>
          <div className="text-xl font-bold">₹500</div>
        </div>
        <div className="w-full text-center text-sm opacity-90 mt-1">
          Thank you for your amazing content!
        </div>
      </div>
    </div>
  );
};

export default AlertPreview;
