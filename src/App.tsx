
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import SetupPage from "./pages/SetupPage";
import AlertsPage from "./pages/AlertsPage";
import LiveAlertsPage from "./pages/LiveAlertsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import { AlertStyleProvider } from "./contexts/AlertStyleContext";
import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Create a component that will handle setting up cache prevention headers
const CachePrevention = () => {
  const location = useLocation();
  const isOBSMode = new URLSearchParams(location.search).get('obs') === 'true';
  
  useEffect(() => {
    if (isOBSMode) {
      // Add anti-cache meta tags
      const addNoCacheMetaTags = () => {
        // Remove any existing cache-control meta tags
        const existingMetaTags = document.head.querySelectorAll('meta[http-equiv="Cache-Control"], meta[http-equiv="Pragma"], meta[http-equiv="Expires"]');
        existingMetaTags.forEach(tag => tag.remove());
        
        // Add new cache-control meta tags
        const cacheControlMeta = document.createElement('meta');
        cacheControlMeta.setAttribute('http-equiv', 'Cache-Control');
        cacheControlMeta.setAttribute('content', 'no-cache, no-store, must-revalidate');
        document.head.appendChild(cacheControlMeta);
        
        const pragmaMeta = document.createElement('meta');
        pragmaMeta.setAttribute('http-equiv', 'Pragma');
        pragmaMeta.setAttribute('content', 'no-cache');
        document.head.appendChild(pragmaMeta);
        
        const expiresMeta = document.createElement('meta');
        expiresMeta.setAttribute('http-equiv', 'Expires');
        expiresMeta.setAttribute('content', '0');
        document.head.appendChild(expiresMeta);
      };
      
      addNoCacheMetaTags();
    }
  }, [isOBSMode, location.pathname, location.search]);
  
  return null;
};

// Component to listen for style changes
const StyleChangeListener = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isOBSMode = new URLSearchParams(location.search).get('obs') === 'true';
  
  useEffect(() => {
    if (isOBSMode) {
      // Listen for style changes in the database
      const channel = supabase
        .channel('public:alert_styles')
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'alert_styles',
            filter: 'is_active=eq.true'
          }, 
          () => {
            console.log('Active style changed, refreshing OBS view');
            // Force refresh by updating URL with a new timestamp
            const currentPath = location.pathname;
            const searchParams = new URLSearchParams(location.search);
            searchParams.set('t', Date.now().toString());
            searchParams.set('obs', 'true');
            
            // Use navigate to refresh with new search params
            navigate(`${currentPath}?${searchParams.toString()}`, { replace: true });
            
            // Force reload as backup method
            setTimeout(() => {
              if (isOBSMode) {
                window.location.reload();
              }
            }, 100);
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOBSMode, location, navigate]);
  
  return null;
};

const App = () => {
  // Check if we're in OBS mode
  const isOBSMode = new URLSearchParams(window.location.search).get('obs') === 'true';
  // Add a key to force re-render on OBS mode
  const [obsKey, setObsKey] = useState(Date.now());

  // Force re-render on URL change for OBS mode
  useEffect(() => {
    if (isOBSMode) {
      setObsKey(Date.now());
    }
  }, [isOBSMode, window.location.search]);

  return (
    <QueryClientProvider client={queryClient}>
      <AlertStyleProvider>
        <TooltipProvider>
          {!isOBSMode && (
            <>
              <Toaster />
              <Sonner />
            </>
          )}
          <BrowserRouter>
            <CachePrevention />
            <StyleChangeListener />
            <Routes>
              {/* OBS mode route bypasses Layout */}
              {isOBSMode && (
                <Route path="/live-alerts" element={<LiveAlertsPage key={obsKey} />} />
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
      </AlertStyleProvider>
    </QueryClientProvider>
  );
};

export default App;
