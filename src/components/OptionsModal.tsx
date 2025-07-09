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
import { Settings } from 'lucide-react';

interface OptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OptionsModal = ({ isOpen, onClose }: OptionsModalProps) => {
  const { user, role, signOut } = useAuth();
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
      setNewUsername('');
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
    try {
      await signOut();
      showSuccess('Déconnexion réussie.');
      onClose();
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToAdmin = () => {
    navigate('/admin');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white text-black border-2 border-black shadow-[4px_4px_0px_#000] rounded-none p-6">
        <DialogHeader className="text-center mb-4">
          <Settings className="w-8 h-8 mx-auto text-black mb-2" />
          <DialogTitle className="text-black font-mono tracking-wider uppercase text-xl">Options</DialogTitle>
          <DialogDescription className="text-gray-700 mt-1">
            Gérez les paramètres de votre compte et du jeu.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="space-y-4">
            <h4 className="font-medium text-black font-mono">Changer de pseudo</h4>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-black font-mono">Nouveau pseudo</Label>
              <Input
                id="username"
                placeholder={currentUsername || "Votre pseudo actuel"}
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="bg-white border-2 border-black rounded-none focus:ring-0 focus:border-black"
                disabled={loading}
              />
            </div>
            <Button onClick={handleSave} disabled={loading || !newUsername.trim()} className="w-full rounded-none border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all bg-black text-white hover:bg-gray-800">
              {loading ? 'Sauvegarde...' : 'Sauvegarder le pseudo'}
            </Button>
          </div>
          <Separator className="bg-black h-0.5" />
          <div className="space-y-4">
            <h4 className="font-medium text-black font-mono">Compte</h4>
            {role === 'admin' && (
              <>
                <Button onClick={handleGoToAdmin} className="w-full rounded-none border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all bg-white text-black hover:bg-gray-200">
                  Panel d'Administration
                </Button>
                <Separator className="bg-black h-0.5" />
              </>
            )}
            <Button onClick={handleLogout} disabled={loading} className="w-full rounded-none border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all bg-red-500 text-white hover:bg-red-600">
              Déconnexion
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OptionsModal;