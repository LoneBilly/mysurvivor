import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

interface OptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OptionsModal = ({ isOpen, onClose }: OptionsModalProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewUsername('');
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!user || !newUsername.trim()) {
      return;
    }
    
    setLoading(true);
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ username: newUsername.trim() })
      .eq('id', user.id);

    if (profileError) {
      showError(profileError.message);
      setLoading(false);
    } else {
      // Déclenche la mise à jour du classement
      const { error: gameStateError } = await supabase
        .from('game_states')
        .update({ updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (gameStateError) {
        console.error("Erreur lors du déclenchement de la mise à jour du classement:", gameStateError);
      }

      showSuccess('Pseudo mis à jour !');
      await refreshProfile();
      setLoading(false);
      onClose();
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess('Déconnexion réussie.');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Options</DialogTitle>
          <DialogDescription>
            Gérez les paramètres de votre compte et du jeu.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-200">Changer de pseudo</h4>
            <div className="space-y-2">
              <Label htmlFor="username">Nouveau pseudo</Label>
              <Input
                id="username"
                placeholder={profile?.username || "Votre pseudo actuel"}
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                disabled={loading}
              />
            </div>
            <Button onClick={handleSave} disabled={loading || !newUsername.trim()} className="w-full">
              {loading ? 'Sauvegarde...' : 'Sauvegarder le pseudo'}
            </Button>
          </div>
          <Separator className="bg-gray-700" />
          <div className="space-y-4">
            <h4 className="font-medium text-gray-200">Compte</h4>
            <Button onClick={handleLogout} variant="destructive" disabled={loading} className="w-full">
              Déconnexion
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OptionsModal;