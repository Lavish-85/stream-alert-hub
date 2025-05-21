
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import AlertPreview from "@/components/alerts/AlertPreview";
import { sendTestAlert } from "@/utils/obsUtils";
import { toast } from "sonner";
import { AnimationType } from "@/contexts/AlertStyleContext";

interface AlertPreviewCardProps {
  textColor: string;
  backgroundColor: string;
  animationType: AnimationType;
  fontFamily: string;
}

const AlertPreviewCard: React.FC<AlertPreviewCardProps> = ({
  textColor,
  backgroundColor,
  animationType,
  fontFamily,
}) => {
  const testAlert = async () => {
    try {
      const { error } = await sendTestAlert();
      if (error) {
        toast.error("Test failed", {
          description: "Failed to send test alert.",
        });
      } else {
        toast.success("Test alert sent", {
          description: "Check your OBS browser source to see the alert.",
        });
      }
    } catch (err) {
      console.error("Error sending test alert:", err);
      toast.error("Test failed", {
        description: "Failed to send test alert.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Preview</CardTitle>
        <CardDescription>
          See how your alerts will look in real-time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AlertPreview 
          textColor={textColor}
          backgroundColor={backgroundColor}
          animationType={animationType}
          fontFamily={fontFamily}
        />
        
        <Button 
          variant="secondary" 
          className="w-full"
          onClick={testAlert}
        >
          <Play className="mr-2 h-4 w-4" />
          Send Test Alert
        </Button>
      </CardContent>
    </Card>
  );
};

export default AlertPreviewCard;
