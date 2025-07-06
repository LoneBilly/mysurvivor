import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

interface OptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OptionsModal = ({ isOpen, onClose }: OptionsModalProps) => {
  const { user } = useAuth();
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setCurrentUsername(data.username || '');
        }
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchProfile();
      setNewUsername(''); // Reset input field when modal opens
    }
  }, [user, isOpen]);

  const handleSave = async () => {
    if (!user || !newUsername.trim()) {
      return;
    }
    
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username: newUsername.trim() })
      .eq('id', user.id);
    setLoading(false);

    if (error) {
      showError(error.message);
    } else {
      showSuccess('Pseudo mis à jour !');
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
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Pseudo</Label>
            <Input
              id="username"
              placeholder={currentUsername}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
              disabled={loading}
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button onClick={handleLogout} variant="destructive" disabled={loading}>
            Déconnexion
          </Button>
          <Button onClick={handleSave} disabled={loading || !newUsername.trim()}>
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OptionsModal;