import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { RoleGuard } from './components/auth/RoleGuard';

// Layout Components
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { Footer } from './components/layout/Footer';

// Pages — 5 Core Hub Architecture
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { AuthorityDashboardPage } from './pages/AuthorityDashboardPage';
import { OperatorDashboardPage } from './pages/OperatorDashboardPage';
import { EngineerDashboardPage } from './pages/EngineerDashboardPage';
import { ManagerDashboardPage } from './pages/ManagerDashboardPage';

// Hub 1: Dam Hub
import { DamDirectoryPage } from './pages/DamDirectoryPage';
import { DamDetailPage } from './pages/DamDetailPage';

// Hub 2: Inspection & AI Studio Hub
import { InspectionsPage } from './pages/InspectionsPage';
import { InspectionDetailPage } from './pages/InspectionDetailPage';
import { GISPage } from './pages/GISPage';

// Hub 3: 3D Digital Twin Hub
import { DigitalTwinPage } from './pages/DigitalTwinPage';

// Hub 4: Risk & Maintenance Hub
import { MaintenancePage } from './pages/MaintenancePage';

// Hub 5: Reports & Governance Hub
import { ReportsPage } from './pages/ReportsPage';
import { ReportVerificationPage } from './pages/ReportVerificationPage';
import { AlertsPage } from './pages/AlertsPage';
import { AuditPage } from './pages/AuditPage';
import { AboutPage } from './pages/AboutPage';
import { SupremeCommandPage } from './pages/SupremeCommandPage';
import { PublicGrievancePage } from './pages/PublicGrievancePage';
import { AuthorityPublicGrievancesPage } from './pages/AuthorityPublicGrievancesPage';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-govt-light text-govt-dark font-sans text-[15px]">
      <Header />
      <Navigation />
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export const AppContent: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/public-grievance" element={<PublicGrievancePage />} />
      <Route path="/verify-report" element={<ReportVerificationPage />} />
      <Route path="/reports/verify" element={<ReportVerificationPage />} />

      <Route
        path="/*"
        element={
          <AppLayout>
            <Routes>
              <Route path="/" element={<RoleGuard><HomePage /></RoleGuard>} />
              <Route path="/public-grievance" element={<PublicGrievancePage />} />
              
              {/* Dashboards */}
              <Route
                path="/authority/dashboard"
                element={<RoleGuard allowedRoles={['AUTHORITY']}><AuthorityDashboardPage /></RoleGuard>}
              />
              <Route
                path="/authority/grievances"
                element={<RoleGuard allowedRoles={['AUTHORITY']}><AuthorityPublicGrievancesPage /></RoleGuard>}
              />
              <Route
                path="/operator/dashboard"
                element={<RoleGuard allowedRoles={['DAM_OPERATOR']}><OperatorDashboardPage /></RoleGuard>}
              />
              <Route
                path="/engineer/dashboard"
                element={<RoleGuard allowedRoles={['INSPECTION_ENGINEER']}><EngineerDashboardPage /></RoleGuard>}
              />
              <Route
                path="/manager/dashboard"
                element={<RoleGuard allowedRoles={['MAINTENANCE_MANAGER']}><ManagerDashboardPage /></RoleGuard>}
              />
              
              {/* Hub 1: Dam Hub */}
              <Route path="/dams" element={<RoleGuard><DamDirectoryPage /></RoleGuard>} />
              <Route path="/dams/:id" element={<RoleGuard><DamDetailPage /></RoleGuard>} />
              
              {/* Hub 2: Inspection & AI Studio Hub */}
              <Route path="/inspections" element={<RoleGuard><InspectionsPage /></RoleGuard>} />
              <Route path="/inspections/:id" element={<RoleGuard><InspectionDetailPage /></RoleGuard>} />
              <Route path="/gis" element={<RoleGuard><GISPage /></RoleGuard>} />

              {/* Hub 3: 3D Digital Twin Hub */}
              <Route path="/digital-twin" element={<RoleGuard><DigitalTwinPage /></RoleGuard>} />
              <Route path="/digital-twin/:damId" element={<RoleGuard><DigitalTwinPage /></RoleGuard>} />

              {/* Hub 4: Risk & Maintenance Hub */}
              <Route path="/maintenance" element={<RoleGuard><MaintenancePage /></RoleGuard>} />

              {/* Hub 5: Governance & Reports Hub */}
              <Route path="/reports" element={<RoleGuard><ReportsPage /></RoleGuard>} />
              <Route path="/alerts" element={<RoleGuard><AlertsPage /></RoleGuard>} />
              <Route
                path="/audit"
                element={<RoleGuard allowedRoles={['AUTHORITY', 'INSPECTION_ENGINEER', 'MAINTENANCE_MANAGER', 'SUPREME_COMMAND']}><AuditPage /></RoleGuard>}
              />
              <Route path="/about" element={<RoleGuard><AboutPage /></RoleGuard>} />
              <Route
                path="/supreme-command"
                element={<RoleGuard allowedRoles={['SUPREME_COMMAND']}><SupremeCommandPage /></RoleGuard>}
              />

              {/* Consolidated Route Aliases / Redirects for backward compatibility */}
              <Route path="/drone-data" element={<Navigate to="/inspections" replace />} />
              <Route path="/drone-planner" element={<Navigate to="/inspections" replace />} />
              <Route path="/data-quality" element={<Navigate to="/inspections" replace />} />
              <Route path="/ai-analysis" element={<Navigate to="/inspections" replace />} />
              <Route path="/defect-verification" element={<Navigate to="/inspections" replace />} />
              <Route path="/defects" element={<Navigate to="/inspections" replace />} />
              <Route path="/historical-comparison" element={<Navigate to="/inspections" replace />} />
              <Route path="/condition-assessment" element={<Navigate to="/inspections" replace />} />
              <Route path="/spatial-input" element={<Navigate to="/inspections" replace />} />

              <Route path="/telemetry" element={<Navigate to="/dams" replace />} />
              <Route path="/eap" element={<Navigate to="/dams" replace />} />
              <Route path="/ndsa-compliance" element={<Navigate to="/dams" replace />} />

              <Route path="/risk" element={<Navigate to="/maintenance" replace />} />
              <Route path="/maintenance-planning" element={<Navigate to="/maintenance" replace />} />
              <Route path="/work-orders" element={<Navigate to="/maintenance" replace />} />
              <Route path="/reinspection" element={<Navigate to="/maintenance" replace />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        }
      />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
};

export default App;
