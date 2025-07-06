import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const IncompleteProfile = () => {
  const { signOut, reloadProfile } = useAuth();

  const handleRetry = async () => {
    await reloadProfile();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700 text-white">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle className="text-white">Profil Incomplet</CardTitle>
          <CardDescription className="text-gray-400">
            Il semble que votre profil n'ait pas été correctement initialisé lors de votre inscription.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-400 text-center">
            Ceci peut arriver si la création automatique du profil a échoué. 
            Vous pouvez essayer de recharger ou vous déconnecter pour recommencer.
          </p>
          <div className="space-y-2">
            <Button onClick={handleRetry} className="w-full bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
            <Button onClick={signOut} variant="destructive" className="w-full">
              Se déconnecter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncompleteProfile;