import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { toast } from 'sonner';
import Index from './pages/Index';
import Login from './pages/Login';
import CreateProfile from './pages/CreateProfile';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';

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
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const toastElement = target.closest('[data-sonner-toast]');

      // Ne ferme pas le toast si on clique sur un bouton ou un lien à l'intérieur
      if (target.closest('button, a')) {
        return;
      }

      if (toastElement) {
        const toastId = toastElement.getAttribute('data-toast-id');
        if (toastId) {
          toast.dismiss(toastId);
        }
      }
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
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
        </Routes>
        <Toaster 
          position="top-center"
          toastOptions={{
            style: { cursor: 'pointer' },
          }}
        />
      </AuthProvider>
    </Router>
  );
}

export default App;