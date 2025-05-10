
import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { Toaster } from 'sonner';
import { loadSavedTheme } from '@/lib/utils';

const Layout = () => {
  // Add state for mobile navigation
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Load theme when the layout mounts
  useEffect(() => {
    loadSavedTheme();
  }, []);

  return (
    <div className="flex h-screen">
      <Sidebar 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header 
          setIsMobileOpen={setIsMobileOpen}
        />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
        <Toaster richColors position="top-right" />
      </div>
    </div>
  );
};

export default Layout;
