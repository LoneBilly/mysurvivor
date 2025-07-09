import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import CreateProfile from './pages/CreateProfile';
import Admin from './pages/Admin';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import AdminRoute from './components/AdminRoute';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center text-black">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-black" />
          <p className="text-gray-600">Chargement de votre aventure...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

function App() {
  useEffect(() => {
    const preventZoom = (e: TouchEvent) => {
      // Bloque le geste de zoom (pincement avec deux doigts)
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Ajoute l'écouteur d'événement au document
    // L'option { passive: false } est cruciale pour que preventDefault() fonctionne
    document.addEventListener('touchmove', preventZoom, { passive: false });

    // Nettoie l'écouteur lorsque le composant est démonté
    return () => {
      document.removeEventListener('touchmove', preventZoom);
    };
  }, []);

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/create-profile"
            element={
              <PrivateRoute>
                <CreateProfile />
              </PrivateRoute>
            }
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Index />
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
        </Routes>
        <Toaster position="top-center" />
      </AuthProvider>
    </Router>
  );
}

export default App;