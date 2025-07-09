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
      <DialogContent className="sm:max-w-md bg-slate-900/80 backdrop-blur-sm border border-cyan-400/50 rounded-lg shadow-lg shadow-cyan-500/10 text-slate-100 p-6">
        <DialogHeader className="text-center mb-4">
          <Settings className="w-8 h-8 mx-auto text-cyan-400 mb-2" />
          <DialogTitle className="text-cyan-400 font-mono tracking-wider uppercase text-xl">Options</DialogTitle>
          <DialogDescription className="text-slate-400 mt-1">
            Gérez les paramètres de votre compte et du jeu.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="space-y-4">
            <h4 className="font-medium text-slate-200 font-mono">Changer de pseudo</h4>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-400 font-mono">Nouveau pseudo</Label>
              <Input
                id="username"
                placeholder={currentUsername || "Votre pseudo actuel"}
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="bg-slate-800/50 border-slate-700 focus:border-cyan-500 focus:ring-cyan-500"
                disabled={loading}
              />
            </div>
            <Button onClick={handleSave} disabled={loading || !newUsername.trim()} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold">
              {loading ? 'Sauvegarde...' : 'Sauvegarder le pseudo'}
            </Button>
          </div>
          <Separator className="bg-cyan-400/20" />
          <div className="space-y-4">
            <h4 className="font-medium text-slate-200 font-mono">Compte</h4>
            {role === 'admin' && (
              <>
                <Button onClick={handleGoToAdmin} variant="secondary" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  Panel d'Administration
                </Button>
                <Separator className="bg-cyan-400/20" />
              </>
            )}
            <Button onClick={handleLogout} variant="destructive" disabled={loading} className="w-full font-bold">
              Déconnexion
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OptionsModal;