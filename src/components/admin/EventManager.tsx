import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Edit, Trash2, Zap, Search, ArrowLeft } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { MapCell } from '@/types/game';
import { Item } from '@/types/admin';
import * as LucideIcons from "lucide-react";
import { cn } from '@/lib/utils';
import ActionModal from '../ActionModal';
import { useIsMobile } from '@/hooks/use-mobile';

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
    item?: { id: number; quantity: number };
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

const EventManager = ({ mapLayout, events, allItems, onEventsUpdate }: EventManagerProps) => {
  const isMobile = useIsMobile();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [zoneEvents, setZoneEvents] = useState<ZoneEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventIcon, setEventIcon] = useState('');
  
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [spawnChance, setSpawnChance] = useState(10);
  const [successChance, setSuccessChance] = useState(50);
  const [effects, setEffects] = useState<Record<string, number>>({});
  const [rewardItem, setRewardItem] = useState<{ id: number | null; quantity: number }>({ id: null, quantity: 1 });
  
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; event: Event | null }>({ isOpen: false, event: null });

  const resourceZones = mapLayout.filter(zone => zone.interaction_type === 'Ressource');

  const fetchZoneEvents = useCallback(async (eventId: number) => {
    setLoading(true);
    const { data, error } = await supabase.from('zone_events').select('*').eq('event_id', eventId);
    if (error) {
      showError("Impossible de charger les configurations de zones.");
    } else {
      setZoneEvents(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchZoneEvents(selectedEvent.id);
    }
  }, [selectedEvent, fetchZoneEvents]);

  const handleCreateOrUpdateEvent = async () => {
    if (!eventName.trim()) {
      showError("Le nom de l'événement est requis.");
      return;
    }
    const eventData = { name: eventName.trim(), description: eventDescription.trim() || null, icon: eventIcon.trim() || null };
    const promise = selectedEvent ? supabase.from('events').update(eventData).eq('id', selectedEvent.id) : supabase.from('events').insert(eventData);
    const { error } = await promise;
    if (error) {
      showError(`Erreur: ${error.message}`);
    } else {
      showSuccess(`Événement ${selectedEvent ? 'mis à jour' : 'créé'} !`);
      onEventsUpdate();
      setIsCreatingEvent(false);
      if (selectedEvent) {
        setSelectedEvent(prev => prev ? { ...prev, ...eventData } : null);
      }
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteModal.event) return;
    const { error } = await supabase.from('events').delete().eq('id', deleteModal.event.id);
    if (error) {
      showError("Erreur lors de la suppression.");
    } else {
      showSuccess("Événement supprimé !");
      onEventsUpdate();
      if (selectedEvent?.id === deleteModal.event.id) setSelectedEvent(null);
    }
    setDeleteModal({ isOpen: false, event: null });
  };

  const handleSaveZoneEvent = async () => {
    if (!selectedEvent || !selectedZoneId) return;
    const effectsPayload: any = { stats: effects };
    if (rewardItem.id && rewardItem.quantity > 0) {
      effectsPayload.item = { id: rewardItem.id, quantity: rewardItem.quantity };
    }
    const { error } = await supabase.from('zone_events').upsert({ zone_id: selectedZoneId, event_id: selectedEvent.id, spawn_chance: spawnChance, success_chance: successChance, effects: effectsPayload }, { onConflict: 'zone_id,event_id' });
    if (error) {
      showError("Erreur lors de la sauvegarde.");
    } else {
      showSuccess("Configuration de zone sauvegardée !");
      fetchZoneEvents(selectedEvent.id);
      setSelectedZoneId(null); setSpawnChance(10); setSuccessChance(50); setEffects({}); setRewardItem({ id: null, quantity: 1 });
    }
  };

  const handleRemoveZoneEvent = async (zoneEventId: number) => {
    const { error } = await supabase.from('zone_events').delete().eq('id', zoneEventId);
    if (error) {
      showError("Erreur lors de la suppression.");
    } else {
      showSuccess("Configuration supprimée !");
      if (selectedEvent) fetchZoneEvents(selectedEvent.id);
    }
  };

  const startEditingEvent = (event: Event) => {
    setSelectedEvent(event);
    setEventName(event.name);
    setEventDescription(event.description || '');
    setEventIcon(event.icon || '');
    setIsCreatingEvent(true);
  };

  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return Zap;
    const Icon = (LucideIcons as any)[iconName];
    return Icon && typeof Icon.render === 'function' ? Icon : Zap;
  };

  const filteredEvents = events.filter(event => event.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const resetForm = () => { setEventName(''); setEventDescription(''); setEventIcon(''); };
  const openCreateForm = () => { setSelectedEvent(null); resetForm(); setIsCreatingEvent(true); };
  const closeDetails = () => { setSelectedEvent(null); setIsCreatingEvent(false); };

  const EventList = (
    <div className="p-4 space-y-2">
      {filteredEvents.map(event => {
        const IconComponent = getIconComponent(event.icon);
        return (
          <Card key={event.id} className={cn("cursor-pointer transition-colors bg-gray-700/50 border-gray-600", selectedEvent?.id === event.id && "border-blue-500 bg-blue-500/10")} onClick={() => setSelectedEvent(event)}>
            <CardContent className="p-3"><div className="flex items-center gap-3"><IconComponent className="w-5 h-5 flex-shrink-0" /><div className="flex-grow min-w-0"><p className="font-semibold truncate">{event.name}</p></div></div></CardContent>
          </Card>
        );
      })}
    </div>
  );

  const EventDetails = (
    <div className="space-y-4">
      {isMobile && <Button variant="ghost" onClick={closeDetails} className="mb-2"><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button>}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader className="flex-row items-center justify-between"><CardTitle className="flex items-center gap-2">{(() => { const Icon = getIconComponent(selectedEvent?.icon); return <Icon className="w-6 h-6" />; })()}{selectedEvent?.name}</CardTitle><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => startEditingEvent(selectedEvent!)}><Edit className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleteModal({ isOpen: true, event: selectedEvent })}><Trash2 className="w-4 h-4" /></Button></div></CardHeader>
        <CardContent><p className="text-gray-300">{selectedEvent?.description || 'Aucune description'}</p></CardContent>
      </Card>
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader><CardTitle>Configuration des zones</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-800/50 rounded-lg">
            <div><Label>Zone</Label><select value={selectedZoneId || ''} onChange={(e) => setSelectedZoneId(Number(e.target.value) || null)} className="w-full p-2 bg-gray-800 border border-gray-600 rounded"><option value="">Sélectionner</option>{resourceZones.map(zone => <option key={zone.id} value={zone.id}>{zone.type} ({zone.x}, {zone.y})</option>)}</select></div>
            <div><Label>Apparition (%)</Label><Input type="number" min="0" max="100" value={spawnChance} onChange={(e) => setSpawnChance(Number(e.target.value))} className="bg-gray-800 border-gray-600" /></div>
            <div><Label>Succès (%)</Label><Input type="number" min="0" max="100" value={successChance} onChange={(e) => setSuccessChance(Number(e.target.value))} className="bg-gray-800 border-gray-600" /></div>
            <div className="flex items-end"><Button onClick={handleSaveZoneEvent} disabled={!selectedZoneId} className="w-full">Ajouter</Button></div>
          </div>
          <div><Label>Effets (si succès)</Label><div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">{STAT_OPTIONS.map(stat => <div key={stat}><Label className="text-xs">{stat}</Label><Input type="number" min="-100" max="100" value={effects[stat] || ''} onChange={(e) => setEffects(prev => ({ ...prev, [stat]: Number(e.target.value) || 0 }))} className="bg-gray-800 border-gray-600" placeholder="0" /></div>)}</div></div>
          <div>
            <Label>Récompense d'objet (si succès)</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <select
                value={rewardItem.id?.toString() || ''}
                onChange={(e) => setRewardItem(prev => ({ ...prev, id: Number(e.target.value) || null }))}
                className="w-full bg-gray-800 border-gray-600 px-3 h-10 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Choisir un objet...</option>
                {allItems.map(item => <option key={item.id} value={item.id.toString()}>{item.name}</option>)}
              </select>
              <div>
                <Label className="text-xs">Quantité</Label>
                <Input type="number" min="1" value={rewardItem.quantity} onChange={(e) => setRewardItem(prev => ({ ...prev, quantity: Number(e.target.value) || 1 }))} className="bg-gray-800 border-gray-600" />
              </div>
            </div>
          </div>
          <div className="space-y-2">{zoneEvents.map(ze => { const zone = resourceZones.find(z => z.id === ze.zone_id); const item = allItems.find(i => i.id === ze.effects.item?.id); return (<div key={ze.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"><div className="flex-grow"><p className="font-semibold">{zone?.type} ({zone?.x}, {zone?.y})</p><p className="text-sm text-gray-400">Apparition: {ze.spawn_chance}% | Succès: {ze.success_chance}%</p>{ze.effects.stats && Object.keys(ze.effects.stats).length > 0 && <p className="text-xs text-blue-300">Effets: {Object.entries(ze.effects.stats).map(([s, v]) => `${v > 0 ? '+' : ''}${v} ${s}`).join(', ')}</p>}{ze.effects.item && <p className="text-xs text-green-300">Récompense: {item?.name} x{ze.effects.item.quantity}</p>}</div><Button size="sm" variant="destructive" onClick={() => handleRemoveZoneEvent(ze.id)}><Trash2 className="w-4 h-4" /></Button></div>); })}</div>
        </CardContent>
      </Card>
    </div>
  );

  const EventForm = (
    <Card className="bg-gray-700/50 border-gray-600">
      <CardHeader><CardTitle>{selectedEvent ? 'Modifier' : 'Créer'} un événement</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {isMobile && <Button variant="ghost" onClick={closeDetails} className="mb-2"><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button>}
        <div><Label htmlFor="event-name">Nom</Label><Input id="event-name" value={eventName} onChange={(e) => setEventName(e.target.value)} className="bg-gray-800 border-gray-600" /></div>
        <div><Label htmlFor="event-description">Description</Label><Textarea id="event-description" value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} className="bg-gray-800 border-gray-600" /></div>
        <div><Label>Icône</Label><div className="flex items-center gap-2">{(() => { const Icon = getIconComponent(eventIcon); return <Icon className="w-6 h-6 flex-shrink-0" />; })()}<Input value={eventIcon} onChange={(e) => setEventIcon(e.target.value)} className="bg-gray-800 border-gray-600" placeholder="Nom de l'icône Lucide" /></div></div>
        <div className="flex gap-2"><Button onClick={handleCreateOrUpdateEvent}>{selectedEvent ? 'Mettre à jour' : 'Créer'}</Button><Button variant="outline" onClick={closeDetails}>Annuler</Button></div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-gray-900 border-gray-700" /></div>
          <Button onClick={openCreateForm} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />Créer un événement</Button>
        </div>
      </div>
      <div className="flex-grow overflow-hidden flex">
        <div className={cn("border-r border-gray-700 overflow-y-auto", isMobile ? "w-full" : "w-1/3", isMobile && (selectedEvent || isCreatingEvent) && "hidden")}>{loading ? <div className="flex justify-center items-center h-32"><Loader2 className="w-6 h-6 animate-spin" /></div> : EventList}</div>
        <div className={cn("flex-grow overflow-y-auto p-4", isMobile ? "w-full" : "w-2/3", isMobile && !selectedEvent && !isCreatingEvent && "hidden")}>
          {isCreatingEvent ? EventForm : selectedEvent ? EventDetails : <div className="hidden sm:flex items-center justify-center h-full text-gray-400"><p>Sélectionnez un événement</p></div>}
        </div>
      </div>
      <ActionModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, event: null })} title="Supprimer l'événement" description={`Êtes-vous sûr de vouloir supprimer "${deleteModal.event?.name}" ?`} actions={[{ label: "Supprimer", onClick: handleDeleteEvent, variant: "destructive" }, { label: "Annuler", onClick: () => setDeleteModal({ isOpen: false, event: null }), variant: "secondary" }]} />
    </div>
  );
};

export default EventManager;