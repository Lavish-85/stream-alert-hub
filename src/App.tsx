
import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import SetupPage from "./pages/SetupPage";
import AlertsPage from "./pages/AlertsPage";
import LiveAlertsPage from "./pages/LiveAlertsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import { AlertStyleProvider } from "./contexts/AlertStyleContext";
import { AuthProvider } from "./contexts/AuthContext";
import AuthPage from "./pages/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  // Check if we're in OBS mode
  const isOBSMode = new URLSearchParams(window.location.search).get('obs') === 'true';

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AlertStyleProvider>
            <TooltipProvider>
              {!isOBSMode && (
                <>
                  <Toaster />
                  <Sonner />
                </>
              )}
              <Routes>
                {/* Public auth route */}
                <Route path="/auth" element={<AuthPage />} />

                {/* OBS mode route bypasses Layout and auth */}
                <Route path="/live-alerts" element={<LiveAlertsPage />} />
                
                {/* Protected routes with Layout */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route path="/" element={<SetupPage />} />
                    <Route path="/alerts" element={<AlertsPage />} />
                    {/* Only show regular LiveAlertsPage in non-OBS mode in Layout */}
                    {!isOBSMode && <Route path="/live-alerts" element={<LiveAlertsPage />} />}
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </AlertStyleProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
