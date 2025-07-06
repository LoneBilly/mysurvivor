import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

interface OptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OptionsModal = ({ isOpen, onClose }: OptionsModalProps) => {
  const { user, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [canChangeUsername, setCanChangeUsername] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setLoading(true);
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, username_changed_at')
          .eq('id', user.id)
          .single();

        if (error) {
          showError("Erreur lors du chargement du profil.");
          console.error(error);
        } else if (data) {
          setUsername(data.username || '');
          setCanChangeUsername(data.username_changed_at === null);
        }
        setLoading(false);
      };
      fetchProfile();
    }
  }, [isOpen, user]);

  const handleSaveUsername = async () => {
    if (!user || !username.trim()) {
      showError("Le pseudo ne peut pas être vide.");
      return;
    }
    setSaving(true);
    try {
      // Mettre à jour la table des profils
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          username: username.trim(),
          username_changed_at: new Date().toISOString() 
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Mettre à jour la table du classement
      const { error: leaderboardError } = await supabase
        .from('leaderboard')
        .update({ username: username.trim() })
        .eq('player_id', user.id);
      
      if (leaderboardError) {
        console.warn("Impossible de mettre à jour le classement immédiatement:", leaderboardError);
      }

      showSuccess("Pseudo mis à jour !");
      setCanChangeUsername(false);
      onClose();
    } catch (error) {
      showError("Erreur lors de la mise à jour du pseudo.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
    showSuccess("Vous avez été déconnecté.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Options</DialogTitle>
          <DialogDescription className="text-gray-400">
            Gérez les paramètres de votre compte.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Pseudo</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!canChangeUsername || saving}
              />
              {!canChangeUsername && (
                <p className="text-xs text-gray-500">
                  Vous ne pouvez changer votre pseudo qu'une seule fois.
                </p>
              )}
            </div>
            <Button onClick={handleSaveUsername} disabled={!canChangeUsername || saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sauvegarder le pseudo"}
            </Button>
          </div>
        )}
        <DialogFooter className="sm:justify-start border-t border-gray-700 pt-4 mt-4">
          <Button onClick={handleSignOut} variant="destructive">
            Se déconnecter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OptionsModal;