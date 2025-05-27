
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
}

const predefinedColors = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", 
  "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080",
  "#008000", "#800000", "#008080", "#000080", "#FFC0CB",
  "#4F46E5", "#10B981", "#EF4444", "#F59E0B", "#111827"
];

export function ColorPicker({ color, onChange, className }: ColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState(color || "#000000");

  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor);
    onChange(newColor);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleColorChange(e.target.value);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full flex justify-between items-center border-2", 
            className
          )}
        >
          <div className="flex items-center space-x-2">
            <div
              className="h-5 w-5 rounded-full border border-gray-300"
              style={{ backgroundColor: selectedColor }}
            />
            <span>{selectedColor}</span>
          </div>
          <span>Pick</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-2">
          <div className="mb-3">
            <label className="text-sm font-medium">Custom Color</label>
            <div className="flex mt-1">
              <input
                type="color"
                value={selectedColor}
                onChange={handleCustomColorChange}
                className="w-full"
              />
            </div>
          </div>
          <div className="mb-2">
            <label className="text-sm font-medium">Preset Colors</label>
            <div className="grid grid-cols-5 gap-2 mt-1">
              {predefinedColors.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => handleColorChange(presetColor)}
                  className={cn(
                    "h-6 w-6 rounded-md border",
                    selectedColor === presetColor 
                      ? "ring-2 ring-offset-1 ring-black dark:ring-white" 
                      : ""
                  )}
                  style={{ backgroundColor: presetColor }}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
