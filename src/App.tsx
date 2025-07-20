import { Toaster } from "@/components/ui/sonner";
import { GameProvider } from "./hooks/useGame";
import Index from "./pages/Index";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <GameProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors closeButton />
      </GameProvider>
    </SessionContextProvider>
  );
}

export default App;