import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from '@/contexts/AuthContext';
import BannedOverlay from '@/components/BannedOverlay';

import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import CreateProfile from '@/pages/CreateProfile';
import Game from '@/pages/Game';
import Admin from '@/pages/Admin';
import NotFound from '@/pages/NotFound';

import PublicRoute from '@/components/PublicRoute';
import AdminRoute from '@/components/AdminRoute';
import PrivateRoute from '@/components/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          
          <Route path="/create-profile" element={<PrivateRoute><CreateProfile /></PrivateRoute>} />
          <Route path="/game" element={<PrivateRoute><Game /></PrivateRoute>} />
          
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BannedOverlay />
      </AuthProvider>
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  );
}

export default App;