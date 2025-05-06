import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useToast } from "@/hooks/use-toast";
import { Check, FileUp, Play, Save, Trash } from "lucide-react";
import { useAlertStyle, AlertStyle } from "@/contexts/AlertStyleContext";
import { supabase } from "@/integrations/supabase/client";

const AlertsPage = () => {
  const { toast: hookToast } = useToast();
  const { activeStyle, allStyles, setActiveStyle, isLoading, refreshStyles } = useAlertStyle();
  const [selectedTheme, setSelectedTheme] = useState<AlertStyle | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [showPreviewAlert, setShowPreviewAlert] = useState(false);
  const [editedStyle, setEditedStyle] = useState<Partial<AlertStyle>>({});
  
  // When active style changes, update selected theme
  useEffect(() => {
    if (activeStyle && !selectedTheme) {
      setSelectedTheme(activeStyle);
    }
  }, [activeStyle, selectedTheme]);

  const handleSelectTheme = (theme: AlertStyle) => {
    setSelectedTheme(theme);
    setEditedStyle(theme);
    setCustomizing(true);
    toast(`"${theme.name}" theme selected`, {
      description: "Customize your alert using the options below."
    });
  };

  const handlePreviewAlert = () => {
    setShowPreviewAlert(true);
    
    setTimeout(() => {
      setShowPreviewAlert(false);
    }, 5000);
  };

  const handleSaveTheme = async () => {
    if (!selectedTheme) return;

    try {
      // Add timestamp to force cache invalidation
      const timestamp = Date.now();
      
      // Update the theme in database
      const { error } = await supabase
        .from('alert_styles')
        .update({
          background_color: editedStyle.background_color || selectedTheme.background_color,
          text_color: editedStyle.text_color || selectedTheme.text_color,
          font_family: editedStyle.font_family || selectedTheme.font_family,
          animation_type: editedStyle.animation_type || selectedTheme.animation_type,
          sound: editedStyle.sound || selectedTheme.sound,
          volume: editedStyle.volume || selectedTheme.volume,
          duration: editedStyle.duration || selectedTheme.duration,
          last_updated: timestamp // Add timestamp to force refresh
        })
        .eq('id', selectedTheme.id);

      if (error) throw new Error(error.message);

      // Set as active theme
      const updatedTheme = {
        ...selectedTheme,
        ...editedStyle,
        last_updated: timestamp
      } as AlertStyle;
      
      await setActiveStyle(updatedTheme);
      
      // Force refresh of all styles to ensure UI consistency
      await refreshStyles();

      hookToast({
        title: "Theme saved successfully",
        description: `${updatedTheme.name} has been saved and set as your active alert style.`
      });
    } catch (err) {
      console.error("Error saving theme:", err);
      hookToast({
        title: "Failed to save theme",
        description: "There was an error saving your theme settings."
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setEditedStyle(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Alert Customization</h1>
      <p className="text-muted-foreground mb-6">
        Choose and customize how donations appear on your stream
      </p>

      {!customizing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allStyles.map((style) => (
            <Card key={style.id} className="overflow-hidden">
              <div 
                className="h-32 flex items-center justify-center" 
                style={{ backgroundColor: style.background_color }}
              >
                <div className="w-3/4 bg-white/20 backdrop-blur-sm rounded-md p-3">
                  <div className="h-4 w-24 bg-white/70 rounded mb-2"></div>
                  <div className="h-3 w-full bg-white/40 rounded"></div>
                </div>
              </div>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{style.name}</CardTitle>
                  {style.is_active && (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                      <Check className="w-3 h-3 mr-1" /> Active
                    </span>
                  )}
                </div>
                <CardDescription>{style.description}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button onClick={() => handleSelectTheme(style)} className="w-full">
                  {style.is_active ? 'Customize' : 'Select'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold">Customizing: {selectedTheme?.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedTheme?.description}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCustomizing(false)}>
                Back to Themes
              </Button>
              <Button onClick={handlePreviewAlert}>
                <Play className="mr-2 h-4 w-4" /> Preview Alert
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Preview column */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Live Preview</CardTitle>
                  <CardDescription>
                    See how your alert will appear on stream
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative min-h-[300px] border rounded-md bg-gray-900 flex items-center justify-center">
                  {showPreviewAlert && (
                    <div 
                      className="donation-alert absolute bottom-4 left-4 right-4 p-4 rounded-lg"
                      style={{
                        backgroundColor: editedStyle.background_color || selectedTheme?.background_color,
                        color: editedStyle.text_color || selectedTheme?.text_color
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-800 font-bold">
                          VS
                        </div>
                        <div>
                          <div className="font-bold text-lg">Vikram Singh donated ₹500</div>
                          <div>Great stream! Keep up the amazing content!</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {!showPreviewAlert && (
                    <div className="text-center text-muted-foreground">
                      <p>Click "Preview Alert" to see donation notification</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Customization column */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Customization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Tabs defaultValue="graphics">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="graphics">Graphics</TabsTrigger>
                      <TabsTrigger value="typography">Text</TabsTrigger>
                      <TabsTrigger value="sound">Sound</TabsTrigger>
                      <TabsTrigger value="animation">Animation</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="graphics" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Background Color</Label>
                        <div className="flex gap-2">
                          <div 
                            className="w-10 h-10 rounded border cursor-pointer"
                            style={{ backgroundColor: editedStyle.background_color || selectedTheme?.background_color }}
                          ></div>
                          <Input 
                            value={editedStyle.background_color || selectedTheme?.background_color} 
                            onChange={(e) => handleInputChange('background_color', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="border rounded-lg p-4 text-center">
                        <Label className="block mb-2">Overlay Image</Label>
                        <div className="h-20 border border-dashed rounded-md flex items-center justify-center">
                          <div className="flex flex-col items-center space-y-2 text-muted-foreground">
                            <FileUp className="h-6 w-6" />
                            <span className="text-xs">Upload PNG/SVG</span>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="typography" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Font Family</Label>
                        <Select 
                          value={editedStyle.font_family || selectedTheme?.font_family || "inter"}
                          onValueChange={(value) => handleInputChange('font_family', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select font" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inter">Inter</SelectItem>
                            <SelectItem value="roboto">Roboto</SelectItem>
                            <SelectItem value="poppins">Poppins</SelectItem>
                            <SelectItem value="montserrat">Montserrat</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Text Size</Label>
                          <span className="text-xs text-muted-foreground">Medium</span>
                        </div>
                        <Slider defaultValue={[50]} max={100} step={1} />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Text Color</Label>
                        <div className="flex gap-2">
                          <div 
                            className="w-10 h-10 rounded border cursor-pointer"
                            style={{ backgroundColor: editedStyle.text_color || selectedTheme?.text_color }}
                          ></div>
                          <Input 
                            value={editedStyle.text_color || selectedTheme?.text_color} 
                            onChange={(e) => handleInputChange('text_color', e.target.value)}
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="sound" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Alert Sound</Label>
                        <Select 
                          value={editedStyle.sound || selectedTheme?.sound || "chime"}
                          onValueChange={(value) => handleInputChange('sound', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select sound" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="chime">Chime</SelectItem>
                            <SelectItem value="bell">Bell</SelectItem>
                            <SelectItem value="cash">Cash Register</SelectItem>
                            <SelectItem value="tada">Ta-da!</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Volume</Label>
                          <span className="text-xs text-muted-foreground">
                            {editedStyle.volume || selectedTheme?.volume || 50}%
                          </span>
                        </div>
                        <Slider 
                          defaultValue={[editedStyle.volume || selectedTheme?.volume || 50]} 
                          max={100} 
                          step={1}
                          onValueChange={(value) => handleInputChange('volume', value[0])}
                        />
                      </div>
                      
                      <div className="text-center mt-4">
                        <Label className="block mb-2">Custom Audio</Label>
                        <Button variant="outline" size="sm">
                          <FileUp className="h-4 w-4 mr-2" /> Upload Sound
                        </Button>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="animation" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Animation Type</Label>
                        <Select 
                          value={editedStyle.animation_type || selectedTheme?.animation_type || "fade"}
                          onValueChange={(value) => handleInputChange('animation_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select animation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fade">Fade</SelectItem>
                            <SelectItem value="slide">Slide</SelectItem>
                            <SelectItem value="bounce">Bounce</SelectItem>
                            <SelectItem value="zoom">Zoom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Duration</Label>
                          <span className="text-xs text-muted-foreground">
                            {editedStyle.duration || selectedTheme?.duration || 5}s
                          </span>
                        </div>
                        <Slider 
                          defaultValue={[editedStyle.duration || selectedTheme?.duration || 5]} 
                          max={10} 
                          min={1}
                          step={1}
                          onValueChange={(value) => handleInputChange('duration', value[0])}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
                  <Button variant="outline" className="w-full sm:w-auto" 
                    onClick={() => setEditedStyle({})}>
                    <Trash className="mr-2 h-4 w-4" /> Reset
                  </Button>
                  <Button onClick={handleSaveTheme} className="w-full sm:w-auto">
                    <Save className="mr-2 h-4 w-4" /> Save Theme
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
