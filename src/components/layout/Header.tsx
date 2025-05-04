
import React from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface HeaderProps {
  setIsMobileOpen: (open: boolean) => void;
}

const Header = ({ setIsMobileOpen }: HeaderProps) => {
  return (
    <header className="h-16 border-b bg-background flex items-center px-4 sticky top-0 z-30">
      <div className="flex w-full items-center justify-between">
        <Button
          size="icon"
          variant="ghost"
          className="md:hidden"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open Menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex-1 md:flex-none md:ml-64">
          <h1 className="text-xl font-semibold md:hidden">StreamDonate</h1>
        </div>

        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="bg-brand-50 text-brand-800 border-brand-200 hidden sm:flex">
            Free Plan
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Help</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="#" className="cursor-pointer">Documentation</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="#" className="cursor-pointer">OBS Setup Guide</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="#" className="cursor-pointer">UPI Integration FAQ</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="#" className="cursor-pointer">Contact Support</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
