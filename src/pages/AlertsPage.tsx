import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlignLeft,
  Palette,
  Speaker,
  Type,
  Brush,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { useAlertStyle } from "@/contexts/AlertStyleContext";
import { ColorPicker } from "@/components/ui/color-picker";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const AlertsPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { activeStyle, isLoading, updateStyleSetting, createStyle } = useAlertStyle();
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: "Default",
    text_color: "#ffffff",
    background_color: "#111827",
    volume: 50,
    duration: 5,
    animation_type: "fade" as "fade" | "slide" | "bounce" | "zoom",
    sound: null,
    font_family: "inherit",
    description: "Default alert style",
    show_popup: true,
  });

  useEffect(() => {
    if (activeStyle) {
      setForm({
        name: activeStyle.name || "Default",
        text_color: activeStyle.text_color || "#ffffff",
        background_color: activeStyle.background_color || "#111827",
        volume: activeStyle.volume || 50,
        duration: activeStyle.duration || 5,
        animation_type: activeStyle.animation_type || "fade",
        sound: activeStyle.sound || null,
        font_family: activeStyle.font_family || "inherit",
        description: activeStyle.description || "Default alert style",
        show_popup: activeStyle.show_popup !== false,
      });
    }
  }, [activeStyle]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSliderChange = (
    value: number[],
    name: "volume" | "duration"
  ) => {
    setForm({ ...form, [name]: value[0] });
  };

  const handleColorChange = (name: "text_color" | "background_color") => (
    color: string
  ) => {
    setForm({ ...form, [name]: color });
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "You must be logged in to save alert settings.",
        variant: "destructive",
      });
      return;
    }

    if (!activeStyle) {
      // Create a new style
      if (createStyle) {
        try {
          await createStyle({
            ...form,
            user_id: user.id,
          });
          toast({
            title: "Success",
            description: "New alert style created!",
          });
          navigate(0); // Refresh the page
        } catch (error) {
          console.error("Error creating style:", error);
          toast({
            title: "Error",
            description: "Failed to create alert style.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Could not create style. Please try again later.",
          variant: "destructive",
        });
      }
    } else {
      // Update existing style
      if (updateStyleSetting) {
        try {
          await updateStyleSetting({
            ...activeStyle,
            ...form,
          });
          toast({
            title: "Success",
            description: "Alert style updated!",
          });
        } catch (error) {
          console.error("Error updating style:", error);
          toast({
            title: "Error",
            description: "Failed to update alert style.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Could not update style. Please try again later.",
          variant: "destructive",
        });
      }
    }
  };

  const animationOptions = [
    { value: "fade", label: "Fade" },
    { value: "slide", label: "Slide" },
    { value: "bounce", label: "Bounce" },
    { value: "zoom", label: "Zoom" },
  ];

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

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Alert Style Settings</CardTitle>
          <CardDescription>
            Adjust the appearance and behavior of your alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading settings...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Style Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Stream V1"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center">
                  <AlignLeft className="mr-2 h-4 w-4" />
                  Alert Text Color
                </Label>
                <ColorPicker
                  color={form.text_color}
                  onChange={handleColorChange("text_color")}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center">
                  <Palette className="mr-2 h-4 w-4" />
                  Background Color
                </Label>
                <ColorPicker
                  color={form.background_color}
                  onChange={handleColorChange("background_color")}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center">
                  <Speaker className="mr-2 h-4 w-4" />
                  Alert Volume
                </Label>
                <Slider
                  defaultValue={[form.volume]}
                  max={100}
                  step={1}
                  onValueChange={(value) => handleSliderChange(value, "volume")}
                />
                <p className="text-sm text-muted-foreground">
                  Adjust the volume of the alert sound.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center">
                  <Brush className="mr-2 h-4 w-4" />
                  Alert Duration
                </Label>
                <Slider
                  defaultValue={[form.duration]}
                  max={15}
                  step={1}
                  onValueChange={(value) => handleSliderChange(value, "duration")}
                />
                <p className="text-sm text-muted-foreground">
                  How long the alert should display on screen (in seconds).
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center">
                  <Type className="mr-2 h-4 w-4" />
                  Font Family
                </Label>
                <Input
                  id="font_family"
                  name="font_family"
                  value={form.font_family}
                  onChange={handleInputChange}
                  placeholder="e.g., Arial, sans-serif"
                />
                <p className="text-sm text-muted-foreground">
                  The font family to use for the alert text.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Animation Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {animationOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={form.animation_type === option.value ? "default" : "outline"}
                      onClick={() => setForm({ ...form, animation_type: option.value as "fade" | "slide" | "bounce" | "zoom" })}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Select the animation style for the alert.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="show-popup"
                    checked={form.show_popup !== false} // Default to true if undefined
                    onCheckedChange={(checked) => {
                      // Update local form state
                      setForm({
                        ...form,
                        show_popup: checked === true
                      });
                    }}
                  />
                  <Label htmlFor="show-popup" className="font-medium text-sm">
                    Show alert popups
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Display donation alerts as popups in the bottom-right corner
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <div className="p-4 flex justify-end">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AlertsPage;
