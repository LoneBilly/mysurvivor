import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from '@/integrations/supabase/client';
import { PlayerProfile } from './PlayerManager';
import { InventoryItem } from '@/types/game';
import { Item } from '@/types/admin';
import { Loader2, Trash2, Edit, PlusCircle } from 'lucide-react';
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
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'edit';
    item: InventoryItem | null;
    newQuantity?: string;
  }>({ isOpen: false, type: 'delete', item: null });

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

  const handleItemAction = (item: InventoryItem, type: 'delete' | 'edit') => {
    setActionModal({ isOpen: true, type, item, newQuantity: String(item.quantity) });
  };

  const confirmDeleteItem = async () => {
    if (!actionModal.item) return;
    const { error } = await supabase.from('inventories').delete().eq('id', actionModal.item.id);
    if (error) {
      showError("Erreur de suppression.");
    } else {
      showSuccess("Objet supprimé.");
      fetchInventoryAndSlots();
    }
    setActionModal({ isOpen: false, type: 'delete', item: null });
  };

  const confirmEditQuantity = async () => {
    if (!actionModal.item || !actionModal.newQuantity) return;
    const quantity = parseInt(actionModal.newQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      showError("Quantité invalide.");
      return;
    }
    const { error } = await supabase.from('inventories').update({ quantity }).eq('id', actionModal.item.id);
    if (error) {
      showError("Erreur de mise à jour.");
    } else {
      showSuccess("Quantité mise à jour.");
      fetchInventoryAndSlots();
    }
    setActionModal({ isOpen: false, type: 'edit', item: null });
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
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {inventory.map(invItem => (
                    <div key={invItem.id} className="relative group bg-slate-700/50 p-2 rounded-lg border border-slate-600 w-24 h-24 flex flex-col items-center justify-center text-center">
                      <div className="absolute inset-0">
                        <ItemIcon iconName={invItem.items?.signedIconUrl || invItem.items?.icon} alt={invItem.items?.name || ''} />
                      </div>
                      {invItem.quantity > 0 && (
                        <span className="absolute bottom-1 right-1.5 text-sm font-bold" style={{ textShadow: '1px 1px 2px black' }}>x{invItem.quantity}</span>
                      )}
                      <p className="absolute top-1 text-xs font-semibold truncate w-full px-1" style={{ textShadow: '1px 1px 2px black' }}>{invItem.items?.name}</p>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="icon" variant="destructive" onClick={() => handleItemAction(invItem, 'delete')}><Trash2 className="w-4 h-4" /></Button>
                        <Button size="icon" onClick={() => handleItemAction(invItem, 'edit')}><Edit className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setIsAddModalOpen(true)} className="border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:bg-slate-700/50 hover:text-white transition-colors w-24 h-24">
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

      <ActionModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ ...actionModal, isOpen: false })}
        title={actionModal.type === 'delete' ? "Supprimer l'objet" : "Modifier la quantité"}
        description={
          actionModal.type === 'delete' ? `Voulez-vous vraiment supprimer "${actionModal.item?.items?.name}" ?` :
          <Input
            type="number"
            value={actionModal.newQuantity}
            onChange={(e) => setActionModal({ ...actionModal, newQuantity: e.target.value })}
            className="mt-4 bg-white/5 border-white/20"
          />
        }
        actions={[
          { label: "Confirmer", onClick: actionModal.type === 'delete' ? confirmDeleteItem : confirmEditQuantity, variant: "destructive" },
          { label: "Annuler", onClick: () => setActionModal({ ...actionModal, isOpen: false }), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default AdminInventoryModal;