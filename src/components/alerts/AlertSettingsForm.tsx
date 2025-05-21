
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, AlignLeft, Palette, Speaker, Type, Brush, Save } from "lucide-react";
import { ColorPicker } from "@/components/ui/color-picker";
import { useToast } from "@/hooks/use-toast";
import { AlertStyle, AnimationType } from "@/contexts/AlertStyleContext";

interface AlertSettingsFormProps {
  activeStyle: AlertStyle | null;
  isLoading: boolean;
  onSave: (formData: Partial<AlertStyle>) => Promise<void>;
}

const AlertSettingsForm: React.FC<AlertSettingsFormProps> = ({
  activeStyle,
  isLoading,
  onSave,
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState<{
    name: string;
    text_color: string;
    background_color: string;
    volume: number;
    duration: number;
    animation_type: AnimationType;
    sound: string | null;
    font_family: string;
    description: string;
  }>({
    name: "Default",
    text_color: "#ffffff",
    background_color: "#111827",
    volume: 50,
    duration: 5,
    animation_type: "fade",
    sound: null,
    font_family: "inherit",
    description: "Default alert style",
  });

  // Track popup visibility separately for UI, but don't send to database
  const [showPopups, setShowPopups] = useState(true);

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
      });
      
      // Set the UI state for popup visibility based on localStorage or default to true
      const savedPopupPreference = localStorage.getItem("showAlertPopups");
      setShowPopups(savedPopupPreference ? savedPopupPreference === "true" : true);
    }
  }, [activeStyle]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSliderChange = (value: number[], name: "volume" | "duration") => {
    setForm({ ...form, [name]: value[0] });
  };

  const handleColorChange = (name: "text_color" | "background_color") => (
    color: string
  ) => {
    setForm({ ...form, [name]: color });
  };

  const handleTogglePopups = (checked: boolean) => {
    setShowPopups(checked);
    // Save preference to localStorage instead of database
    localStorage.setItem("showAlertPopups", checked.toString());
    toast({
      title: checked ? "Popups enabled" : "Popups disabled",
      description: checked ? "Alert popups will be shown" : "Alert popups will be hidden"
    });
  };

  const handleSave = async () => {
    try {
      await onSave(form);
    } catch (error) {
      console.error("Error in form submission:", error);
      toast({
        title: "Error",
        description: "Failed to save alert settings",
        variant: "destructive",
      });
    }
  };

  const animationOptions = [
    { value: "fade", label: "Fade" },
    { value: "slide", label: "Slide" },
    { value: "bounce", label: "Bounce" },
    { value: "zoom", label: "Zoom" },
  ] as const;

  return (
    <div className="space-y-4">
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
              value={[form.volume]}
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
              value={[form.duration]}
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
                  onClick={() => setForm({ ...form, animation_type: option.value })}
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
                checked={showPopups}
                onCheckedChange={handleTogglePopups}
              />
              <Label htmlFor="show-popup" className="font-medium text-sm">
                Show alert popups
              </Label>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              Display donation alerts as popups in the bottom-right corner
            </p>
          </div>
          
          <div className="pt-4">
            <Button onClick={handleSave} disabled={isLoading} className="w-full">
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
        </div>
      )}
    </div>
  );
};

export default AlertSettingsForm;
