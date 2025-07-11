import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showSuccess, showError } from '@/utils/toast';
import { Loader2, PlusCircle, Trash2, Edit, MapPin } from 'lucide-react';
import { MapCell, Item } from '@/types/admin';
import ActionModal from '../ActionModal';

interface ZoneItem {
  id: number;
  zone_id: number;
  item_id: number;
  spawn_chance: number;
  max_quantity: number;
  items: {
    name: string;
    type: string;
  };
}

const ZoneItemEditor = () => {
  const [zones, setZones] = useState<MapCell[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [zoneItems, setZoneItems] = useState<ZoneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemTypes, setItemTypes] = useState<string[]>(['Tous']);
  const [selectedType, setSelectedType] = useState('Tous');
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit' | 'delete';
    data: Partial<ZoneItem> & { zone_id?: number } | null;
  }>({ isOpen: false, mode: 'add', data: null });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [zonesRes, itemsRes, zoneItemsRes] = await Promise.all([
        supabase.from('map_layout').select('*').order('type').order('x').order('y'),
        supabase.from('items').select('*').order('name'),
        supabase.from('zone_items').select('*, items(name, type)')
      ]);

      if (zonesRes.error || itemsRes.error || zoneItemsRes.error) {
        showError("Erreur lors du chargement des données.");
      } else {
        setZones(zonesRes.data || []);
        setItems(itemsRes.data || []);
        setZoneItems(zoneItemsRes.data as ZoneItem[] || []);
        const types = ['Tous', ...new Set(itemsRes.data?.map(i => i.type) || [])];
        setItemTypes(types as string[]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!modalState.data) return;
    const { id, zone_id, item_id, spawn_chance, max_quantity } = modalState.data;

    if (!item_id || !spawn_chance || !max_quantity) {
      showError("Veuillez remplir tous les champs.");
      return;
    }

    const payload = { zone_id, item_id, spawn_chance, max_quantity };
    const { error } = modalState.mode === 'add'
      ? await supabase.from('zone_items').insert(payload)
      : await supabase.from('zone_items').update(payload).eq('id', id!);

    if (error) {
      showError(`Erreur: ${error.message}`);
    } else {
      showSuccess(`Objet ${modalState.mode === 'add' ? 'ajouté' : 'mis à jour'} avec succès.`);
      const { data } = await supabase.from('zone_items').select('*, items(name, type)');
      setZoneItems(data as ZoneItem[] || []);
      setModalState({ isOpen: false, mode: 'add', data: null });
    }
  };

  const handleDelete = async () => {
    if (!modalState.data?.id) return;
    const { error } = await supabase.from('zone_items').delete().eq('id', modalState.data.id);
    if (error) {
      showError(`Erreur: ${error.message}`);
    } else {
      showSuccess("Objet supprimé de la zone.");
      setZoneItems(zoneItems.filter(zi => zi.id !== modalState.data!.id));
      setModalState({ isOpen: false, mode: 'add', data: null });
    }
  };

  const openModal = (mode: 'add' | 'edit' | 'delete', data: Partial<ZoneItem> & { zone_id?: number } | null) => {
    setModalState({ isOpen: true, mode, data });
  };

  const renderModal = () => {
    if (!modalState.isOpen) return null;

    if (modalState.mode === 'delete') {
      const itemToDelete = zoneItems.find(zi => zi.id === modalState.data?.id);
      return (
        <ActionModal
          isOpen={true}
          onClose={() => setModalState({ isOpen: false, mode: 'add', data: null })}
          title="Confirmer la suppression"
          description={`Voulez-vous vraiment supprimer "${itemToDelete?.items.name}" de cette zone ?`}
          actions={[
            { label: "Confirmer", onClick: handleDelete, variant: "destructive" },
            { label: "Annuler", onClick: () => setModalState({ isOpen: false, mode: 'add', data: null }), variant: "secondary" },
          ]}
        />
      );
    }

    return (
      <Dialog open={modalState.isOpen} onOpenChange={() => setModalState({ isOpen: false, mode: 'add', data: null })}>
        <DialogContent className="bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader>
            <DialogTitle>{modalState.mode === 'add' ? 'Ajouter un objet' : 'Modifier un objet'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Objet</Label>
              <Select
                value={modalState.data?.item_id?.toString()}
                onValueChange={(value) => setModalState(s => ({ ...s, data: { ...s.data, item_id: Number(value) } }))}
              >
                <SelectTrigger className="bg-white/5 border-white/20"><SelectValue placeholder="Choisir un objet..." /></SelectTrigger>
                <SelectContent>
                  {items.map(item => <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chance d'apparition (%)</Label>
              <Input type="number" value={modalState.data?.spawn_chance || ''} onChange={(e) => setModalState(s => ({ ...s, data: { ...s.data, spawn_chance: Number(e.target.value) } }))} className="bg-white/5 border-white/20" />
            </div>
            <div>
              <Label>Quantité max</Label>
              <Input type="number" value={modalState.data?.max_quantity || ''} onChange={(e) => setModalState(s => ({ ...s, data: { ...s.data, max_quantity: Number(e.target.value) } }))} className="bg-white/5 border-white/20" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <Card className="w-full max-w-6xl mx-auto bg-gray-800/50 border-gray-700 text-white flex flex-col h-full">
      <CardHeader className="flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <CardTitle className="text-2xl font-mono">Éditeur d'objets par Zone</CardTitle>
          <div className="w-full sm:w-auto">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-gray-900/50 border-gray-600">
                <SelectValue placeholder="Filtrer par type..." />
              </SelectTrigger>
              <SelectContent>
                {itemTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto p-4 space-y-4">
        {zones.map(zone => {
          const itemsInZone = zoneItems.filter(zi =>
            zi.zone_id === zone.id && (selectedType === 'Tous' || zi.items.type === selectedType)
          );

          if (selectedType !== 'Tous' && itemsInZone.length === 0) return null;

          return (
            <Card key={zone.id} className="bg-black/20 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-cyan-400" />
                  <CardTitle className="text-lg">{zone.type} ({zone.x}, {zone.y})</CardTitle>
                </div>
                <Button size="sm" onClick={() => openModal('add', { zone_id: zone.id, spawn_chance: 10, max_quantity: 1 })}>
                  <PlusCircle className="w-4 h-4 mr-2" /> Ajouter
                </Button>
              </CardHeader>
              <CardContent>
                {itemsInZone.length > 0 ? (
                  <div className="divide-y divide-gray-700">
                    {itemsInZone.map(zi => (
                      <div key={zi.id} className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-semibold">{zi.items.name}</p>
                          <p className="text-sm text-gray-400">
                            Chance: {zi.spawn_chance}% | Max: {zi.max_quantity} | Type: {zi.items.type}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openModal('edit', zi)}><Edit className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="hover:text-red-500" onClick={() => openModal('delete', zi)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Aucun objet de type "{selectedType}" dans cette zone.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
      {renderModal()}
    </Card>
  );
};

export default ZoneItemEditor;