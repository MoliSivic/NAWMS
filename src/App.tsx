import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/data/types";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import StockInPage from "@/pages/StockInPage";
import StockOutPage from "@/pages/StockOutPage";
import WarehouseMapPage from "@/pages/WarehouseMapPage";
import Shelf3DPage from "@/pages/Shelf3DPage";
import InventoryPage from "@/pages/InventoryPage";
import PalletPage from "@/pages/PalletPage";
import RobotMonitorPage from "@/pages/RobotMonitorPage";
import OptimizationPage from "@/pages/OptimizationPage";
import ApprovalPage from "@/pages/ApprovalPage";
import AuditPage from "@/pages/AuditPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

/** Role-based route guard — redirects to dashboard if user lacks permission */
const RoleGuard: React.FC<{ roles: UserRole[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const AuthGate: React.FC = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <LoginPage />;
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/stock-in" element={<RoleGuard roles={['admin', 'operator']}><StockInPage /></RoleGuard>} />
        <Route path="/stock-out" element={<RoleGuard roles={['admin', 'operator']}><StockOutPage /></RoleGuard>} />
        <Route path="/warehouse-map" element={<RoleGuard roles={['admin', 'operator', 'supervisor', 'technician']}><WarehouseMapPage /></RoleGuard>} />
        <Route path="/shelf-3d" element={<RoleGuard roles={['admin', 'operator', 'supervisor']}><Shelf3DPage /></RoleGuard>} />
        <Route path="/inventory" element={<RoleGuard roles={['admin', 'operator', 'supervisor']}><InventoryPage /></RoleGuard>} />
        <Route path="/pallets" element={<RoleGuard roles={['admin', 'operator', 'supervisor']}><PalletPage /></RoleGuard>} />
        <Route path="/robots" element={<RoleGuard roles={['admin', 'technician']}><RobotMonitorPage /></RoleGuard>} />
        <Route path="/optimization" element={<RoleGuard roles={['admin', 'supervisor']}><OptimizationPage /></RoleGuard>} />
        <Route path="/approvals" element={<RoleGuard roles={['admin', 'supervisor']}><ApprovalPage /></RoleGuard>} />
        <Route path="/audit" element={<RoleGuard roles={['admin', 'supervisor']}><AuditPage /></RoleGuard>} />
        <Route path="/reports" element={<RoleGuard roles={['admin', 'supervisor', 'technician']}><ReportsPage /></RoleGuard>} />
        <Route path="/settings" element={<RoleGuard roles={['admin']}><SettingsPage /></RoleGuard>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AuthGate />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
