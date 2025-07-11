import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Index from './pages/Index';
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
import { Loader2, CheckCircle, XCircle, Info } from 'lucide-react';

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
                <Index />
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
          closeButton
          swipeable={false}
          duration={5000}
          toastOptions={{
            classNames: {
              toast: 'relative bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-lg p-4 pr-10 flex items-center gap-3',
              title: 'text-base font-semibold text-white',
              description: 'text-sm text-gray-300',
              success: '!border-green-500/50',
              error: '!border-red-500/50',
              info: '!border-sky-500/50',
              closeButton: 'absolute top-2.5 right-2.5 bg-white/10 border-0 text-white hover:bg-white/20 rounded-md w-6 h-6 flex items-center justify-center',
            },
            icons: {
              success: <CheckCircle className="w-6 h-6 text-green-400" />,
              error: <XCircle className="w-6 h-6 text-red-400" />,
              info: <Info className="w-6 h-6 text-sky-400" />,
              loading: <Loader2 className="w-6 h-6 animate-spin" />,
            }
          }}
        />
      </AuthProvider>
    </Router>
  );
}

export default App;