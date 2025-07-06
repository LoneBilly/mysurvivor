import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full border border-gray-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Jeu de Survie</h1>
            <p className="text-gray-600">Connectez-vous pour commencer votre aventure</p>
          </div>
          
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#2563eb',
                    brandAccent: '#1d4ed8',
                    inputBackground: '#f8fafc',
                    inputBorder: '#e2e8f0',
                    inputBorderFocus: '#2563eb',
                  }
                }
              }
            }}
            theme="light"
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email',
                  password_label: 'Mot de passe',
                  button_label: 'Se connecter',
                  loading_button_label: 'Connexion...',
                  link_text: 'Vous avez déjà un compte ? Connectez-vous'
                },
                sign_up: {
                  email_label: 'Email',
                  password_label: 'Mot de passe',
                  button_label: "S'inscrire",
                  loading_button_label: 'Inscription...',
                  link_text: "Vous n'avez pas de compte ? Inscrivez-vous"
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;