
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

const queryClient = new QueryClient();

const App = () => {
  // Check if we're in OBS mode
  const isOBSMode = new URLSearchParams(window.location.search).get('obs') === 'true';

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {!isOBSMode && (
          <>
            <Toaster />
            <Sonner />
          </>
        )}
        <BrowserRouter>
          <Routes>
            {/* OBS mode route bypasses Layout */}
            {isOBSMode && (
              <Route path="/live-alerts" element={<LiveAlertsPage />} />
            )}
            
            {/* Regular routes with Layout */}
            <Route element={<Layout />}>
              <Route path="/" element={<SetupPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              {!isOBSMode && <Route path="/live-alerts" element={<LiveAlertsPage />} />}
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
