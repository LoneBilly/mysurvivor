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
import { useNavigate } from 'react-router-dom';

interface OptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OptionsModal = ({ isOpen, onClose }: OptionsModalProps) => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
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
      setCurrentUsername(newUsername.trim());
      setNewUsername('');
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

  const handleGoToAdmin = () => {
    navigate('/admin');
    onClose();
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
                placeholder={currentUsername || "Votre pseudo actuel"}
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
            {role === 'admin' && (
              <>
                <Button onClick={handleGoToAdmin} variant="secondary" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                  Panel d'Administration
                </Button>
                <Separator className="bg-gray-700" />
              </>
            )}
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