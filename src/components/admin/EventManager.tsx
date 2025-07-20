import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Plus, Edit, Trash2, Zap, Search, ArrowLeft, Save } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { MapCell } from '@/types/game';
import { Item } from '@/types/admin';
import * as LucideIcons from "lucide-react";
import { cn } from '@/lib/utils';
import ActionModal from '../ActionModal';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Slider } from '@/components/ui/slider';

interface Event {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  created_at: string;
}

interface ZoneEvent {
  id: number;
  zone_id: number;
  event_id: number;
  spawn_chance: number;
  success_chance: number;
  effects: {
    stats?: Record<string, number>;
    item?: { id: number | null; quantity: number };
  };
  created_at: string;
}

interface EventManagerProps {
  mapLayout: MapCell[];
  events: Event[];
  allItems: Item[];
  onEventsUpdate: () => void;
}

const STAT_OPTIONS = ['vie', 'faim', 'soif', 'energie'];

const getIconComponent = (iconName: string | null) => {
  if (!iconName) return Zap;
  const Icon = (LucideIcons as any)[iconName];
  return Icon && typeof Icon.render === 'function' ? Icon : Zap;
};

const EventEditor = ({
  event,
  isCreating,
  onBack,
  onSave,
  onDelete,
  mapLayout,
  allItems,
}: {
  event: Event | null;
  isCreating: boolean;
  onBack: () => void;
  onSave: (newEvent?: Event) => void;
  onDelete: (eventId: number) => void;
  mapLayout: MapCell[];
  allItems: Item[];
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [zoneEvents, setZoneEvents] = useState<ZoneEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingZoneEvent, setEditingZoneEvent] = useState<Partial<ZoneEvent> | null>(null);
  const isMobile = useIsMobile();

  const resourceZones = mapLayout.filter(zone => zone.interaction_type === 'Ressource');

  const fetchZoneEvents = useCallback(async (eventId: number) => {
    setLoading(true);
    const { data, error } = await supabase.from('zone_events').select('*').eq('event_id', eventId);
    if (error) showError("Impossible de charger les configurations de zones.");
    else setZoneEvents(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (event) {
      setName(event.name);
      setDescription(event.description || '');
      setIcon(event.icon || '');
      fetchZoneEvents(event.id);
    } else {
      setName('');
      setDescription('');
      setIcon('');
      setZoneEvents([]);
    }
    setEditingZoneEvent(null);
  }, [event, fetchZoneEvents]);

  const handleSaveEventDetails = async () => {
    if (!name.trim()) {
      showError("Le nom de l'événement est requis.");
      return;
    }
    const eventData = { name: name.trim(), description: description.trim() || null, icon: icon.trim() || null };
    const promise = event ? supabase.from('events').update(eventData).eq('id', event.id).select().single() : supabase.from('events').insert(eventData).select().single();
    
    const { data, error } = await promise;
    if (error) {
      showError(`Erreur: ${error.message}`);
    } else {
      showSuccess(`Événement ${event ? 'mis à jour' : 'créé'} !`);
      onSave(data as Event);
    }
  };

  const handleSaveZoneEvent = async () => {
    if (!editingZoneEvent || !editingZoneEvent.zone_id || !event) return;
    
    const payload = {
      ...editingZoneEvent,
      event_id: event.id,
      spawn_chance: editingZoneEvent.spawn_chance ?? 10,
      success_chance: editingZoneEvent.success_chance ?? 50,
      effects: {
        stats: editingZoneEvent.effects?.stats || {},
        item: editingZoneEvent.effects?.item?.id ? editingZoneEvent.effects.item : undefined,
      }
    };

    const { error } = await supabase.from('zone_events').upsert(payload, { onConflict: 'zone_id,event_id' });
    if (error) {
      showError("Erreur lors de la sauvegarde de la configuration de zone.");
    } else {
      showSuccess("Configuration de zone sauvegardée !");
      fetchZoneEvents(event.id);
      setEditingZoneEvent(null);
    }
  };

  const handleDeleteZoneEvent = async (zoneEventId: number) => {
    const { error } = await supabase.from('zone_events').delete().eq('id', zoneEventId);
    if (error) showError("Erreur de suppression.");
    else {
      showSuccess("Configuration supprimée.");
      if (event) fetchZoneEvents(event.id);
    }
  };

  const startEditingZoneEvent = (zoneEvent: ZoneEvent) => setEditingZoneEvent({ ...zoneEvent });
  const startAddingZoneEvent = () => setEditingZoneEvent({ zone_id: undefined, spawn_chance: 10, success_chance: 50, effects: { stats: {}, item: { id: null, quantity: 1 } } });

  const IconComponent = getIconComponent(icon);

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar p-1">
      <div className="flex items-center gap-2 mb-4 p-4 flex-shrink-0">
        {isMobile && <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>}
        <h2 className="text-2xl font-bold">{isCreating ? "Nouvel Événement" : "Modifier l'Événement"}</h2>
      </div>

      <div className="space-y-6 px-4 pb-4">
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader><CardTitle>Informations Générales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Nom</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div><Label>Icône</Label><div className="flex items-center gap-2"><IconComponent className="w-6 h-6" /><Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Nom de l'icône Lucide" /></div></div>
          </CardContent>
          <CardFooter><Button onClick={handleSaveEventDetails}><Save className="w-4 h-4 mr-2" />Sauvegarder</Button></CardFooter>
        </Card>

        {!isCreating && event && (
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle>Configuration des Zones</CardTitle>
              <CardDescription>Ajoutez ou modifiez où cet événement peut apparaître.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingZoneEvent ? (
                <div className="p-4 border border-blue-500/50 rounded-lg bg-blue-500/10 space-y-4">
                  <h4 className="font-semibold">{editingZoneEvent.id ? 'Modifier' : 'Ajouter à une'} zone</h4>
                  <div><Label>Zone</Label><select value={editingZoneEvent.zone_id || ''} onChange={(e) => setEditingZoneEvent(prev => ({...prev, zone_id: Number(e.target.value)}))} disabled={!!editingZoneEvent.id} className="w-full p-2 bg-gray-800 border border-gray-600 rounded"><option value="">Sélectionner</option>{resourceZones.map(zone => <option key={zone.id} value={zone.id}>{zone.type} ({zone.x}, {zone.y})</option>)}</select></div>
                  <div><Label>Chance d'apparition ({editingZoneEvent.spawn_chance}%)</Label><Slider value={[editingZoneEvent.spawn_chance || 10]} onValueChange={([val]) => setEditingZoneEvent(prev => ({...prev, spawn_chance: val}))} max={100} step={1} /></div>
                  <div><Label>Chance de succès ({editingZoneEvent.success_chance}%)</Label><Slider value={[editingZoneEvent.success_chance || 50]} onValueChange={([val]) => setEditingZoneEvent(prev => ({...prev, success_chance: val}))} max={100} step={1} /></div>
                  <div><Label>Effets sur les stats</Label><div className="grid grid-cols-2 gap-2">{STAT_OPTIONS.map(stat => <div key={stat}><Label className="text-xs capitalize">{stat}</Label><Input type="number" value={editingZoneEvent.effects?.stats?.[stat] || ''} onChange={(e) => setEditingZoneEvent(prev => ({...prev, effects: {...prev?.effects, stats: {...prev?.effects?.stats, [stat]: Number(e.target.value) || 0}} }))} className="bg-gray-800 border-gray-600" placeholder="0" /></div>)}</div></div>
                  <div><Label>Récompense d'objet</Label><div className="grid grid-cols-2 gap-2"><select value={editingZoneEvent.effects?.item?.id || ''} onChange={(e) => setEditingZoneEvent(prev => ({...prev, effects: {...prev?.effects, item: {...prev?.effects?.item, id: Number(e.target.value) || null}}}))} className="w-full p-2 bg-gray-800 border border-gray-600 rounded"><option value="">Aucun</option>{allItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Input type="number" min="1" value={editingZoneEvent.effects?.item?.quantity || 1} onChange={(e) => setEditingZoneEvent(prev => ({...prev, effects: {...prev?.effects, item: {...prev?.effects?.item, quantity: Number(e.target.value) || 1}}}))} className="bg-gray-800 border-gray-600" /></div></div>
                  <div className="flex gap-2"><Button onClick={handleSaveZoneEvent}>Sauvegarder</Button><Button variant="ghost" onClick={() => setEditingZoneEvent(null)}>Annuler</Button></div>
                </div>
              ) : (
                <Button variant="outline" onClick={startAddingZoneEvent} className="w-full"><Plus className="w-4 h-4 mr-2" />Ajouter à une zone</Button>
              )}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {zoneEvents.map(ze => { const zone = resourceZones.find(z => z.id === ze.zone_id); return (<div key={ze.id} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg"><div className="flex-grow"><p className="font-semibold">{zone?.type}</p><p className="text-sm text-gray-400">Apparition: {ze.spawn_chance}% | Succès: {ze.success_chance}%</p></div><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => startEditingZoneEvent(ze)}><Edit className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={() => handleDeleteZoneEvent(ze.id)}><Trash2 className="w-4 h-4" /></Button></div></div>); })}
              </div>
            </CardContent>
          </Card>
        )}

        {event && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader><CardTitle>Zone de Danger</CardTitle></CardHeader>
            <CardContent><Button variant="destructive" onClick={() => onDelete(event.id)}>Supprimer l'événement</Button></CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const EventManager = ({ mapLayout, events, allItems, onEventsUpdate }: EventManagerProps) => {
  const isMobile = useIsMobile();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; event: Event | null }>({ isOpen: false, event: null });

  const filteredEvents = events.filter(event => event.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsCreating(false);
  };

  const handleCreateNew = () => {
    setSelectedEvent(null);
    setIsCreating(true);
  };

  const handleBack = () => {
    setSelectedEvent(null);
    setIsCreating(false);
  };

  const handleSave = (newEvent?: Event) => {
    onEventsUpdate();
    if (newEvent) {
      setSelectedEvent(newEvent);
      setIsCreating(false);
    } else {
      handleBack();
    }
  };

  const handleDelete = (eventId: number) => {
    const eventToDelete = events.find(e => e.id === eventId);
    if (eventToDelete) setDeleteModal({ isOpen: true, event: eventToDelete });
  };

  const confirmDelete = async () => {
    if (!deleteModal.event) return;
    const { error } = await supabase.from('events').delete().eq('id', deleteModal.event.id);
    if (error) showError("Erreur lors de la suppression.");
    else {
      showSuccess("Événement supprimé !");
      onEventsUpdate();
      handleBack();
    }
    setDeleteModal({ isOpen: false, event: null });
  };

  const EventList = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700 flex-shrink-0 flex justify-between items-center">
        <h3 className="text-lg font-bold">Événements</h3>
        <Button size="sm" onClick={handleCreateNew}><PlusCircle className="w-4 h-4 mr-2" />Créer</Button>
      </div>
      <div className="flex-grow overflow-y-auto no-scrollbar">
        {filteredEvents.map(event => {
          const IconComponent = getIconComponent(event.icon);
          return (
            <div key={event.id} onClick={() => handleSelectEvent(event)} className={cn("cursor-pointer p-3 flex items-center gap-3 border-b border-l-4 border-gray-700", selectedEvent?.id === event.id ? "bg-blue-500/10 border-l-blue-500" : "border-l-transparent hover:bg-gray-800/50")}>
              <IconComponent className="w-5 h-5 flex-shrink-0 text-gray-300" />
              <p className="font-semibold truncate">{event.name}</p>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="h-full bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        {selectedEvent || isCreating ? (
          <EventEditor event={selectedEvent} isCreating={isCreating} onBack={handleBack} onSave={handleSave} onDelete={handleDelete} mapLayout={mapLayout} allItems={allItems} />
        ) : (
          EventList
        )}
        <ActionModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, event: null })} title="Supprimer l'événement" description={`Êtes-vous sûr de vouloir supprimer "${deleteModal.event?.name}" ?`} actions={[{ label: "Supprimer", onClick: confirmDelete, variant: "destructive" }, { label: "Annuler", onClick: () => setDeleteModal({ isOpen: false, event: null }), variant: "secondary" }]} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
      <Card className="md:col-span-1 h-full flex flex-col bg-gray-800/50 border-gray-700">
        {EventList}
      </Card>
      <div className="md:col-span-2 h-full">
        {selectedEvent || isCreating ? (
          <EventEditor event={selectedEvent} isCreating={isCreating} onBack={handleBack} onSave={handleSave} onDelete={handleDelete} mapLayout={mapLayout} allItems={allItems} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 rounded-lg bg-gray-800/50 border border-gray-700">
            <p>Sélectionnez un événement pour le modifier ou créez-en un nouveau.</p>
          </div>
        )}
      </div>
      <ActionModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, event: null })} title="Supprimer l'événement" description={`Êtes-vous sûr de vouloir supprimer "${deleteModal.event?.name}" ?`} actions={[{ label: "Supprimer", onClick: confirmDelete, variant: "destructive" }, { label: "Annuler", onClick: () => setDeleteModal({ isOpen: false, event: null }), variant: "secondary" }]} />
    </div>
  );
};

export default EventManager;