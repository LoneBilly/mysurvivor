import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

const SetUsername = () => {
  const { user, refreshData } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !username.trim()) return;
    
    const trimmedUsername = username.trim();
    
    if (trimmedUsername.length < 3) {
      showError('Le pseudo doit faire au moins 3 caractères.');
      return;
    }
    
    if (trimmedUsername.length > 20) {
      showError('Le pseudo ne doit pas dépasser 20 caractères.');
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      showError('Le pseudo ne peut contenir que des lettres, des chiffres et des underscores.');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('player_states')
        .update({ 
          username: trimmedUsername,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating username:', error);
        if (error.code === '23505') {
          showError('Ce pseudo est déjà pris. Veuillez en choisir un autre.');
        } else {
          showError('Erreur lors de la sauvegarde. Veuillez réessayer.');
        }
        return;
      }

      showSuccess('Pseudo enregistré ! Bienvenue dans le jeu !');
      
      setTimeout(async () => {
        await refreshData();
      }, 500);
      
    } catch (error) {
      console.error('Erreur inattendue:', error);
      showError('Une erreur inattendue s\'est produite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700 text-white">
        <CardHeader>
          <CardTitle className="text-white">Choisissez votre pseudo</CardTitle>
          <CardDescription className="text-gray-400">
            Entrez un pseudo pour commencer votre aventure de survie.
          </Description>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-gray-300">
                Pseudo
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Votre pseudo de survivant"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white focus:ring-blue-500"
                disabled={loading}
                maxLength={20}
              />
              <p className="text-xs text-gray-500">
                3-20 caractères, lettres, chiffres et underscores uniquement
              </p>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              disabled={loading || !username.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Commencer à jouer'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetUsername;