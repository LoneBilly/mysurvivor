import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center landing-page-bg">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Vérification des droits d'accès...</p>
        </div>
      </div>
    );
  }

  if (!user || role !== 'admin') {
    return <Navigate to="/game" />;
  }

  return children;
};

export default AdminRoute;