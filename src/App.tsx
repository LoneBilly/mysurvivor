import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { GameStateProvider } from "@/contexts/GameStateContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import AdminLayout from "@/layouts/AdminLayout";
import GameLayout from "@/layouts/GameLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "easymde/dist/easymde.min.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <GameStateProvider>
          <WebSocketProvider>
            <TooltipProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<GameLayout />}>
                  <Route index element={<Index />} />
                </Route>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                </Route>
              </Routes>
              <Toaster />
            </TooltipProvider>
          </WebSocketProvider>
        </GameStateProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;