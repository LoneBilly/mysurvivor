import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Plus, Trash2, HelpCircle, Heart, Utensils, Droplets, Zap } from 'lucide-react';
import * as LucideIcons from "lucide-react";
import { showSuccess, showError } from '@/utils/toast';
import { Event, ZoneEvent } from '@/types/admin';
import { MapCell } from '@/types/game';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import ActionModal from '../ActionModal';

interface EventEditorProps {
  event: Event | null;
  onBack: () => void;
}

const statIcons: { [key: string]: React.ElementType } = {
  vie: Heart,
  faim: Utensils,
  soif: Droplets,
  energie: Zap,
};

const EventEditor = ({ event, onBack }: EventEditorProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [zoneEvents, setZoneEvents] = useState<ZoneEvent[]>([]);
  const [availableZones, setAvailableZones] = useState<MapCell[]>([]);
  const [selectedZoneToAdd, setSelectedZoneToAdd] = useState('');

  useEffect(() => {
    setName(event?.name || '');
    setDescription(event?.description || '');
    setIcon(event?.icon || '');
    if (event) {
      fetchZoneEvents(event.id);
    }
    fetchAvailableZones();
  }, [event]);

  const fetchZoneEvents = async (eventId: number) => {
    const { data, error } = await supabase.from('zone_events').select('*, events(name)').eq('event_id', eventId);
    if (error) showError("Erreur de chargement des zones liées.");
    else setZoneEvents(data || []);
  };

  const fetchAvailableZones = async () => {
    const { data, error } = await supabase.from('map_layout').select('*').eq('interaction_type', 'Ressource');
    if (error) showError("Erreur de chargement des zones disponibles.");
    else setAvailableZones(data || []);
  };

  const handleSaveEvent = async () => {
    setLoading(true);
    let eventId = event?.id;
    if (!name) {
      showError("Le nom de l'événement est obligatoire.");
      setLoading(false);
      return;
    }

    const eventData = { name, description, icon };
    if (event) {
      const { error } = await supabase.from('events').update(eventData).eq('id', event.id);
      if (error) showError(error.message);
      else showSuccess("Événement mis à jour.");
    } else {
      const { data, error } = await supabase.from('events').insert(eventData).select().single();
      if (error) showError(error.message);
      else {
        showSuccess("Événement créé.");
        eventId = data.id;
      }
    }
    setLoading(false);
    if (!event && eventId) onBack();
  };

  const handleDeleteEvent = async () => {
    if (!event) return;
    setDeleting(true);
    const { error } = await supabase.from('events').delete().eq('id', event.id);
    setDeleting(false);
    if (error) showError(error.message);
    else {
      showSuccess("Événement supprimé.");
      onBack();
    }
    setIsDeleteModalOpen(false);
  };

  const handleAddZoneLink = async () => {
    if (!event || !selectedZoneToAdd) return;
    const zoneId = parseInt(selectedZoneToAdd, 10);
    const newZoneEvent: ZoneEvent = {
      zone_id: zoneId,
      event_id: event.id,
      spawn_chance: 10,
      success_chance: 50,
      effects: { vie: -10 },
    };
    const { error } = await supabase.from('zone_events').insert(newZoneEvent);
    if (error) showError(error.message);
    else {
      showSuccess("Zone liée.");
      fetchZoneEvents(event.id);
      setSelectedZoneToAdd('');
    }
  };

  const handleUpdateZoneEvent = async (updatedZoneEvent: ZoneEvent) => {
    const { id, ...updateData } = updatedZoneEvent;
    delete updateData.events; // remove relation data
    const { error } = await supabase.from('zone_events').update(updateData).eq('id', id!);
    if (error) showError(error.message);
    else showSuccess("Lien mis à jour.");
  };

  const handleDeleteZoneEvent = async (zoneEventId: number) => {
    const { error } = await supabase.from('zone_events').delete().eq('id', zoneEventId);
    if (error) showError(error.message);
    else {
      showSuccess("Lien supprimé.");
      if (event) fetchZoneEvents(event.id);
    }
  };

  const handleEffectChange = (zoneEventId: number, stat: string, value: string) => {
    const updatedZoneEvents = zoneEvents.map(ze => {
      if (ze.id === zoneEventId) {
        const newEffects = { ...ze.effects };
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
          newEffects[stat] = numValue;
        } else {
          delete newEffects[stat];
        }
        return { ...ze, effects: newEffects };
      }
      return ze;
    });
    setZoneEvents(updatedZoneEvents);
  };

  const IconComponent = icon ? (LucideIcons as any)[icon] || HelpCircle : HelpCircle;

  return (
    <Card className="w-full max-w-4xl mx-auto bg-gray-800/50 border-gray-700 text-white flex flex-col h-full">
      <CardHeader className="flex-shrink-0 border-b border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          <h2 className="text-2xl font-bold">{event ? 'Modifier l\'événement' : 'Créer un événement'}</h2>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
        <Card className="bg-gray-700/50 border-gray-600">
          <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-name">Nom</Label>
                <Input id="event-name" value={name} onChange={e => setName(e.target.value)} className="bg-gray-800 border-gray-600" />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-grow">
                  <Label htmlFor="event-icon">Icône (Lucide)</Label>
                  <Input id="event-icon" value={icon} onChange={e => setIcon(e.target.value)} className="bg-gray-800 border-gray-600" />
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-md flex items-center justify-center flex-shrink-0">
                  <IconComponent className="w-6 h-6" />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="event-description">Description</Label>
              <Textarea id="event-description" value={description} onChange={e => setDescription(e.target.value)} className="bg-gray-800 border-gray-600" />
            </div>
            <div className="flex justify-end gap-2">
              {event && <Button variant="destructive" onClick={() => setIsDeleteModalOpen(true)} disabled={deleting}>{deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}</Button>}
              <Button onClick={handleSaveEvent} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sauvegarder'}</Button>
            </div>
          </CardContent>
        </Card>

        {event && (
          <Card className="bg-gray-700/50 border-gray-600">
            <CardHeader><CardTitle>Zones affectées</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {zoneEvents.map(ze => {
                  const zone = availableZones.find(z => z.id === ze.zone_id);
                  return (
                    <div key={ze.id} className="p-3 bg-gray-800/60 rounded-lg border border-gray-600 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold">{zone?.type || `Zone ID: ${ze.zone_id}`}</h4>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteZoneEvent(ze.id!)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Chance d'apparition (%)</Label>
                          <Input type="number" value={ze.spawn_chance} onChange={e => setZoneEvents(zes => zes.map(z => z.id === ze.id ? {...z, spawn_chance: parseInt(e.target.value) || 0} : z))} onBlur={() => handleUpdateZoneEvent(zoneEvents.find(z => z.id === ze.id)!)} className="bg-gray-900 border-gray-700" />
                        </div>
                        <div>
                          <Label>Chance de succès (%)</Label>
                          <Input type="number" value={ze.success_chance} onChange={e => setZoneEvents(zes => zes.map(z => z.id === ze.id ? {...z, success_chance: parseInt(e.target.value) || 0} : z))} onBlur={() => handleUpdateZoneEvent(zoneEvents.find(z => z.id === ze.id)!)} className="bg-gray-900 border-gray-700" />
                        </div>
                      </div>
                      <div>
                        <Label>Effets (si succès)</Label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {Object.keys(statIcons).map(stat => (
                            <div key={stat} className="flex items-center gap-2">
                              <Label htmlFor={`effect-${ze.id}-${stat}`} className="flex items-center gap-1 w-20"><IconComponent className="w-4 h-4" /> {stat}</Label>
                              <Input id={`effect-${ze.id}-${stat}`} type="number" placeholder="0" value={ze.effects[stat] || ''} onChange={e => handleEffectChange(ze.id!, stat, e.target.value)} onBlur={() => handleUpdateZoneEvent(zoneEvents.find(z => z.id === ze.id)!)} className="bg-gray-900 border-gray-700" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 pt-4 border-t border-gray-600">
                <Select value={selectedZoneToAdd} onValueChange={setSelectedZoneToAdd}>
                  <SelectTrigger className="flex-1 bg-gray-800 border-gray-600"><SelectValue placeholder="Lier une nouvelle zone..." /></SelectTrigger>
                  <SelectContent>
                    {availableZones.filter(az => !zoneEvents.some(ze => ze.zone_id === az.id)).map(z => <SelectItem key={z.id} value={String(z.id)}>{z.type}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddZoneLink} disabled={!selectedZoneToAdd}><Plus className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
      <ActionModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmer la suppression" description={`Voulez-vous vraiment supprimer l'événement "${event?.name}" ? Cette action est irréversible.`} actions={[{ label: "Supprimer", onClick: handleDeleteEvent, variant: "destructive" }, { label: "Annuler", onClick: () => setIsDeleteModalOpen(false), variant: "secondary" }]} />
    </Card>
  );
};

export default EventEditor;