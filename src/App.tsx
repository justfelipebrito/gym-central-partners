import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { RouteGuard } from '@/components/ui/RouteGuard'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthPage } from '@/pages/AuthPage'
import { PaywallPage } from '@/pages/PaywallPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { RequestsPage } from '@/pages/RequestsPage'
import { ClientProfilePage } from '@/pages/ClientProfilePage'
import { PlanPage } from '@/pages/PlanPage'
import { LogisticsPage } from '@/pages/LogisticsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { CookPlanGuard } from '@/components/ui/CookPlanGuard'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/paywall" element={<PaywallPage />} />

          {/* Protected — requires auth + active membership */}
          <Route
            element={
              <RouteGuard>
                <AppLayout />
              </RouteGuard>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/clients/:clientProfileId" element={<ClientProfilePage />} />

            {/* PT and Nutritionist only — Cook is redirected */}
            <Route
              path="/clients/:clientProfileId/plan"
              element={
                <CookPlanGuard>
                  <PlanPage />
                </CookPlanGuard>
              }
            />

            {/* Cook only */}
            <Route
              path="/clients/:clientProfileId/logistics"
              element={
                <RouteGuard requireRole="cook">
                  <LogisticsPage />
                </RouteGuard>
              }
            />

            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback - redirect root and unknown routes to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
