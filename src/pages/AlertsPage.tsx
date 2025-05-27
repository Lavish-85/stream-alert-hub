
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAlertStyle, AnimationType } from "@/contexts/AlertStyleContext";
import { useAuth } from "@/contexts/AuthContext";
import AlertSettingsForm from "@/components/alerts/AlertSettingsForm";
import AlertPreviewCard from "@/components/alerts/AlertPreviewCard";
import AlertTips from "@/components/alerts/AlertTips";

const AlertsPage = () => {
  const { activeStyle, isLoading, updateStyleSetting, createStyle } = useAlertStyle();
  const { user } = useAuth();
  const [previewState, setPreviewState] = useState({
    text_color: "#ffffff",
    background_color: "#111827",
    animation_type: "fade" as AnimationType,
    font_family: "inherit",
  });

  // Update preview state whenever activeStyle changes
  useEffect(() => {
    if (activeStyle) {
      setPreviewState({
        text_color: activeStyle.text_color,
        background_color: activeStyle.background_color,
        animation_type: activeStyle.animation_type || "fade",
        font_family: activeStyle.font_family || "inherit",
      });
    }
  }, [activeStyle]);

  const handleSaveSettings = async (formData: any) => {
    if (!user) {
      return;
    }

    // Update preview state immediately for instant visual feedback
    setPreviewState({
      text_color: formData.text_color,
      background_color: formData.background_color,
      animation_type: formData.animation_type,
      font_family: formData.font_family,
    });

    if (!activeStyle) {
      // Create a new style
      if (createStyle) {
        try {
          await createStyle({
            ...formData,
            user_id: user.id,
          });
        } catch (error) {
          console.error("Error creating style:", error);
          throw error;
        }
      }
    } else {
      // Update existing style
      if (updateStyleSetting) {
        try {
          // Remove any fields that don't exist in the database schema
          const { show_popup, ...updateData } = formData;
          
          await updateStyleSetting({
            ...updateData,
          });
        } catch (error) {
          console.error("Error updating style:", error);
          throw error;
        }
      }
    }
  };

  return (
    <div className="container max-w-4xl mx-auto">
      <div className="mb-8">
        <Link to="/" className="text-primary hover:underline flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mt-2">Customize your alerts</h1>
        <p className="text-muted-foreground">
          Personalize the look and feel of your donation alerts
        </p>
      </div>

      <div className="mb-6">
        <Link 
          to="/alerts/designer" 
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          🎨 Open Canvas Designer
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Alert Style Settings</CardTitle>
            <CardDescription>
              Adjust the appearance and behavior of your alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertSettingsForm 
              activeStyle={activeStyle}
              isLoading={isLoading}
              onSave={handleSaveSettings}
            />
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          <AlertPreviewCard 
            textColor={previewState.text_color}
            backgroundColor={previewState.background_color}
            animationType={previewState.animation_type}
            fontFamily={previewState.font_family}
          />
          
          <AlertTips />
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;
