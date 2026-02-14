import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell.tsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { BudgetRoundSelectPage } from './pages/BudgetRoundSelectPage.tsx';
import { CaseOverviewPage } from './pages/CaseOverviewPage.tsx';
import { CaseCreatePage } from './pages/CaseCreatePage.tsx';
import { CaseDetailPage } from './pages/CaseDetailPage.tsx';
import { SubmissionPage } from './pages/SubmissionPage.tsx';
import { VersionHistoryPage } from './pages/VersionHistoryPage.tsx';
import { AdminCaseTypesPage } from './pages/AdminCaseTypesPage.tsx';
import { HistoryPage } from './pages/HistoryPage.tsx';
import { AtFinPage } from './pages/AtFinPage.tsx';
import { MySakerPage } from './pages/MySakerPage.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/budget-rounds" element={<BudgetRoundSelectPage />} />
              <Route path="/cases" element={<CaseOverviewPage />} />
              <Route path="/my-cases" element={<MySakerPage />} />
              <Route path="/cases/new" element={<CaseCreatePage />} />
              <Route path="/cases/:id" element={<CaseDetailPage />} />
              <Route path="/cases/:id/history" element={<VersionHistoryPage />} />
              <Route path="/submissions" element={<SubmissionPage />} />
              <Route path="/at-fin" element={<AtFinPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/admin/case-types" element={<AdminCaseTypesPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
