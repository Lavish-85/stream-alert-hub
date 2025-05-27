
import React, { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Textbox, FabricObject } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Type, Save, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const AlertDesigner = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [textValue, setTextValue] = useState("");
  const [fontSize, setFontSize] = useState(24);
  const [textColor, setTextColor] = useState("#ffffff");

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 450,
      backgroundColor: "#1a1a1a",
    });

    // Set up event handlers
    canvas.on('selection:created', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on('selection:updated', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    setFabricCanvas(canvas);
    toast.success("Canvas ready! Start designing your alert!");

    return () => {
      canvas.dispose();
    };
  }, []);

  const addTextElement = () => {
    if (!fabricCanvas) return;

    const text = new Textbox("Donor Name", {
      left: 100,
      top: 100,
      fontFamily: "Arial",
      fontSize: 24,
      fill: "#ffffff",
      backgroundColor: "transparent",
      width: 200,
      textAlign: "center",
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
    toast.success("Text element added!");
  };

  const updateSelectedText = () => {
    if (!selectedObject || !selectedObject.isType('textbox')) return;

    const textbox = selectedObject as Textbox;
    if (textValue) textbox.set('text', textValue);
    textbox.set('fontSize', fontSize);
    textbox.set('fill', textColor);
    
    fabricCanvas?.renderAll();
    toast.success("Text updated!");
  };

  const deleteSelected = () => {
    if (!selectedObject || !fabricCanvas) return;
    
    fabricCanvas.remove(selectedObject);
    fabricCanvas.renderAll();
    setSelectedObject(null);
    toast.success("Element deleted!");
  };

  const clearCanvas = () => {
    if (!fabricCanvas) return;
    
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#1a1a1a";
    fabricCanvas.renderAll();
    setSelectedObject(null);
    toast.success("Canvas cleared!");
  };

  const previewAlert = () => {
    // TODO: Implement preview functionality
    toast.info("Preview functionality coming soon!");
  };

  const saveDesign = () => {
    if (!fabricCanvas) return;
    
    const designData = fabricCanvas.toJSON();
    // TODO: Save to database
    console.log("Design data:", designData);
    toast.success("Design saved locally! Database integration coming soon.");
  };

  return (
    <div className="flex gap-6">
      {/* Toolbar */}
      <div className="w-80 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-3">Add Elements</h3>
          <Button 
            onClick={addTextElement} 
            className="w-full"
            variant="outline"
          >
            <Type className="mr-2 h-4 w-4" />
            Add Text
          </Button>
        </div>

        <Separator />

        {/* Element Properties */}
        {selectedObject?.isType('textbox') && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Text Properties</h3>
            
            <div>
              <Label htmlFor="textValue">Text Content</Label>
              <Input
                id="textValue"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder={(selectedObject as Textbox).text || "Enter text"}
              />
            </div>

            <div>
              <Label htmlFor="fontSize">Font Size</Label>
              <Input
                id="fontSize"
                type="number"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                min="8"
                max="72"
              />
            </div>

            <div>
              <Label htmlFor="textColor">Text Color</Label>
              <Input
                id="textColor"
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
              />
            </div>

            <Button onClick={updateSelectedText} className="w-full">
              Update Text
            </Button>

            <Button 
              onClick={deleteSelected} 
              variant="destructive" 
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Element
            </Button>
          </div>
        )}

        <Separator />

        {/* Canvas Actions */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Actions</h3>
          
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
          Canvas Size: 800x450px (16:9 aspect ratio, perfect for OBS)
        </p>
      </div>
    </div>
  );
};
