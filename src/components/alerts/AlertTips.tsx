
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const AlertTips: React.FC = () => {
  return (
    <Alert>
      <AlertTitle>Tip: Alert Customization</AlertTitle>
      <AlertDescription>
        Try different combinations of colors, animations, and font styles to find what best matches your stream's branding.
      </AlertDescription>
    </Alert>
  );
};

export default AlertTips;
