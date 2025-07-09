import { useState, FormEvent, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  const [modalState, setModalState] = useState({ isOpen: false });

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignUp = async () => {
    setModalState({ isOpen: false });
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Compte créé ! Veuillez vérifier vos e-mails pour confirmer votre inscription.");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showError("Veuillez renseigner l'e-mail et le mot de passe.");
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('check-user-exists', {
        body: { email },
      });

      if (error) throw error;

      if (data.exists) {
        // User exists, try to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          // This is likely a wrong password
          showError("Mot de passe incorrect.");
        }
        // On success, AuthProvider will handle redirect
      } else {
        // User does not exist, ask to create account
        setModalState({ isOpen: true });
      }
    } catch (err: any) {
      console.error("Login error:", err);
      showError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-100 text-black flex flex-col items-center justify-center p-4">
        <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-12">
          <div className="w-full max-w-md bg-white border-2 border-black shadow-[8px_8px_0px_#000] rounded-none p-8">
            <div className="text-center mb-8">
              <ShieldAlert className="w-12 h-12 mx-auto text-black mb-4" />
              <h1 className="text-3xl font-bold text-black font-mono tracking-wider uppercase">
                Terminal de Survie
              </h1>
              <p className="text-gray-700 mt-2">Authentification requise pour continuer.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="text-sm font-medium text-black font-mono">Identifiant</label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 bg-white border-2 border-black rounded-none focus:ring-0 focus:border-black"
                  placeholder="votre@email.com"
                />
              </div>
              <div>
                <label htmlFor="password"className="text-sm font-medium text-black font-mono">Mot de passe</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 bg-white border-2 border-black rounded-none focus:ring-0 focus:border-black"
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full rounded-none border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all bg-black text-white hover:bg-gray-800 font-bold" disabled={loading || !email || !password}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Connexion / Inscription'}
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
        onClose={() => setModalState({ isOpen: false })}
        title="Compte non trouvé"
        description="Aucun compte n'est associé à cet e-mail. Voulez-vous en créer un nouveau ?"
        actions={[
          { label: "Créer un compte", onClick: handleSignUp, variant: "default" },
          { label: "Annuler", onClick: () => setModalState({ isOpen: false }), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default Login;