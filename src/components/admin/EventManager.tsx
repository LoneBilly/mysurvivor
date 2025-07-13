import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Edit, Trash2, Zap, Search } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { MapCell } from '@/types/game';
import * as LucideIcons from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import ActionModal from '../ActionModal';

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
  effects: Record<string, number>;
  created_at: string;
}

interface EventManagerProps {
  mapLayout: MapCell[];
}

const STAT_OPTIONS = ['vie', 'faim', 'soif', 'energie'];

const EventManager = ({ mapLayout }: EventManagerProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [zoneEvents, setZoneEvents] = useState<ZoneEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Event creation/editing
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventIcon, setEventIcon] = useState('');
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  
  // Zone event configuration
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [spawnChance, setSpawnChance] = useState(10);
  const [successChance, setSuccessChance] = useState(50);
  const [effects, setEffects] = useState<Record<string, number>>({});
  
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; event: Event | null }>({ isOpen: false, event: null });

  const resourceZones = mapLayout.filter(zone => zone.interaction_type === 'Ressource');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('events').select('*').order('name');
    if (error) {
      showError("Impossible de charger les événements.");
      console.error(error);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }, []);

  const fetchZoneEvents = useCallback(async (eventId: number) => {
    const { data, error } = await supabase.from('zone_events').select('*').eq('event_id', eventId);
    if (error) {
      showError("Impossible de charger les configurations de zones.");
      console.error(error);
    } else {
      setZoneEvents(data || []);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (selectedEvent) {
      fetchZoneEvents(selectedEvent.id);
    }
  }, [selectedEvent, fetchZoneEvents]);

  const handleCreateEvent = async () => {
    if (!eventName.trim()) {
      showError("Le nom de l'événement est requis.");
      return;
    }

    const { data, error } = await supabase.from('events').insert({
      name: eventName.trim(),
      description: eventDescription.trim() || null,
      icon: eventIcon || null,
    }).select().single();

    if (error) {
      showError("Erreur lors de la création de l'événement.");
      console.error(error);
    } else {
      showSuccess("Événement créé avec succès !");
      setEvents(prev => [...prev, data]);
      setIsCreatingEvent(false);
      setEventName('');
      setEventDescription('');
      setEventIcon('');
    }
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent || !eventName.trim()) return;

    const { error } = await supabase.from('events').update({
      name: eventName.trim(),
      description: eventDescription.trim() || null,
      icon: eventIcon || null,
    }).eq('id', selectedEvent.id);

    if (error) {
      showError("Erreur lors de la mise à jour de l'événement.");
      console.error(error);
    } else {
      showSuccess("Événement mis à jour !");
      const updatedEvent = { ...selectedEvent, name: eventName, description: eventDescription, icon: eventIcon };
      setEvents(prev => prev.map(e => e.id === selectedEvent.id ? updatedEvent : e));
      setSelectedEvent(updatedEvent);
      setIsCreatingEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteModal.event) return;

    const { error } = await supabase.from('events').delete().eq('id', deleteModal.event.id);
    if (error) {
      showError("Erreur lors de la suppression.");
      console.error(error);
    } else {
      showSuccess("Événement supprimé !");
      setEvents(prev => prev.filter(e => e.id !== deleteModal.event!.id));
      if (selectedEvent?.id === deleteModal.event.id) {
        setSelectedEvent(null);
      }
    }
    setDeleteModal({ isOpen: false, event: null });
  };

  const handleSaveZoneEvent = async () => {
    if (!selectedEvent || !selectedZoneId) return;

    const { error } = await supabase.from('zone_events').upsert({
      zone_id: selectedZoneId,
      event_id: selectedEvent.id,
      spawn_chance: spawnChance,
      success_chance: successChance,
      effects,
    }, { onConflict: 'zone_id,event_id' });

    if (error) {
      showError("Erreur lors de la sauvegarde.");
      console.error(error);
    } else {
      showSuccess("Configuration de zone sauvegardée !");
      fetchZoneEvents(selectedEvent.id);
      setSelectedZoneId(null);
      setSpawnChance(10);
      setSuccessChance(50);
      setEffects({});
    }
  };

  const handleRemoveZoneEvent = async (zoneEventId: number) => {
    const { error } = await supabase.from('zone_events').delete().eq('id', zoneEventId);
    if (error) {
      showError("Erreur lors de la suppression.");
      console.error(error);
    } else {
      showSuccess("Configuration supprimée !");
      if (selectedEvent) {
        fetchZoneEvents(selectedEvent.id);
      }
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
    return Icon || Zap;
  };

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableIcons = Object.keys(LucideIcons).filter(name => 
    typeof (LucideIcons as any)[name] === 'function' && 
    name !== 'createLucideIcon' && 
    name !== 'default'
  );

  return (
    <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher un événement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-700"
            />
          </div>
          <Button onClick={() => {
            setIsCreatingEvent(true);
            setSelectedEvent(null);
            setEventName('');
            setEventDescription('');
            setEventIcon('');
          }} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Créer un événement
          </Button>
        </div>
      </div>

      <div className="flex-grow overflow-hidden flex">
        {/* Events List */}
        <div className="w-1/3 border-r border-gray-700 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredEvents.map(event => {
                const IconComponent = getIconComponent(event.icon);
                return (
                  <Card key={event.id} className={cn(
                    "cursor-pointer transition-colors bg-gray-700/50 border-gray-600",
                    selectedEvent?.id === event.id && "border-blue-500 bg-blue-500/10"
                  )} onClick={() => setSelectedEvent(event)}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-grow min-w-0">
                          <p className="font-semibold truncate">{event.name}</p>
                          {event.description && (
                            <p className="text-xs text-gray-400 truncate">{event.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={(e) => {
                            e.stopPropagation();
                            startEditingEvent(event);
                          }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ isOpen: true, event });
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Event Details */}
        <div className="flex-grow overflow-y-auto p-4">
          {isCreatingEvent ? (
            <Card className="bg-gray-700/50 border-gray-600">
              <CardHeader>
                <CardTitle>{selectedEvent ? 'Modifier l\'événement' : 'Créer un événement'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="event-name">Nom de l'événement</Label>
                  <Input
                    id="event-name"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="bg-gray-800 border-gray-600"
                  />
                </div>
                <div>
                  <Label htmlFor="event-description">Description</Label>
                  <Textarea
                    id="event-description"
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    className="bg-gray-800 border-gray-600"
                  />
                </div>
                <div>
                  <Label>Icône</Label>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const IconComponent = getIconComponent(eventIcon);
                      return <IconComponent className="w-6 h-6" />;
                    })()}
                    <Popover open={isIconPickerOpen} onOpenChange={setIsIconPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="bg-gray-800 border-gray-600">
                          {eventIcon || 'Choisir une icône'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <Command>
                          <CommandInput placeholder="Rechercher une icône..." />
                          <CommandList className="max-h-60">
                            <CommandEmpty>Aucune icône trouvée.</CommandEmpty>
                            <CommandGroup>
                              {availableIcons.slice(0, 50).map((iconName) => {
                                const Icon = (LucideIcons as any)[iconName];
                                return (
                                  <CommandItem
                                    key={iconName}
                                    value={iconName}
                                    onSelect={() => {
                                      setEventIcon(iconName);
                                      setIsIconPickerOpen(false);
                                    }}
                                  >
                                    <Icon className="mr-2 h-4 w-4" />
                                    {iconName}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={selectedEvent ? handleUpdateEvent : handleCreateEvent}>
                    {selectedEvent ? 'Mettre à jour' : 'Créer'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreatingEvent(false)}>
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedEvent ? (
            <div className="space-y-4">
              <Card className="bg-gray-700/50 border-gray-600">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {(() => {
                      const IconComponent = getIconComponent(selectedEvent.icon);
                      return <IconComponent className="w-6 h-6" />;
                    })()}
                    {selectedEvent.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">{selectedEvent.description || 'Aucune description'}</p>
                </CardContent>
              </Card>

              {/* Zone Events Configuration */}
              <Card className="bg-gray-700/50 border-gray-600">
                <CardHeader>
                  <CardTitle>Configuration des zones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add new zone event */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-800/50 rounded-lg">
                    <div>
                      <Label>Zone</Label>
                      <select
                        value={selectedZoneId || ''}
                        onChange={(e) => setSelectedZoneId(Number(e.target.value) || null)}
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded"
                      >
                        <option value="">Sélectionner une zone</option>
                        {resourceZones.map(zone => (
                          <option key={zone.id} value={zone.id}>
                            {zone.type} ({zone.x}, {zone.y})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Chance d'apparition (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={spawnChance}
                        onChange={(e) => setSpawnChance(Number(e.target.value))}
                        className="bg-gray-800 border-gray-600"
                      />
                    </div>
                    <div>
                      <Label>Chance de succès (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={successChance}
                        onChange={(e) => setSuccessChance(Number(e.target.value))}
                        className="bg-gray-800 border-gray-600"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleSaveZoneEvent} disabled={!selectedZoneId} className="w-full">
                        Ajouter
                      </Button>
                    </div>
                  </div>

                  {/* Effects configuration */}
                  <div>
                    <Label>Effets (si succès)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      {STAT_OPTIONS.map(stat => (
                        <div key={stat}>
                          <Label className="text-xs">{stat}</Label>
                          <Input
                            type="number"
                            min="-100"
                            max="100"
                            value={effects[stat] || ''}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              setEffects(prev => ({
                                ...prev,
                                [stat]: value || 0
                              }));
                            }}
                            className="bg-gray-800 border-gray-600"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Existing zone events */}
                  <div className="space-y-2">
                    {zoneEvents.map(zoneEvent => {
                      const zone = resourceZones.find(z => z.id === zoneEvent.zone_id);
                      return (
                        <div key={zoneEvent.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div className="flex-grow">
                            <p className="font-semibold">{zone?.type} ({zone?.x}, {zone?.y})</p>
                            <p className="text-sm text-gray-400">
                              Apparition: {zoneEvent.spawn_chance}% | Succès: {zoneEvent.success_chance}%
                            </p>
                            {Object.keys(zoneEvent.effects).length > 0 && (
                              <p className="text-xs text-blue-300">
                                Effets: {Object.entries(zoneEvent.effects)
                                  .map(([stat, value]) => `${value > 0 ? '+' : ''}${value} ${stat}`)
                                  .join(', ')}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveZoneEvent(zoneEvent.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Sélectionnez un événement pour le configurer</p>
            </div>
          )}
        </div>
      </div>

      <ActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, event: null })}
        title="Supprimer l'événement"
        description={`Êtes-vous sûr de vouloir supprimer l'événement "${deleteModal.event?.name}" ? Cette action supprimera aussi toutes ses configurations de zones.`}
        actions={[
          { label: "Supprimer", onClick: handleDeleteEvent, variant: "destructive" },
          { label: "Annuler", onClick: () => setDeleteModal({ isOpen: false, event: null }), variant: "secondary" },
        ]}
      />
    </div>
  );
};

export default EventManager;