import { HashRouter, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import IdeasPage from './pages/IdeasPage';
import LogsPage from './pages/LogsPage';
import PapersPage from './pages/PapersPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/ideas" element={<IdeasPage />} />
          <Route path="/papers" element={<PapersPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}
