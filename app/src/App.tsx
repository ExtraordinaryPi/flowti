import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App as AntApp, ConfigProvider } from 'antd';
import deDE from 'antd/locale/de_DE';
import { AuthGuard } from './components/AuthGuard';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { PortfoliosPage } from './pages/PortfoliosPage';
import { ExamsPage } from './pages/ExamsPage';
import { ExamineesPage } from './pages/ExamineesPage';
import { ScansPage } from './pages/ScansPage';
import { RawdataPage } from './pages/RawdataPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <ConfigProvider locale={deDE}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <AuthGuard>
                  <AppLayout />
                </AuthGuard>
              }
            >
              <Route index element={<Navigate to="/portfolios" replace />} />
              <Route path="portfolios" element={<PortfoliosPage />} />
              <Route path="exams" element={<ExamsPage />} />
              <Route path="examinees" element={<ExamineesPage />} />
              <Route path="scans" element={<ScansPage />} />
              <Route path="rawdata" element={<RawdataPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/portfolios" replace />} />
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}
