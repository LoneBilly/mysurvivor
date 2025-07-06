import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const IncompleteProfile = () => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">Profil Incomplet</h1>
      <p className="text-gray-400 mb-8 max-w-md">
        Il semble que votre profil n'ait pas été finalisé lors de votre inscription.
        Ceci est une situation inattendue. Veuillez vous déconnecter et réessayer, ou contacter le support si le problème persiste.
      </p>
      <Button onClick={signOut} variant="destructive">
        Se déconnecter
      </Button>
    </div>
  );
};

export default IncompleteProfile;