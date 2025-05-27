
import React, { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Textbox, FabricObject, Rect, Circle, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ColorPicker } from "@/components/ui/color-picker";
import { 
  Type, 
  Save, 
  Eye, 
  Trash2, 
  Upload, 
  Square, 
  Circle as CircleIcon, 
  Copy, 
  Layers,
  ZoomIn,
  ZoomOut,
  Move
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const AlertDesigner = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [canvasObjects, setCanvasObjects] = useState<FabricObject[]>([]);
  const [zoom, setZoom] = useState(1);
  
  // Text properties
  const [textValue, setTextValue] = useState("");
  const [fontSize, setFontSize] = useState(24);
  const [textColor, setTextColor] = useState("#ffffff");
  const [fontWeight, setFontWeight] = useState(400);
  const [textAlign, setTextAlign] = useState("center");
  
  // Shape properties
  const [fillColor, setFillColor] = useState("#4F46E5");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(0);
  
  // Canvas state
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 450,
      backgroundColor: "#1a1a1a",
    });

    // Set up event handlers
    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0];
      setSelectedObject(obj || null);
      updatePropertiesFromObject(obj);
    });

    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0];
      setSelectedObject(obj || null);
      updatePropertiesFromObject(obj);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    canvas.on('object:added', () => {
      setCanvasObjects([...canvas.getObjects()]);
    });

    canvas.on('object:removed', () => {
      setCanvasObjects([...canvas.getObjects()]);
    });

    // Mouse wheel zoom
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let newZoom = canvas.getZoom();
      newZoom *= 0.999 ** delta;
      if (newZoom > 20) newZoom = 20;
      if (newZoom < 0.01) newZoom = 0.01;
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, newZoom);
      setZoom(newZoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    setFabricCanvas(canvas);
    toast.success("Advanced canvas ready! Start designing your alert!");

    return () => {
      canvas.dispose();
    };
  }, []);

  const updatePropertiesFromObject = (obj: FabricObject | undefined) => {
    if (!obj) return;
    
    if (obj.isType('textbox')) {
      const textbox = obj as Textbox;
      setTextValue(textbox.text || "");
      setFontSize(textbox.fontSize || 24);
      setTextColor(textbox.fill as string || "#ffffff");
      setFontWeight(textbox.fontWeight as number || 400);
      setTextAlign(textbox.textAlign || "center");
    }
    
    if (obj.isType('rect') || obj.isType('circle')) {
      setFillColor(obj.fill as string || "#4F46E5");
      setStrokeColor(obj.stroke as string || "#000000");
      setStrokeWidth(obj.strokeWidth || 0);
    }
  };

  const addTextElement = () => {
    if (!fabricCanvas) return;

    const text = new Textbox("Sample Text", {
      left: 100,
      top: 100,
      fontFamily: "Arial",
      fontSize: fontSize,
      fill: textColor,
      backgroundColor: "transparent",
      width: 200,
      textAlign: textAlign as any,
      fontWeight: fontWeight,
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
    toast.success("Text element added!");
  };

  const addRectangle = () => {
    if (!fabricCanvas) return;

    const rect = new Rect({
      left: 150,
      top: 150,
      fill: fillColor,
      width: 100,
      height: 60,
      stroke: strokeWidth > 0 ? strokeColor : undefined,
      strokeWidth: strokeWidth,
    });

    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
    fabricCanvas.renderAll();
    toast.success("Rectangle added!");
  };

  const addCircle = () => {
    if (!fabricCanvas) return;

    const circle = new Circle({
      left: 200,
      top: 200,
      fill: fillColor,
      radius: 40,
      stroke: strokeWidth > 0 ? strokeColor : undefined,
      strokeWidth: strokeWidth,
    });

    fabricCanvas.add(circle);
    fabricCanvas.setActiveObject(circle);
    fabricCanvas.renderAll();
    toast.success("Circle added!");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvas) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      FabricImage.fromURL(imgUrl).then((img) => {
        img.set({
          left: 50,
          top: 50,
          scaleX: 0.5,
          scaleY: 0.5,
        });
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
        toast.success("Image uploaded!");
      });
    };
    reader.readAsDataURL(file);
  };

  const updateSelectedObject = () => {
    if (!selectedObject || !fabricCanvas) return;

    if (selectedObject.isType('textbox')) {
      const textbox = selectedObject as Textbox;
      if (textValue) textbox.set('text', textValue);
      textbox.set('fontSize', fontSize);
      textbox.set('fill', textColor);
      textbox.set('fontWeight', fontWeight);
      textbox.set('textAlign', textAlign);
    }
    
    if (selectedObject.isType('rect') || selectedObject.isType('circle')) {
      selectedObject.set('fill', fillColor);
      selectedObject.set('stroke', strokeWidth > 0 ? strokeColor : undefined);
      selectedObject.set('strokeWidth', strokeWidth);
    }
    
    fabricCanvas.renderAll();
    toast.success("Properties updated!");
  };

  const copySelected = () => {
    if (!selectedObject || !fabricCanvas) return;
    
    selectedObject.clone().then((cloned: FabricObject) => {
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
      });
      fabricCanvas.add(cloned);
      fabricCanvas.setActiveObject(cloned);
      fabricCanvas.renderAll();
      toast.success("Element copied!");
    });
  };

  const deleteSelected = () => {
    if (!selectedObject || !fabricCanvas) return;
    
    fabricCanvas.remove(selectedObject);
    fabricCanvas.renderAll();
    setSelectedObject(null);
    toast.success("Element deleted!");
  };

  const bringToFront = () => {
    if (!selectedObject || !fabricCanvas) return;
    fabricCanvas.bringToFront(selectedObject);
    fabricCanvas.renderAll();
    toast.success("Brought to front!");
  };

  const sendToBack = () => {
    if (!selectedObject || !fabricCanvas) return;
    fabricCanvas.sendToBack(selectedObject);
    fabricCanvas.renderAll();
    toast.success("Sent to back!");
  };

  const zoomIn = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.min(zoom * 1.2, 3);
    fabricCanvas.setZoom(newZoom);
    setZoom(newZoom);
  };

  const zoomOut = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(zoom * 0.8, 0.1);
    fabricCanvas.setZoom(newZoom);
    setZoom(newZoom);
  };

  const resetZoom = () => {
    if (!fabricCanvas) return;
    fabricCanvas.setZoom(1);
    setZoom(1);
    fabricCanvas.viewportCenterObject(fabricCanvas.getObjects()[0]);
    fabricCanvas.renderAll();
  };

  const clearCanvas = () => {
    if (!fabricCanvas) return;
    
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#1a1a1a";
    fabricCanvas.renderAll();
    setSelectedObject(null);
    setCanvasObjects([]);
    toast.success("Canvas cleared!");
  };

  const saveDesign = () => {
    if (!fabricCanvas) return;
    
    const designData = fabricCanvas.toJSON();
    localStorage.setItem('alertDesign', JSON.stringify(designData));
    toast.success("Design saved locally!");
  };

  const previewAlert = () => {
    toast.info("Preview functionality coming soon!");
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Advanced Toolbar */}
      <div className="w-80 space-y-4 overflow-y-auto max-h-screen">
        <Tabs defaultValue="elements" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="elements">Elements</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="layers">Layers</TabsTrigger>
          </TabsList>

          <TabsContent value="elements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Add Elements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={addTextElement} className="w-full" variant="outline">
                  <Type className="mr-2 h-4 w-4" />
                  Add Text
                </Button>
                
                <Button onClick={addRectangle} className="w-full" variant="outline">
                  <Square className="mr-2 h-4 w-4" />
                  Add Rectangle
                </Button>
                
                <Button onClick={addCircle} className="w-full" variant="outline">
                  <CircleIcon className="mr-2 h-4 w-4" />
                  Add Circle
                </Button>
                
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="w-full" 
                  variant="outline"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Image
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Canvas Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <Button onClick={zoomIn} size="sm" variant="outline">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button onClick={zoomOut} size="sm" variant="outline">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button onClick={resetZoom} size="sm" variant="outline">
                    <Move className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Zoom: {Math.round(zoom * 100)}%
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties" className="space-y-4">
            {selectedObject?.isType('textbox') && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Text Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="textValue">Text Content</Label>
                    <Input
                      id="textValue"
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      placeholder="Enter text"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fontSize">Font Size: {fontSize}px</Label>
                    <Slider
                      value={[fontSize]}
                      onValueChange={(value) => setFontSize(value[0])}
                      min={8}
                      max={72}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="textColor">Text Color</Label>
                    <ColorPicker
                      color={textColor}
                      onChange={setTextColor}
                    />
                  </div>

                  <div>
                    <Label htmlFor="fontWeight">Font Weight: {fontWeight}</Label>
                    <Slider
                      value={[fontWeight]}
                      onValueChange={(value) => setFontWeight(value[0])}
                      min={100}
                      max={900}
                      step={100}
                      className="mt-2"
                    />
                  </div>

                  <Button onClick={updateSelectedObject} className="w-full">
                    Update Text
                  </Button>
                </CardContent>
              </Card>
            )}

            {(selectedObject?.isType('rect') || selectedObject?.isType('circle')) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Shape Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="fillColor">Fill Color</Label>
                    <ColorPicker
                      color={fillColor}
                      onChange={setFillColor}
                    />
                  </div>

                  <div>
                    <Label htmlFor="strokeWidth">Stroke Width: {strokeWidth}px</Label>
                    <Slider
                      value={[strokeWidth]}
                      onValueChange={(value) => setStrokeWidth(value[0])}
                      min={0}
                      max={10}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  {strokeWidth > 0 && (
                    <div>
                      <Label htmlFor="strokeColor">Stroke Color</Label>
                      <ColorPicker
                        color={strokeColor}
                        onChange={setStrokeColor}
                      />
                    </div>
                  )}

                  <Button onClick={updateSelectedObject} className="w-full">
                    Update Shape
                  </Button>
                </CardContent>
              </Card>
            )}

            {selectedObject && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Element Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button onClick={copySelected} variant="outline" className="w-full">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Element
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button onClick={bringToFront} size="sm" variant="outline" className="flex-1">
                      ↑ Front
                    </Button>
                    <Button onClick={sendToBack} size="sm" variant="outline" className="flex-1">
                      ↓ Back
                    </Button>
                  </div>
                  
                  <Button onClick={deleteSelected} variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Element
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="layers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <Layers className="mr-2 h-4 w-4" />
                  Layers ({canvasObjects.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {canvasObjects.slice().reverse().map((obj, index) => {
                    const actualIndex = canvasObjects.length - 1 - index;
                    const isSelected = selectedObject === obj;
                    
                    return (
                      <div
                        key={actualIndex}
                        className={`p-2 rounded cursor-pointer text-sm ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                        }`}
                        onClick={() => {
                          fabricCanvas?.setActiveObject(obj);
                          fabricCanvas?.renderAll();
                        }}
                      >
                        {obj.type === 'textbox' ? `Text: ${(obj as Textbox).text?.substring(0, 15)}...` :
                         obj.type === 'rect' ? 'Rectangle' :
                         obj.type === 'circle' ? 'Circle' :
                         obj.type === 'image' ? 'Image' :
                         `${obj.type}`}
                      </div>
                    );
                  })}
                  {canvasObjects.length === 0 && (
                    <div className="text-muted-foreground text-center py-4">
                      No elements on canvas
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Global Actions */}
        <div className="space-y-2">
          <Button onClick={previewAlert} variant="outline" className="w-full">
            <Eye className="mr-2 h-4 w-4" />
            Preview Alert
          </Button>
          
          <Button onClick={saveDesign} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            Save Design
          </Button>
          
          <Button onClick={clearCanvas} variant="destructive" className="w-full">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Canvas
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1">
        <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-900">
          <canvas ref={canvasRef} />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Canvas Size: 800x450px (16:9 aspect ratio) • Zoom: {Math.round(zoom * 100)}% • Use mouse wheel to zoom
        </p>
      </div>
    </div>
  );
};
