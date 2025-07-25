import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Index from './pages/Index';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from './integrations/supabase/client';
import { useAuth } from './contexts/AuthContext';
import { useEffect } from 'react';

function App() {
  const { session } = useAuth();

  if (!session) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg">
                <Auth
                    supabaseClient={supabase}
                    appearance={{ theme: ThemeSupa }}
                    providers={[]}
                    theme="dark"
                />
            </div>
        </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
      </Routes>
    </Router>
  );
}

export default App;