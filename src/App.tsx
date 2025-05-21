
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
import { AuthProvider } from "./contexts/AuthContext";
import { AlertStyleProvider } from "./contexts/AlertStyleContext";
import AuthPage from "./pages/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";
import DonationPage from "./pages/DonationPage";
import DonationCustomizePage from "./pages/DonationCustomizePage";

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

                {/* Public donation page */}
                <Route path="/donate/:channelId" element={<DonationPage />} />

                {/* LiveAlerts route - handles both regular and token-authenticated OBS mode */}
                {/* OBS mode authentication is now handled within the component itself */}
                <Route path="/live-alerts" element={
                  isOBSMode ? <LiveAlertsPage /> : (
                    <ProtectedRoute>
                      <Layout>
                        <LiveAlertsPage />
                      </Layout>
                    </ProtectedRoute>
                  )
                } />
                
                {/* Protected routes with Layout */}
                <Route path="/" element={<ProtectedRoute><Layout><SetupPage /></Layout></ProtectedRoute>} />
                <Route path="/alerts" element={<ProtectedRoute><Layout><AlertsPage /></Layout></ProtectedRoute>} />
                <Route path="/donation-customize" element={<ProtectedRoute><Layout><DonationCustomizePage /></Layout></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><Layout><AnalyticsPage /></Layout></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
                
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
