import { useState, FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Item } from '@/types/admin';
import { Loader2 } from 'lucide-react';

interface AuctionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  allItems: Item[];
}

const AuctionFormModal = ({ isOpen, onClose, onSave, allItems }: AuctionFormModalProps) => {
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [description, setDescription] = useState('');
  const [durationHours, setDurationHours] = useState('24');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!itemId || !quantity || !durationHours) {
      showError("Veuillez remplir tous les champs requis.");
      return;
    }

    const ends_at = new Date(Date.now() + parseInt(durationHours, 10) * 60 * 60 * 1000).toISOString();

    setLoading(true);
    const { error } = await supabase.from('auctions').insert({
      item_id: parseInt(itemId, 10),
      item_quantity: parseInt(quantity, 10),
      description,
      ends_at,
      status: 'active',
    });

    if (error) {
      showError(`Erreur: ${error.message}`);
    } else {
      showSuccess("Enchère créée avec succès !");
      onSave();
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle enchère</DialogTitle>
          <DialogDescription>Sélectionnez un objet et définissez les paramètres de l'enchère.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div>
            <Label htmlFor="item">Objet</Label>
            <select
              id="item"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full mt-1 bg-white/5 border-white/20 rounded-lg px-3 h-10"
              required
            >
              <option value="" disabled>Sélectionner un objet...</option>
              {allItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="quantity">Quantité</Label>
            <Input id="quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1 bg-white/5 border-white/20" required />
          </div>
          <div>
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 bg-white/5 border-white/20" />
          </div>
          <div>
            <Label htmlFor="duration">Durée (en heures)</Label>
            <Input id="duration" type="number" min="1" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} className="mt-1 bg-white/5 border-white/20" required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Lancer l'enchère
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuctionFormModal;