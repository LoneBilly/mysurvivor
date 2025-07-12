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
import { useGame } from '@/contexts/GameContext';

interface OptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OptionsModal = ({ isOpen, onClose }: OptionsModalProps) => {
  const { user, role, signOut } = useAuth();
  const { playerData, refreshPlayerData } = useGame();
  const navigate = useNavigate();
  
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setNewUsername('');
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!user || !newUsername.trim()) return;
    
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
      setNewUsername('');
      refreshPlayerData();
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
      <DialogContent 
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-sonner-toast]')) {
            e.preventDefault();
          }
        }}
        className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6"
      >
        <DialogHeader className="text-center mb-4">
          <Settings className="w-8 h-8 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Options</DialogTitle>
          <DialogDescription className="text-gray-300 mt-1">
            Gérez les paramètres de votre compte et du jeu.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="space-y-4">
            <h4 className="font-medium text-white font-mono">Changer de pseudo</h4>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-300 font-mono">Nouveau pseudo</Label>
              <Input
                id="username"
                placeholder={playerData.playerState.username || "Votre pseudo actuel"}
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="bg-white/5 border border-white/20 rounded-lg focus:ring-white/30 focus:border-white/30"
                disabled={loading}
              />
            </div>
            <Button onClick={handleSave} disabled={loading || !newUsername.trim()} className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold transition-all hover:bg-white/20">
              {loading ? 'Sauvegarde...' : 'Sauvegarder le pseudo'}
            </Button>
          </div>
          <Separator className="bg-white/20 h-px" />
          <div className="space-y-4">
            <h4 className="font-medium text-white font-mono">Compte</h4>
            {role === 'admin' && (
              <>
                <Button onClick={handleGoToAdmin} className="w-full rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold transition-all hover:bg-white/20">
                  Panel d'Administration
                </Button>
                <Separator className="bg-white/20 h-px" />
              </>
            )}
            <Button onClick={handleLogout} disabled={loading} className="w-full rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 font-bold transition-all">
              Déconnexion
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OptionsModal;