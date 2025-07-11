import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { PlayerProfile } from './PlayerManager';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2, Package, Trash2, Edit, PlusCircle } from 'lucide-react';
import { getCachedSignedUrl } from '@/utils/iconCache';
import { Item } from '@/types/admin';
import ActionModal from '../ActionModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface InventoryItem {
  id: number;
  quantity: number;
  slot_position: number;
  items: {
    name: string;
    icon: string | null;
    stackable: boolean;
  };
}

interface AdminInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile;
}

const AdminInventoryModal = ({ isOpen, onClose, player }: AdminInventoryModalProps) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [newItemId, setNewItemId] = useState<string>('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');

  const fetchInventory = async () => {
    if (!player) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('inventories')
      .select('id, quantity, slot_position, items(name, icon, stackable)')
      .eq('player_id', player.id)
      .order('slot_position', { ascending: true });

    if (error) {
      showError("Erreur lors du chargement de l'inventaire.");
    } else {
      const inventoryWithUrls = await Promise.all(
        (data as any[]).map(async (item) => {
          let iconUrl = null;
          if (item.items.icon) {
            iconUrl = await getCachedSignedUrl(item.items.icon);
          }
          return { ...item, items: { ...item.items, icon: iconUrl } };
        })
      );
      setInventory(inventoryWithUrls);
    }
    setLoading(false);
  };

  const fetchAllItems = async () => {
    const { data, error } = await supabase.from('items').select('*').order('name');
    if (error) {
      showError("Erreur lors du chargement de la liste d'objets.");
    } else {
      setAllItems(data);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
      fetchAllItems();
    }
  }, [isOpen, player]);

  const handleSaveQuantity = async () => {
    if (!editingItem) return;
    const quantity = parseInt(editQuantity, 10);
    if (isNaN(quantity) || quantity < 0) {
      showError("Quantité invalide.");
      return;
    }

    const { error } = await supabase
      .from('inventories')
      .update({ quantity })
      .eq('id', editingItem.id);

    if (error) {
      showError("Erreur lors de la mise à jour.");
    } else {
      showSuccess("Quantité mise à jour.");
      setEditingItem(null);
      fetchInventory();
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    const { error } = await supabase.from('inventories').delete().eq('id', itemToDelete.id);
    if (error) {
      showError("Erreur lors de la suppression.");
    } else {
      showSuccess("Objet supprimé de l'inventaire.");
      setItemToDelete(null);
      fetchInventory();
    }
  };

  const handleAddItem = async () => {
    if (!newItemId || !newItemQuantity) {
      showError("Veuillez sélectionner un objet et une quantité.");
      return;
    }
    const quantity = parseInt(newItemQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      showError("Quantité invalide.");
      return;
    }

    const { error } = await supabase.rpc('admin_add_item_to_inventory', {
      p_player_id: player.id,
      p_item_id: parseInt(newItemId, 10),
      p_quantity: quantity,
    });

    if (error) {
      showError(`Erreur: ${error.message}`);
    } else {
      showSuccess("Objet ajouté avec succès.");
      setIsAddingItem(false);
      setNewItemId('');
      setNewItemQuantity('1');
      fetchInventory();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6 flex flex-col max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl text-center">
              Inventaire de {player.username || 'Joueur Anonyme'}
            </DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="mt-4 flex-grow overflow-y-auto space-y-2 pr-2">
              {inventory.length > 0 ? (
                inventory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {item.items.icon ? (
                        <img src={item.items.icon} alt={item.items.name} className="w-10 h-10 object-contain rounded-md bg-black/20 p-1 flex-shrink-0" />
                      ) : (
                        <Package className="w-10 h-10 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{item.items.name}</p>
                        <p className="text-sm text-gray-400">Quantité: {item.quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditingItem(item); setEditQuantity(String(item.quantity)); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="hover:bg-red-500/20 hover:text-red-500" onClick={() => setItemToDelete(item)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 py-10">
                  L'inventaire est vide.
                </div>
              )}
            </div>
          )}
          <DialogFooter className="mt-4 pt-4 border-t border-slate-700">
            <Button onClick={() => setIsAddingItem(true)} className="w-full sm:w-auto">
              <PlusCircle className="w-4 h-4 mr-2" />
              Ajouter un objet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle>Modifier la quantité de {editingItem.items.name}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                id="quantity"
                type="number"
                inputMode="numeric"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                className="mt-1 bg-white/5 border-white/20"
              />
            </div>
            <DialogFooter>
              <div className="flex w-full justify-end">
                <Button onClick={handleSaveQuantity}>Sauvegarder</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ActionModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Confirmer la suppression"
        description={`Êtes-vous sûr de vouloir supprimer ${itemToDelete?.items.name} de l'inventaire de ce joueur ?`}
        actions={[
          { label: "Confirmer", onClick: handleDeleteItem, variant: "destructive" },
          { label: "Annuler", onClick: () => setItemToDelete(null), variant: "secondary" },
        ]}
      />

      <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
        <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle>Ajouter un objet à l'inventaire</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Objet</Label>
              <Select value={newItemId} onValueChange={setNewItemId}>
                <SelectTrigger className="bg-white/5 border-white/20">
                  <SelectValue placeholder="Sélectionner un objet..." />
                </SelectTrigger>
                <SelectContent>
                  {allItems.map(item => (
                    <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="new-quantity">Quantité</Label>
              <Input
                id="new-quantity"
                type="number"
                inputMode="numeric"
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(e.target.value)}
                className="mt-1 bg-white/5 border-white/20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddItem}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminInventoryModal;