import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { PlayerProfile } from './PlayerManager';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

interface AdminStatEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
  onPlayerUpdate: (player: PlayerProfile) => void;
}

const AdminStatEditorModal = ({ isOpen, onClose, player, onPlayerUpdate }: AdminStatEditorModalProps) => {
  const [stats, setStats] = useState({
    vie: 100,
    faim: 100,
    soif: 100,
    energie: 100,
    credits: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPlayerStats = async () => {
      if (isOpen && player) {
        setLoading(true);
        const { data, error } = await supabase
          .from('player_states')
          .select('vie, faim, soif, energie, credits')
          .eq('id', player.id)
          .single();
        
        if (error) {
          showError("Impossible de charger les stats du joueur.");
          console.error(error);
        } else if (data) {
          setStats(data);
        }
        setLoading(false);
      }
    };
    fetchPlayerStats();
  }, [isOpen, player]);

  const handleStatChange = (stat: keyof typeof stats, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) || value === '') {
      setStats(prev => ({ ...prev, [stat]: isNaN(numValue) ? 0 : numValue }));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('player_states')
      .update(stats)
      .eq('id', player.id);
    
    if (error) {
      showError("Erreur lors de la mise à jour des stats.");
      console.error(error);
    } else {
      showSuccess("Statistiques du joueur mises à jour.");
      onPlayerUpdate({ ...player, credits: stats.credits });
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle>Modifier les stats de {player.username || 'Joueur'}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <div className="py-4 grid grid-cols-2 gap-4">
            {Object.keys(stats).map((statKey) => (
              <div key={statKey}>
                <Label htmlFor={statKey} className="capitalize font-mono">{statKey}</Label>
                <Input
                  id={statKey}
                  type="number"
                  value={stats[statKey as keyof typeof stats]}
                  onChange={(e) => handleStatChange(statKey as keyof typeof stats, e.target.value)}
                  className="mt-1 bg-white/5 border-white/20"
                />
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sauvegarder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminStatEditorModal;