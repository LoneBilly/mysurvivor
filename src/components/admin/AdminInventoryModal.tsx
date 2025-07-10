import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from '@/integrations/supabase/client';
import { PlayerProfile } from './PlayerManager';
import { InventoryItem } from '@/types/game';
import { Item } from '@/types/admin';
import { Loader2, Trash2, PlusCircle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import ItemIcon from '@/components/ItemIcon';
import ActionModal from '@/components/ActionModal';
import { getCachedSignedUrl } from '@/utils/iconCache';

interface AdminInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
}

const AdminInventoryModal = ({ isOpen, onClose, player }: AdminInventoryModalProps) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [unlockedSlots, setUnlockedSlots] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingQuantity, setEditingQuantity] = useState('');
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  const fetchInventoryAndSlots = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);

    const [inventoryRes, playerStateRes] = await Promise.all([
      supabase.from('inventories').select('*, items(*)').eq('player_id', player.id),
      supabase.from('player_states').select('unlocked_slots').eq('id', player.id).single()
    ]);
    
    if (inventoryRes.error) {
      showError("Erreur de chargement de l'inventaire.");
      setInventory([]);
    } else {
      const inventoryWithUrls = await Promise.all(
        (inventoryRes.data as InventoryItem[]).map(async (invItem) => {
          if (invItem.items && invItem.items.icon && invItem.items.icon.includes('.')) {
            const signedUrl = await getCachedSignedUrl(invItem.items.icon);
            return { ...invItem, items: { ...invItem.items, signedIconUrl: signedUrl || undefined } };
          }
          return invItem;
        })
      );
      setInventory(inventoryWithUrls);
    }

    if (playerStateRes.error) {
      showError("Erreur de chargement des slots du joueur.");
      setUnlockedSlots(0);
    } else if (playerStateRes.data) {
      setUnlockedSlots(playerStateRes.data.unlocked_slots);
    }

    setLoading(false);
  }, [isOpen, player.id]);

  useEffect(() => {
    if (isOpen) {
      fetchInventoryAndSlots();
      const fetchAllItems = async () => {
        const { data } = await supabase.from('items').select('*');
        setAllItems(data || []);
      };
      fetchAllItems();
    }
  }, [isOpen, fetchInventoryAndSlots]);

  const handleItemClick = (item: InventoryItem) => {
    setEditingItem(item);
    setEditingQuantity(String(item.quantity));
  };

  const handleSaveQuantity = async () => {
    if (!editingItem) return;
    const quantity = parseInt(editingQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      showError("Quantité invalide.");
      return;
    }
    const { error } = await supabase.from('inventories').update({ quantity }).eq('id', editingItem.id);
    if (error) {
      showError("Erreur de mise à jour.");
    } else {
      showSuccess("Quantité mise à jour.");
      fetchInventoryAndSlots();
    }
    setEditingItem(null);
  };

  const handleDeleteRequest = () => {
    if (!editingItem) return;
    setDeletingItem(editingItem);
    setEditingItem(null);
  };

  const confirmDeleteItem = async () => {
    if (!deletingItem) return;
    const { error } = await supabase.from('inventories').delete().eq('id', deletingItem.id);
    if (error) {
      showError("Erreur de suppression.");
    } else {
      showSuccess("Objet supprimé.");
      fetchInventoryAndSlots();
    }
    setDeletingItem(null);
  };

  const handleAddItem = async (item: Item) => {
    setIsAddModalOpen(false);

    const { error } = await supabase.rpc('admin_add_item_to_inventory', {
      p_player_id: player.id,
      p_item_id: item.id,
      p_quantity: 1
    });

    if (error) {
      showError(`Erreur lors de l'ajout: ${error.message}`);
    } else {
      showSuccess(`${item.name} ajouté à l'inventaire.`);
      fetchInventoryAndSlots();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
          <DialogHeader className="text-center">
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Inventaire de {player.username}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {inventory.length} / {unlockedSlots} emplacements utilisés
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loading ? (
              <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2 sm:gap-3">
                  {inventory.map(invItem => (
                    <div 
                      key={invItem.id} 
                      className="relative bg-slate-700/50 p-2 rounded-lg border border-slate-600 aspect-square flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-700/80 transition-colors"
                      onClick={() => handleItemClick(invItem)}
                    >
                      <div className="absolute inset-0">
                        <ItemIcon iconName={invItem.items?.signedIconUrl || invItem.items?.icon} alt={invItem.items?.name || ''} />
                      </div>
                      {invItem.quantity > 0 && (
                        <span className="absolute bottom-1 right-1.5 text-sm font-bold" style={{ textShadow: '1px 1px 2px black' }}>x{invItem.quantity}</span>
                      )}
                      <p className="absolute top-1 text-xs font-semibold truncate w-full px-1" style={{ textShadow: '1px 1px 2px black' }}>{invItem.items?.name}</p>
                    </div>
                  ))}
                  <button onClick={() => setIsAddModalOpen(true)} className="border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:bg-slate-700/50 hover:text-white transition-colors aspect-square">
                    <PlusCircle className="w-8 h-8 mb-2" />
                    <span className="text-sm font-bold">Ajouter</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CommandDialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <CommandInput placeholder="Chercher un objet..." />
        <CommandList>
          <CommandEmpty>Aucun objet trouvé.</CommandEmpty>
          <CommandGroup>
            {allItems.map((item) => (
              <CommandItem key={item.id} onSelect={() => handleAddItem(item)} value={item.name}>
                {item.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
            <DialogHeader>
                <DialogTitle>Modifier {editingItem?.items?.name}</DialogTitle>
                <DialogDescription>
                    Ajustez la quantité ou supprimez l'objet de l'inventaire du joueur.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <label htmlFor="quantity" className="text-sm font-medium text-gray-400">Quantité</label>
                <Input
                    id="quantity"
                    type="number"
                    value={editingQuantity}
                    onChange={(e) => setEditingQuantity(e.target.value)}
                    className="mt-2 bg-white/5 border-white/20"
                    min="1"
                />
            </div>
            <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2 pt-4">
                <Button variant="destructive" onClick={handleDeleteRequest}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer l'objet
                </Button>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="secondary" onClick={() => setEditingItem(null)}>Annuler</Button>
                    <Button onClick={handleSaveQuantity}>Sauvegarder</Button>
                </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActionModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        title="Supprimer l'objet"
        description={`Voulez-vous vraiment supprimer "${deletingItem?.items?.name}" de l'inventaire ?`}
        actions={[
            { label: "Confirmer la suppression", onClick: confirmDeleteItem, variant: "destructive" },
            { label: "Annuler", onClick: () => setDeletingItem(null), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default AdminInventoryModal;