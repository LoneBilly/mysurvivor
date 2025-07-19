import { useState, useEffect, FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Item } from '@/types/admin';
import { Loader2 } from 'lucide-react';

interface Auction {
  id: number;
  ends_at: string;
  item_id: number;
  item_quantity: number;
  status: 'active' | 'completed' | 'cancelled';
  description: string | null;
}

interface AuctionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  auction: Auction | null;
  onSave: () => void;
  allItems: Item[];
}

const AuctionFormModal = ({ isOpen, onClose, auction, onSave, allItems }: AuctionFormModalProps) => {
  const [itemId, setItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [durationHours, setDurationHours] = useState<string>('24');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auction) {
      setItemId(String(auction.item_id));
      setQuantity(String(auction.item_quantity));
      setDescription(auction.description || '');
      const ends = new Date(auction.ends_at).getTime();
      const now = Date.now();
      const hours = Math.max(0, Math.ceil((ends - now) / (1000 * 60 * 60)));
      setDurationHours(String(hours));
    } else {
      setItemId('');
      setQuantity('1');
      setDurationHours('24');
      setDescription('');
    }
  }, [auction, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const ends_at = new Date(Date.now() + parseInt(durationHours, 10) * 60 * 60 * 1000).toISOString();
    
    const payload = {
      item_id: parseInt(itemId, 10),
      item_quantity: parseInt(quantity, 10),
      description: description,
      ends_at: ends_at,
      status: 'active' as const,
    };

    const promise = auction
      ? supabase.from('auctions').update(payload).eq('id', auction.id)
      : supabase.from('auctions').insert(payload);

    const { error } = await promise;

    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Enchère ${auction ? 'mise à jour' : 'créée'} !`);
      onSave();
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader>
          <DialogTitle>{auction ? 'Modifier' : 'Créer'} une enchère</DialogTitle>
          <DialogDescription>Configurez les détails de l'enchère.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div>
            <Label>Objet</Label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              required
              className="w-full bg-white/5 border-white/20 px-3 h-10 rounded-lg"
            >
              <option value="" disabled>Sélectionner un objet...</option>
              {allItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantité</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="bg-white/5 border-white/20" />
            </div>
            <div>
              <Label>Durée (heures)</Label>
              <Input type="number" min="1" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} required className="bg-white/5 border-white/20" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sauvegarder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuctionFormModal;