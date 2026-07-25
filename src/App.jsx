import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { DataProvider } from './context/DataContext';

import { AppShell } from './components/layout/AppShell';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { RoutinePage } from './pages/RoutinePage';
import { AttendancePage } from './pages/AttendancePage';
import { AssessmentsPage } from './pages/AssessmentsPage';
import { CGPAPage } from './pages/CGPAPage';
import { TuitionPage } from './pages/TuitionPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { FocusPage } from './pages/FocusPage';
import { SettingsPage } from './pages/SettingsPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || !user.isLoggedIn) return <Navigate to="/login" replace />;
  return children;
};

export const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <DataProvider>
            <HashRouter>
              <Routes>
                <Route path="/login" element={<AuthPage />} />

                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="routine" element={<RoutinePage />} />
                  <Route path="attendance" element={<AttendancePage />} />
                  <Route path="assessments" element={<AssessmentsPage />} />
                  <Route path="cgpa" element={<CGPAPage />} />
                  <Route path="tuition" element={<TuitionPage />} />
                  <Route path="expenses" element={<ExpensesPage />} />
                  <Route path="focus" element={<FocusPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </HashRouter>
          </DataProvider>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
