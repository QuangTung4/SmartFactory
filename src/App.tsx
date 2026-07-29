import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { RequireAuth } from "./components/RequireAuth.tsx";
import ManagerLayout from "./manager/ManagerLayout.tsx";
import ComingSoonPage from "./manager/pages/ComingSoonPage.tsx";
import DashboardPage from "./manager/pages/DashboardPage.tsx";
import IncidentsPage from "./manager/pages/IncidentsPage.tsx";
import InspectionLogPage from "./manager/pages/InspectionLogPage.tsx";
import KanbanPage from "./manager/pages/KanbanPage.tsx";
import ReportLibraryPage from "./manager/pages/ReportLibraryPage.tsx";
import ReportsPage from "./manager/pages/ReportsPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

/**
 * Webapp Quản lý (PC Browser).
 * Tablet công nhân → Android app riêng (mã tham chiếu trong `src/tablet/`).
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="sf-theme">
      <LocaleProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/manager"
                element={
                  <RequireAuth role={["ceo", "manager", "admin"]}>
                    <ManagerLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="devices" element={<ComingSoonPage titleKey="nav.devices" />} />
                <Route path="inspections" element={<ComingSoonPage titleKey="nav.inspections" />} />
                <Route path="maintenance" element={<ComingSoonPage titleKey="nav.maintenance" />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="library" element={<ReportLibraryPage />} />
                <Route path="incidents" element={<IncidentsPage />} />
                <Route path="kanban" element={<KanbanPage />} />
                <Route path="inspection-log" element={<InspectionLogPage />} />
                <Route path="users" element={<ComingSoonPage titleKey="nav.users" />} />
                <Route path="parts" element={<ComingSoonPage titleKey="nav.parts" />} />
              </Route>

              <Route path="/tablet" element={<Navigate to="/login" replace />} />
              <Route path="/dashboard" element={<Navigate to="/login" replace />} />
              <Route path="/checklist/:deviceId" element={<Navigate to="/login" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LocaleProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
