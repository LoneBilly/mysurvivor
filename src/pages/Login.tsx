import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">Rivalist</h2>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          theme="light"
          localization={{
            variables: {
              sign_in: {
                email_label: 'Adresse e-mail',
                password_label: 'Mot de passe',
                button_label: 'Se connecter',
                social_provider_text: 'Se connecter avec {{provider}}',
                link_text: 'Déjà un compte ? Connectez-vous',
              },
              sign_up: {
                email_label: 'Adresse e-mail',
                password_label: 'Mot de passe',
                button_label: 'S\'inscrire',
                social_provider_text: 'S\'inscrire avec {{provider}}',
                link_text: 'Pas de compte ? Inscrivez-vous',
              },
              forgotten_password: {
                email_label: 'Adresse e-mail',
                button_label: 'Envoyer les instructions',
                link_text: 'Mot de passe oublié ?',
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default Login;