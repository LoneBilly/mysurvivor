import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center landing-page-bg">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        </div>
      </div>
    );
  }

  return user ? <Navigate to="/game" /> : children;
};

export default PublicRoute;