import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Leaderboard from '@/components/Leaderboard';
import { ShieldAlert } from 'lucide-react';

const Login = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800/40 via-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
        <div className="w-full max-w-md bg-black/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-8 shadow-2xl shadow-black/50">
          <div className="text-center mb-8">
            <ShieldAlert className="w-12 h-12 mx-auto text-amber-400/80 mb-4" />
            <h1 className="text-3xl font-bold text-amber-400 font-mono tracking-wider uppercase">
              Terminal de Survie
            </h1>
            <p className="text-gray-400 mt-2">Authentification requise pour continuer.</p>
          </div>
          
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#f59e0b',
                    brandAccent: '#d97706',
                    defaultButtonBackground: 'rgba(55, 65, 81, 0.8)',
                    defaultButtonBackgroundHover: 'rgba(75, 85, 99, 0.8)',
                    inputBackground: 'rgba(17, 24, 39, 0.5)',
                    inputBorder: '#4b5563',
                    inputBorderFocus: '#f59e0b',
                    inputText: 'white',
                    messageText: '#9ca3af',
                    anchorTextColor: '#60a5fa',
                    anchorTextColorHover: '#93c5fd',
                  },
                  fonts: {
                    bodyFontFamily: `ui-sans-serif, system-ui, sans-serif`,
                    buttonFontFamily: `ui-sans-serif, system-ui, sans-serif`,
                    labelFontFamily: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`,
                  }
                }
              },
            }}
            theme="dark"
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Identifiant',
                  password_label: 'Mot de passe',
                  button_label: 'Connexion',
                  loading_button_label: 'Connexion...',
                  link_text: 'Vous avez déjà un compte ? Connectez-vous',
                  email_input_placeholder: 'Votre identifiant',
                  password_input_placeholder: 'Votre mot de passe',
                  error_message: {
                    invalid_credentials: "Identifiants invalides. Le compte n'existe peut-être pas ou le mot de passe est incorrect. Voulez-vous en créer un ?"
                  }
                },
                sign_up: {
                  email_label: 'Identifiant',
                  password_label: 'Mot de passe',
                  button_label: "S'inscrire",
                  loading_button_label: 'Inscription...',
                  link_text: "Pas de compte ? Créez-en un pour survivre",
                  email_input_placeholder: 'Choisissez un identifiant',
                  password_input_placeholder: 'Choisissez un mot de passe',
                },
                forgotten_password: {
                  email_label: 'Identifiant',
                  password_label: 'Nouveau mot de passe', // This label is for the reset form, not the request form
                  button_label: 'Envoyer les instructions de réinitialisation',
                  loading_button_label: 'Envoi en cours...',
                  link_text: 'Mot de passe oublié ?',
                  email_input_placeholder: 'Votre identifiant',
                  link_text_return: 'Retour à la connexion',
                },
                update_password: {
                  password_label: 'Nouveau mot de passe',
                  password_input_placeholder: 'Entrez votre nouveau mot de passe',
                  button_label: 'Mettre à jour le mot de passe',
                  loading_button_label: 'Mise à jour...',
                }
              }
            }}
          />
        </div>
        <div className="w-full max-w-md lg:max-w-lg">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
};

export default Login;