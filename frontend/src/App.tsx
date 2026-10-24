import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { PatientsPage } from './pages/PatientsPage';
import { TelemedicinePage } from './pages/TelemedicinePage';
import { PrescriptionsPage } from './pages/PrescriptionsPage';
import { IntakeFormsPage } from './pages/IntakeFormsPage';
import { RotaPage } from './pages/RotaPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BillingPage } from './pages/BillingPage';
import { PlatformOwnerPage } from './pages/PlatformOwnerPage';
import { PublicBookingPage } from './pages/PublicBookingPage';
import { ComplianceChecklistPage } from './pages/ComplianceChecklistPage';
import { SettingsPage } from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000
    }
  }
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Google Business Profile Booking Route */}
            <Route path="/book/:clinicSlug" element={<PublicBookingPage />} />

            {/* Authenticated Clinic & Platform Workspace */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/appointments" element={<AppointmentsPage />} />
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/telemedicine" element={<TelemedicinePage />} />
              <Route path="/prescriptions" element={<PrescriptionsPage />} />
              <Route path="/intake" element={<IntakeFormsPage />} />
              <Route path="/rota" element={<RotaPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/platform" element={<PlatformOwnerPage />} />
              <Route path="/compliance" element={<ComplianceChecklistPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
