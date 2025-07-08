import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Leaderboard from '@/components/Leaderboard';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';
import ActionModal from '@/components/ActionModal';

const Login = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, email: '' });

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignUp = async () => {
    setLoading(true);
    const emailToSignUp = modalState.email;
    setModalState({ isOpen: false, email: '' });

    const { error } = await supabase.auth.signUp({
      email: emailToSignUp,
      password: password,
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess('Compte créé ! Vous êtes maintenant connecté.');
      // AuthProvider will redirect to create-profile if needed
    }
    setLoading(false);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showError("Veuillez renseigner l'e-mail et le mot de passe.");
      return;
    }
    if (password.length < 6) {
      showError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setLoading(true);

    try {
      const { data: checkData, error: checkError } = await supabase.functions.invoke('check-user-exists', {
        body: { email },
      });

      if (checkError || !checkData) {
        throw new Error("Erreur lors de la vérification de l'utilisateur.");
      }
      
      if (!checkData.exists) {
        setModalState({ isOpen: true, email });
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        showError('Mot de passe incorrect.');
      }
      // On success, AuthProvider handles navigation
    } catch (error: any) {
      showError(error.message || "Une erreur est survenue.");
    }

    setLoading(false);
  };

  return (
    <>
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
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-400 font-mono">Identifiant</label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 bg-gray-900/50 border-gray-600 focus:border-amber-500 focus:ring-amber-500"
                  placeholder="survivant@zone-perdue.com"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="password"  className="text-sm font-medium text-gray-400 font-mono">Mot de passe</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 bg-gray-900/50 border-gray-600 focus:border-amber-500 focus:ring-amber-500"
                  placeholder="********"
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Connexion / Inscription
              </Button>
            </form>
          </div>
          <div className="w-full max-w-md lg:max-w-lg">
            <Leaderboard />
          </div>
        </div>
      </div>
      <ActionModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, email: '' })}
        title="Compte inexistant"
        description={
          <span>
            Aucun compte n'est associé à l'adresse <strong className="text-amber-400">{modalState.email}</strong>.
            <br />
            Voulez-vous en créer un ?
          </span>
        }
        actions={[
          { label: "Oui, créer un compte", onClick: handleSignUp, variant: "default" },
          { label: "Non, je me suis trompé", onClick: () => setModalState({ isOpen: false, email: '' }), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default Login;