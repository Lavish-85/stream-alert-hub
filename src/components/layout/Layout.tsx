
import React, { ReactNode, useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children?: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header setIsMobileOpen={setIsMobileOpen} />
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      <main className="flex-1 md:ml-64 pt-6 p-4 md:p-8 my-[70px]">
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default Layout;
