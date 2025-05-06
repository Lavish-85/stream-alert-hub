import React from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import UserMenu from "./UserMenu";
interface HeaderProps {
  setIsMobileOpen: (isOpen: boolean) => void;
}
const Header = ({
  setIsMobileOpen
}: HeaderProps) => {
  const navigate = useNavigate();
  return <header className="fixed z-10 top-0 left-0 right-0 h-16 flex items-center justify-between px-4 border-b bg-background md:px-[28px]">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileOpen(true)}>
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="sr-only">Open menu</span>
        </Button>
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate("/")}>
          <div className="bg-primary w-8 h-8 rounded-md flex items-center justify-center">
            <Zap className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg">StreamDonate</span>
        </div>
      </div>
      <div className="flex items-center">
        <UserMenu />
      </div>
    </header>;
};
export default Header;