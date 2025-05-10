
import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { Toaster } from 'sonner';
import { loadSavedTheme } from '@/lib/utils';

const Layout = () => {
  // Load theme when the layout mounts
  useEffect(() => {
    loadSavedTheme();
  }, []);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
        <Toaster richColors position="top-right" />
      </div>
    </div>
  );
};

export default Layout;
