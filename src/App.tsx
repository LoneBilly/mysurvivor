import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import CreateProfile from './pages/CreateProfile';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();

  if (loading) {
    // You can add a global loader here
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  return user ? children : <Navigate to="/login" />;
};

function App() {
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
            onClick: (event) => {
              const toastElement = event.currentTarget;
              const toastId = toastElement.dataset.toastId;
              if (toastId) {
                toast.dismiss(toastId);
              }
            },
            style: {
              cursor: 'pointer',
            },
          }}
        />
      </AuthProvider>
    </Router>
  );
}

export default App;