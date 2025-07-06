import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

const CreateUsername = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();

    if (!user || !trimmedUsername) {
      showError("Le pseudo ne peut pas être vide.");
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,15}$/;
    if (!usernameRegex.test(trimmedUsername)) {
      showError("Le pseudo doit contenir 3 à 15 caractères (lettres, chiffres, _).");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: trimmedUsername })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Erreur de violation de contrainte unique
          showError("Ce pseudo est déjà pris. Veuillez en choisir un autre.");
        } else {
          throw error;
        }
      } else {
        await refreshProfile();
        showSuccess("Bienvenue dans le jeu !");
        navigate('/');
      }

    } catch (error: any) {
      console.error("Erreur détaillée lors de la soumission du pseudo:", error);
      showError(error.message || "Une erreur réseau ou inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-gray-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Presque prêt !</CardTitle>
          <CardDescription>Choisissez votre pseudo pour commencer à jouer.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Pseudo de survivant</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Votre nom dans le jeu..."
                required
                className="text-base"
                pattern="^[a-zA-Z0-9_]{3,15}$"
                title="3 à 15 caractères (lettres, chiffres, _)."
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !username.trim()}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  Entrer dans le jeu
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateUsername;