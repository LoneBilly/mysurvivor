import { useState, useEffect, FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Event, MapCell } from '@/types/admin';
import { Loader2, Trash2, HelpCircle } from 'lucide-react';
import ActionModal from '@/components/ActionModal';
import ZoneIconEditorModal from './ZoneIconEditorModal';
import * as LucideIcons from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ZoneEventSetting {
  zone_id: number;
  spawn_chance: number;
  success_chance: number;
  effects: {
    vie: number;
    faim: number;
    soif: number;
    energie: number;
  };
}

interface EventEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event | null;
  onSave: () => void;
}

const EventEditorModal = ({ isOpen, onClose, event, onSave }: EventEditorModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isIconEditorOpen, setIsIconEditorOpen] = useState(false);

  const [resourceZones, setResourceZones] = useState<MapCell[]>([]);
  const [zoneEventSettings, setZoneEventSettings] = useState<ZoneEventSetting[]>([]);
  const [selectedZoneToAdd, setSelectedZoneToAdd] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setName(event?.name || '');
      setDescription(event?.description || '');
      setIcon(event?.icon || null);

      const fetchZonesAndSettings = async () => {
        const { data: zonesData, error: zonesError } = await supabase
          .from('map_layout')
          .select('*')
          .eq('interaction_type', 'Ressource');
        if (zonesError) showError("Erreur de chargement des zones.");
        else setResourceZones(zonesData || []);

        if (event) {
          const { data: settingsData, error: settingsError } = await supabase
            .from('zone_events')
            .select('*')
            .eq('event_id', event.id);
          if (settingsError) showError("Erreur de chargement des paramètres de zone.");
          else setZoneEventSettings(settingsData.map(d => ({ ...d, effects: d.effects as any })));
        } else {
          setZoneEventSettings([]);
        }
      };
      fetchZonesAndSettings();
    }
  }, [isOpen, event]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const eventData = { name, description, icon };
    let eventId = event?.id;

    if (event) {
      const { error } = await supabase.from('events').update(eventData).eq('id', event.id);
      if (error) { showError(error.message); setLoading(false); return; }
    } else {
      const { data, error } = await supabase.from('events').insert(eventData).select('id').single();
      if (error) { showError(error.message); setLoading(false); return; }
      eventId = data.id;
    }

    if (eventId) {
      const settingsToUpsert = zoneEventSettings.map(s => ({ ...s, event_id: eventId }));
      const { error: settingsError } = await supabase.from('zone_events').upsert(settingsToUpsert, { onConflict: 'zone_id,event_id' });
      if (settingsError) { showError(`Erreur de sauvegarde des paramètres: ${settingsError.message}`); }
    }

    showSuccess(`Événement ${event ? 'mis à jour' : 'créé'} !`);
    onSave();
    onClose();
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!event) return;
    setLoading(true);
    const { error } = await supabase.from('events').delete().eq('id', event.id);
    if (error) { showError(`Erreur: ${error.message}`); } 
    else {
      showSuccess("Événement supprimé.");
      onSave();
      onClose();
    }
    setIsDeleteModalOpen(false);
    setLoading(false);
  };

  const handleAddZone = () => {
    if (!selectedZoneToAdd || zoneEventSettings.some(s => s.zone_id === parseInt(selectedZoneToAdd))) return;
    setZoneEventSettings([...zoneEventSettings, {
      zone_id: parseInt(selectedZoneToAdd),
      spawn_chance: 10,
      success_chance: 50,
      effects: { vie: 0, faim: 0, soif: 0, energie: 0 }
    }]);
    setSelectedZoneToAdd('');
  };

  const handleRemoveZone = (zoneId: number) => {
    setZoneEventSettings(zoneEventSettings.filter(s => s.zone_id !== zoneId));
    if (event) {
      supabase.from('zone_events').delete().match({ event_id: event.id, zone_id: zoneId }).then();
    }
  };

  const handleSettingChange = (zoneId: number, field: keyof ZoneEventSetting, value: any) => {
    setZoneEventSettings(zoneEventSettings.map(s => s.zone_id === zoneId ? { ...s, [field]: value } : s));
  };

  const handleEffectChange = (zoneId: number, effect: keyof ZoneEventSetting['effects'], value: string) => {
    const numValue = parseInt(value, 10) || 0;
    setZoneEventSettings(zoneEventSettings.map(s => 
      s.zone_id === zoneId ? { ...s, effects: { ...s.effects, [effect]: numValue } } : s
    ));
  };

  const IconComponent = icon ? (LucideIcons as any)[icon] || HelpCircle : HelpCircle;
  const availableZonesToAdd = resourceZones.filter(z => !zoneEventSettings.some(s => s.zone_id === z.id));

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 flex flex-col">
          <DialogHeader>
            <DialogTitle>{event ? 'Modifier l\'événement' : 'Créer un événement'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
            <div className="flex-grow overflow-y-auto p-1 pr-4 space-y-4">
              <div className="flex items-end gap-4">
                <Button type="button" variant="ghost" size="icon" onClick={() => setIsIconEditorOpen(true)} className="w-16 h-16 text-3xl">
                  <IconComponent className="w-10 h-10" />
                </Button>
                <div className="flex-grow">
                  <Label htmlFor="name">Nom</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Zones Affectées</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Select value={selectedZoneToAdd} onValueChange={setSelectedZoneToAdd}>
                      <SelectTrigger><SelectValue placeholder="Choisir une zone à ajouter..." /></SelectTrigger>
                      <SelectContent>
                        {availableZonesToAdd.map(z => <SelectItem key={z.id} value={String(z.id)}>{z.type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={handleAddZone} disabled={!selectedZoneToAdd}>Ajouter</Button>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {zoneEventSettings.map(setting => {
                      const zoneInfo = resourceZones.find(z => z.id === setting.zone_id);
                      return (
                        <div key={setting.zone_id} className="p-3 bg-gray-700/50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold">{zoneInfo?.type || 'Zone inconnue'}</h4>
                            <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveZone(setting.zone_id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-2">
                            <div>
                              <Label>Chance d'apparition (%)</Label>
                              <Input type="number" value={setting.spawn_chance} onChange={e => handleSettingChange(setting.zone_id, 'spawn_chance', parseInt(e.target.value) || 0)} />
                            </div>
                            <div>
                              <Label>Chance de succès (%)</Label>
                              <Input type="number" value={setting.success_chance} onChange={e => handleSettingChange(setting.zone_id, 'success_chance', parseInt(e.target.value) || 0)} />
                            </div>
                          </div>
                          <div>
                            <Label>Effets sur succès (ex: -20 pour perte)</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                              {Object.keys(setting.effects).map(key => (
                                <div key={key}>
                                  <Label className="capitalize text-sm">{key}</Label>
                                  <Input type="number" value={setting.effects[key as keyof typeof setting.effects]} onChange={e => handleEffectChange(setting.zone_id, key as keyof typeof setting.effects, e.target.value)} />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter className="flex-shrink-0 pt-4 border-t">
              <div className="flex w-full justify-between">
                {event ? <Button type="button" variant="destructive" onClick={() => setIsDeleteModalOpen(true)}>Supprimer</Button> : <div />}
                <Button type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : 'Sauvegarder'}</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ActionModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmer la suppression" description="Voulez-vous vraiment supprimer cet événement ?" actions={[{ label: 'Confirmer', onClick: handleDelete, variant: 'destructive' }, { label: 'Annuler', onClick: () => setIsDeleteModalOpen(false), variant: 'secondary' }]} />
      <ZoneIconEditorModal isOpen={isIconEditorOpen} onClose={() => setIsIconEditorOpen(false)} currentIcon={icon} onSave={setIcon} />
    </>
  );
};

export default EventEditorModal;