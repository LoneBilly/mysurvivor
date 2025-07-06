import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import CreateProfile from "./pages/CreateProfile";
import IncompleteProfile from "./pages/IncompleteProfile";

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
      <p className="text-white">Chargement...</p>
    </div>
  </div>
);

const AppContent = () => {
  const { user, profile, loading } = useAuth();

  // Afficher l'écran de chargement pendant l'initialisation
  if (loading) {
    return <LoadingScreen />;
  }

  // Utilisateur non connecté
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Utilisateur connecté mais profil non trouvé (problème de base de données)
  if (!profile) {
    return (
      <Routes>
        <Route path="/incomplete-profile" element={<IncompleteProfile />} />
        <Route path="*" element={<Navigate to="/incomplete-profile" replace />} />
      </Routes>
    );
  }

  // Utilisateur connecté avec profil mais sans pseudo (nouveau joueur)
  if (!profile.username) {
    return (
      <Routes>
        <Route path="/create-profile" element={<CreateProfile />} />
        <Route path="*" element={<Navigate to="/create-profile" replace />} />
      </Routes>
    );
  }

  // Utilisateur authentifié avec profil complet
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/create-profile" element={<Navigate to="/" replace />} />
      <Route path="/incomplete-profile" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner position="top-center" />
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;