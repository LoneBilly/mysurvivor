import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Game from './pages/Game';
import Login from './pages/Login';
import Landing from './pages/Landing';
import CreateProfile from './pages/CreateProfile';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import AdminRoute from './components/AdminRoute';
import PublicRoute from './components/PublicRoute';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center landing-page-bg">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Authentification en cours...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

function App() {
  useEffect(() => {
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    const handleContext = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('contextmenu', handleContext);

    return () => {
      document.removeEventListener('touchmove', preventZoom);
      document.removeEventListener('contextmenu', handleContext);
    };
  }, []);

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          
          <Route
            path="/game"
            element={
              <PrivateRoute>
                <Game />
              </PrivateRoute>
            }
          />
          <Route
            path="/create-profile"
            element={
              <PrivateRoute>
                <CreateProfile />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster
          position="top-center"
          richColors
          className="z-[99999]"
          toastOptions={{
            classNames: {
              toast: 'bg-slate-900/90 backdrop-blur-sm text-white border-slate-700/50 shadow-2xl pointer-events-auto',
              title: 'text-sm font-semibold',
              description: 'text-xs',
            },
            onMouseDown: (e) => e.stopPropagation(),
            onClick: (e) => e.stopPropagation(),
          }}
        />
      </AuthProvider>
    </Router>
  );
}

export default App;