import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  if (!user || role !== 'admin') {
    // Redirige vers la page d'accueil si l'utilisateur n'est pas un admin
    return <Navigate to="/" />;
  }

  return children;
};

export default AdminRoute;