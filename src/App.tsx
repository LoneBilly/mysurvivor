import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import CreateProfile from './pages/CreateProfile';
import Admin from './pages/Admin';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import AdminRoute from './components/AdminRoute';
import { useEffect } from 'react';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();

  if (loading) {
    // You can add a global loader here
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
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