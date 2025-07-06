import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import SetUsername from "./pages/SetUsername";

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
  const { user, userData, loading } = useAuth();

  console.log('AppContent render:', { user: !!user, userData: !!userData, loading });

  if (loading) {
    return <LoadingScreen />;
  }

  // Pas connecté
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Connecté mais pas de données utilisateur (problème technique)
  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <p className="mb-4">Erreur de chargement des données utilisateur</p>
          <p className="text-sm text-gray-400 mb-4">
            Il semble que votre profil n'ait pas été créé correctement.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
          >
            Recharger
          </button>
          <button 
            onClick={() => {
              // Forcer la déconnexion pour permettre une nouvelle inscription
              window.location.href = '/login';
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  // Connecté mais pas de pseudo
  if (!userData.username) {
    return (
      <Routes>
        <Route path="/set-username" element={<SetUsername />} />
        <Route path="*" element={<Navigate to="/set-username" replace />} />
      </Routes>
    );
  }

  // Tout est OK, accès au jeu
  return (
    <Routes>
      <Route path="/" element={<Index />} />
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