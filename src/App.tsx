
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { AlertStyleProvider } from '@/contexts/AlertStyleContext'
import { Toaster } from '@/components/ui/sonner'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/layout/Layout'
import Index from '@/pages/Index'
import AuthPage from '@/pages/AuthPage'
import DonationPage from '@/pages/DonationPage'
import SetupPage from '@/pages/SetupPage'
import AlertsPage from '@/pages/AlertsPage'
import AlertDesignerPage from '@/pages/AlertDesignerPage'
import LiveAlertsPage from '@/pages/LiveAlertsPage'
import DonationCustomizePage from '@/pages/DonationCustomizePage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import SettingsPage from '@/pages/SettingsPage'
import NotFound from '@/pages/NotFound'
import './index.css'

const queryClient = new QueryClient()

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AlertStyleProvider>
        {children}
      </AlertStyleProvider>
    </AuthProvider>
  </QueryClientProvider>
)

function App() {
  return (
    <AppProviders>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/donate/:identifier" element={<DonationPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Index />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/setup" element={
            <ProtectedRoute>
              <Layout>
                <SetupPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/alerts" element={
            <ProtectedRoute>
              <Layout>
                <AlertsPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/alerts/designer" element={
            <ProtectedRoute>
              <Layout>
                <AlertDesignerPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/alerts/live" element={
            <ProtectedRoute>
              <Layout>
                <LiveAlertsPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/donation-customize" element={
            <ProtectedRoute>
              <Layout>
                <DonationCustomizePage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute>
              <Layout>
                <AnalyticsPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout>
                <SettingsPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
