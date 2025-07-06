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

const AppContent = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Chargement...</p>
        </div>
      </div>
    );
  }

  // User is not logged in
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // User is logged in, but the profile couldn't be fetched (e.g., trigger failed)
  if (user && !profile) {
     return (
      <Routes>
        <Route path="/incomplete-profile" element={<IncompleteProfile />} />
        <Route path="*" element={<Navigate to="/incomplete-profile" replace />} />
      </Routes>
    );
  }
  
  // User is logged in, profile exists, but username is not set (new user)
  if (user && profile && !profile.username) {
    return (
      <Routes>
        <Route path="/create-profile" element={<CreateProfile />} />
        <Route path="*" element={<Navigate to="/create-profile" replace />} />
      </Routes>
    );
  }

  // User is authenticated and has a valid profile
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