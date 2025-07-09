import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center text-black">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-black" />
        </div>
      </div>
    );
  }

  return user ? <Navigate to="/game" /> : children;
};

export default PublicRoute;