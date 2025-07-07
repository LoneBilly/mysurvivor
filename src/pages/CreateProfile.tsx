import { useState, FormEvent, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from '@/components/AuthProvider';

const CreateProfile = () => {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      const suggestedUsername = user.email?.split('@')[0] || '';
      setUsername(suggestedUsername);
    }
  }, [user]);

  const handleCreateProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Erreur",
        description: "Utilisateur non authentifié.",
        variant: "destructive",
      });
      return;
    }
    if (username.length < 3) {
      toast({
        title: "Pseudonyme trop court",
        description: "Votre pseudonyme doit contenir au moins 3 caractères.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ username: username })
      .eq('id', user.id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Ce pseudonyme est peut-être déjà pris. Veuillez en choisir un autre.",
        variant: "destructive",
      });
      console.error('Error updating profile:', error);
    } else {
      toast({
        title: "Profil créé !",
        description: "Votre pseudonyme a été enregistré. Bienvenue !",
      });
      // The AuthProvider will detect the change and redirect to '/'
      // but we can force it for better UX
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Finalisez votre inscription</CardTitle>
          <CardDescription>Choisissez un pseudonyme pour commencer votre aventure.</CardDescription>
        </CardHeader>
        <form onSubmit={handleCreateProfile}>
          <CardContent>
            <Input
              type="text"
              placeholder="Pseudonyme"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Valider le pseudonyme'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CreateProfile;