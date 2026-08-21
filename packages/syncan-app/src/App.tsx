import { flattenCollections } from '@isoflow/isopacks/dist/utils';
import isoflowIsopack from '@isoflow/isopacks/dist/isoflow';
import './App.css';
import { BrowserRouter, Navigate, Route, Routes, useParams, useLocation } from 'react-router-dom';
import LoginPage from "./pages/LoginPage";
import EditorPage from "./EditorPage";
import Dashboard from "./pages/Dashboard";
import InventoryPage from "./pages/InventoryPage";
import AssetsPage from "./pages/AssetsPage";
import { getToken, isAdmin, logout, isExpired, getExpiry } from "./auth/auth";
import { ToastProvider } from './components/ToastProvider';
import TonerPage from "./pages/TonerPage";
import ProfilePage from './pages/ProfilePage';
import ReportPage from './pages/ReportPage';
import TrashPage from './pages/UnderConstruction';
import UnderConstruction from './pages/UnderConstruction';

// Load core isoflow icons (always loaded)
const coreIcons = flattenCollections([isoflowIsopack]);

interface SavedDiagram {
  id: string;
  name: string;
  data: any;
  createdAt: string;
  updatedAt: string;
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = getToken();

  if (!token) return <Navigate to="/login" replace />;

  if (isExpired()) {
    logout();
    return (
      <Navigate
        to="/login"
        replace
        state={{ sessionExpired: true }}
      />
    );
  }

  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>

          <Route path="/login" element={<LoginPage />} />

          <Route path="/logout" element={<LogoutHandler />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/flow"
            element={
              <ProtectedRoute>
                <EditorPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <InventoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/assets"
            element={
              <ProtectedRoute>
                <AssetsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/toner"
            element={
              <ProtectedRoute>
                <TonerPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <ReportPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/trash"
            element={
              <ProtectedRoute>
                <TrashPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/error"
            element={
              <ProtectedRoute>
                <UnderConstruction />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="*" element={<Navigate to="/error" replace />} />

        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

function LogoutHandler() {
  logout();
  return <Navigate to="/login" replace />;
}


// export default App;