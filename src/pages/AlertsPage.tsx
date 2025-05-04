
import React, { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Check, FileUp, Play, Save, Trash } from "lucide-react";

interface AlertTheme {
  id: string;
  name: string;
  description: string;
  preview: string;
  colors: {
    background: string;
    text: string;
  };
}

const AlertsPage = () => {
  const { toast } = useToast();
  const [selectedTheme, setSelectedTheme] = useState<AlertTheme | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [showPreviewAlert, setShowPreviewAlert] = useState(false);
  
  const alertThemes: AlertTheme[] = [
    {
      id: "superchat",
      name: "Superchat",
      description: "Colorful banner with animation similar to YouTube Superchat",
      preview: "bg-gradient-to-r from-red-500 to-orange-500",
      colors: {
        background: "#ef4444",
        text: "#ffffff"
      }
    },
    {
      id: "minimal",
      name: "Minimal",
      description: "Clean text banner with subtle animation",
      preview: "bg-white border border-gray-200",
      colors: {
        background: "#ffffff",
        text: "#111827"
      }
    },
    {
      id: "ticker",
      name: "Ticker",
      description: "Bottom-third scrolling ticker style",
      preview: "bg-blue-600",
      colors: {
        background: "#2563eb",
        text: "#ffffff"
      }
    },
    {
      id: "explosion",
      name: "Explosion",
      description: "Full-screen explosive reveal with particles",
      preview: "bg-gradient-to-br from-purple-600 to-pink-600",
      colors: {
        background: "#9333ea",
        text: "#ffffff"
      }
    },
    {
      id: "side-slide",
      name: "Side Slide",
      description: "Elegant slide-in from the side of the screen",
      preview: "bg-gradient-to-r from-green-500 to-emerald-700",
      colors: {
        background: "#10b981",
        text: "#ffffff"
      }
    },
    {
      id: "toast",
      name: "Toast",
      description: "Simple non-intrusive toast notification style",
      preview: "bg-gray-800",
      colors: {
        background: "#1f2937",
        text: "#ffffff"
      }
    }
  ];

  const handleSelectTheme = (theme: AlertTheme) => {
    setSelectedTheme(theme);
    setCustomizing(true);
    toast({
      title: `"${theme.name}" theme selected`,
      description: "Customize your alert using the options below."
    });
  };

  const handlePreviewAlert = () => {
    setShowPreviewAlert(true);
    
    setTimeout(() => {
      setShowPreviewAlert(false);
    }, 5000);
  };

  const handleSaveTheme = () => {
    toast({
      title: "Theme saved successfully",
      description: "Your custom theme has been saved and is ready to use."
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Alert Customization</h1>
      <p className="text-muted-foreground mb-6">
        Choose and customize how donations appear on your stream
      </p>

      {!customizing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alertThemes.map((theme) => (
            <Card key={theme.id} className="overflow-hidden">
              <div className={`h-32 ${theme.preview} flex items-center justify-center`}>
                <div className="w-3/4 bg-white/20 backdrop-blur-sm rounded-md p-3">
                  <div className="h-4 w-24 bg-white/70 rounded mb-2"></div>
                  <div className="h-3 w-full bg-white/40 rounded"></div>
                </div>
              </div>
              <CardHeader>
                <CardTitle>{theme.name}</CardTitle>
                <CardDescription>{theme.description}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button onClick={() => handleSelectTheme(theme)} className="w-full">
                  Select
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
                        backgroundColor: selectedTheme?.colors.background,
                        color: selectedTheme?.colors.text
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
                            style={{ backgroundColor: selectedTheme?.colors.background }}
                          ></div>
                          <Input 
                            value={selectedTheme?.colors.background} 
                            onChange={() => {}} 
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
                        <Select defaultValue="inter">
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
                            style={{ backgroundColor: selectedTheme?.colors.text }}
                          ></div>
                          <Input 
                            value={selectedTheme?.colors.text} 
                            onChange={() => {}} 
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="sound" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Alert Sound</Label>
                        <Select defaultValue="chime">
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
                          <span className="text-xs text-muted-foreground">50%</span>
                        </div>
                        <Slider defaultValue={[50]} max={100} step={1} />
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
                        <div className="flex justify-between">
                          <Label>Animation Speed</Label>
                          <span className="text-xs text-muted-foreground">Medium</span>
                        </div>
                        <Slider defaultValue={[50]} max={100} step={1} />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Duration</Label>
                          <span className="text-xs text-muted-foreground">5s</span>
                        </div>
                        <Slider defaultValue={[50]} max={100} step={1} />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Animation Type</Label>
                        <Select defaultValue="fade">
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
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
                  <Button variant="outline" className="w-full sm:w-auto">
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
