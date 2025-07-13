import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PlusCircle, Save, Trash2, HelpCircle, ArrowLeft } from 'lucide-react';
import * as LucideIcons from "lucide-react";
import { showSuccess, showError } from '@/utils/toast';
import { Event, ZoneEvent } from '@/types/admin';
import { MapCell } from '@/types/game';
import ActionModal from '../ActionModal';

const getIconComponent = (iconName: string | null): React.ElementType => {
    if (!iconName) return HelpCircle;
    const Icon = (LucideIcons as any)[iconName];
    return (Icon && typeof Icon.render === 'function') ? Icon : HelpCircle;
};

const EventEditor = ({ event, onBack, onSave }: { event: Event | null, onBack: () => void, onSave: () => void }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('');
    const [resourceZones, setResourceZones] = useState<MapCell[]>([]);
    const [zoneEvents, setZoneEvents] = useState<Map<number, ZoneEvent>>(new Map());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setName(event?.name || '');
        setDescription(event?.description || '');
        setIcon(event?.icon || '');

        const fetchData = async () => {
            setLoading(true);
            const { data: zonesData, error: zonesError } = await supabase.from('map_layout').select('*').eq('interaction_type', 'Ressource');
            if (zonesError) showError("Erreur de chargement des zones.");
            else setResourceZones(zonesData || []);

            if (event) {
                const { data: zoneEventsData, error: zoneEventsError } = await supabase.from('zone_events').select('*').eq('event_id', event.id);
                if (zoneEventsError) showError("Erreur de chargement des liens d'événements.");
                else {
                    const map = new Map<number, ZoneEvent>();
                    zoneEventsData.forEach(ze => map.set(ze.zone_id, ze));
                    setZoneEvents(map);
                }
            } else {
                setZoneEvents(new Map());
            }
            setLoading(false);
        };
        fetchData();
    }, [event]);

    const handleSaveEvent = async () => {
        setLoading(true);
        let savedEvent = event;

        // Save or update the main event
        if (event) {
            const { data, error } = await supabase.from('events').update({ name, description, icon }).eq('id', event.id).select().single();
            if (error) { showError("Erreur de sauvegarde de l'événement."); setLoading(false); return; }
            savedEvent = data;
        } else {
            const { data, error } = await supabase.from('events').insert({ name, description, icon }).select().single();
            if (error) { showError("Erreur de création de l'événement."); setLoading(false); return; }
            savedEvent = data;
        }

        // Save zone events
        const upserts = Array.from(zoneEvents.values()).filter(ze => ze.spawn_chance > 0).map(ze => ({ ...ze, event_id: savedEvent!.id }));
        const deletes = resourceZones.filter(zone => !zoneEvents.has(zone.id) || zoneEvents.get(zone.id)!.spawn_chance === 0);

        const promises = [];
        if (upserts.length > 0) promises.push(supabase.from('zone_events').upsert(upserts));
        if (deletes.length > 0) promises.push(supabase.from('zone_events').delete().eq('event_id', savedEvent!.id).in('zone_id', deletes.map(z => z.id)));
        
        await Promise.all(promises);
        
        showSuccess("Événement sauvegardé !");
        setLoading(false);
        onSave();
    };

    const handleZoneEventChange = (zoneId: number, field: keyof ZoneEvent, value: any) => {
        const newZoneEvents = new Map(zoneEvents);
        const current = newZoneEvents.get(zoneId) || { zone_id: zoneId, event_id: event?.id || 0, spawn_chance: 0, success_chance: 0, effects: {} };
        
        if (field === 'effects') {
            const [stat, effectValue] = value.split(':');
            const numValue = parseInt(effectValue, 10);
            const newEffects = { ...current.effects, [stat]: isNaN(numValue) ? undefined : numValue };
            // Remove undefined keys
            Object.keys(newEffects).forEach(key => newEffects[key as keyof typeof newEffects] === undefined && delete newEffects[key as keyof typeof newEffects]);
            current.effects = newEffects;
        } else {
            (current as any)[field] = parseInt(value, 10) || 0;
        }
        
        newZoneEvents.set(zoneId, current);
        setZoneEvents(newZoneEvents);
    };

    const IconComponent = getIconComponent(icon);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-4 mb-4 flex-shrink-0">
                <Button onClick={onBack} variant="ghost" size="icon"><ArrowLeft /></Button>
                <h2 className="text-2xl font-bold">{event ? "Modifier l'événement" : "Nouvel événement"}</h2>
            </div>
            {loading ? <Loader2 className="m-auto w-8 h-8 animate-spin" /> : (
                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                    <Card className="bg-gray-800/60 border-gray-700">
                        <CardHeader><CardTitle>Détails de l'événement</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><Label>Nom</Label><Input value={name} onChange={e => setName(e.target.value)} className="bg-gray-900/80 border-gray-600" /></div>
                                <div><Label>Icône (Lucide)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input value={icon} onChange={e => setIcon(e.target.value)} className="bg-gray-900/80 border-gray-600" />
                                        <div className="p-2 rounded-md bg-gray-900/80 border border-gray-600"><IconComponent className="w-5 h-5" /></div>
                                    </div>
                                </div>
                            </div>
                            <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-gray-900/80 border-gray-600" /></div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gray-800/60 border-gray-700">
                        <CardHeader><CardTitle>Zones affectées</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {resourceZones.map(zone => {
                                const ze = zoneEvents.get(zone.id);
                                return (
                                <div key={zone.id} className="p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                                    <h4 className="font-semibold">{zone.type}</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                                        <div><Label className="text-xs">Apparition (%)</Label><Input type="number" value={ze?.spawn_chance || ''} onChange={e => handleZoneEventChange(zone.id, 'spawn_chance', e.target.value)} className="bg-gray-800 border-gray-600 h-8" /></div>
                                        <div><Label className="text-xs">Succès (%)</Label><Input type="number" value={ze?.success_chance || ''} onChange={e => handleZoneEventChange(zone.id, 'success_chance', e.target.value)} className="bg-gray-800 border-gray-600 h-8" /></div>
                                        <div><Label className="text-xs">Vie</Label><Input type="number" value={ze?.effects?.vie || ''} onChange={e => handleZoneEventChange(zone.id, 'effects', `vie:${e.target.value}`)} className="bg-gray-800 border-gray-600 h-8" /></div>
                                        <div><Label className="text-xs">Faim</Label><Input type="number" value={ze?.effects?.faim || ''} onChange={e => handleZoneEventChange(zone.id, 'effects', `faim:${e.target.value}`)} className="bg-gray-800 border-gray-600 h-8" /></div>
                                        <div><Label className="text-xs">Soif</Label><Input type="number" value={ze?.effects?.soif || ''} onChange={e => handleZoneEventChange(zone.id, 'effects', `soif:${e.target.value}`)} className="bg-gray-800 border-gray-600 h-8" /></div>
                                        <div><Label className="text-xs">Énergie</Label><Input type="number" value={ze?.effects?.energie || ''} onChange={e => handleZoneEventChange(zone.id, 'effects', `energie:${e.target.value}`)} className="bg-gray-800 border-gray-600 h-8" /></div>
                                    </div>
                                </div>
                            )})}
                        </CardContent>
                    </Card>
                </div>
            )}
            <div className="flex-shrink-0 pt-4">
                <Button onClick={handleSaveEvent} disabled={loading} className="w-full"><Save className="w-4 h-4 mr-2" />Sauvegarder</Button>
            </div>
        </div>
    );
};

const EventManager = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; event: Event | null }>({ isOpen: false, event: null });

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('events').select('*').order('name');
        if (error) showError("Erreur de chargement des événements.");
        else setEvents(data || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleSelectEvent = (event: Event) => {
        setSelectedEvent(event);
        setIsCreating(false);
    };

    const handleCreateNew = () => {
        setSelectedEvent(null);
        setIsCreating(true);
    };

    const handleBackToList = () => {
        setSelectedEvent(null);
        setIsCreating(false);
    };

    const handleSave = () => {
        handleBackToList();
        fetchEvents();
    };

    const handleDelete = async () => {
        if (!deleteModal.event) return;
        const { error } = await supabase.from('events').delete().eq('id', deleteModal.event.id);
        if (error) showError("Erreur de suppression.");
        else showSuccess("Événement supprimé.");
        setDeleteModal({ isOpen: false, event: null });
        fetchEvents();
    };

    if (selectedEvent || isCreating) {
        return <EventEditor event={selectedEvent} onBack={handleBackToList} onSave={handleSave} />;
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-2xl font-bold">Liste des événements</h2>
                <Button onClick={handleCreateNew}><PlusCircle className="w-4 h-4 mr-2" />Créer</Button>
            </div>
            {loading ? <Loader2 className="m-auto w-8 h-8 animate-spin" /> : (
                <div className="flex-grow overflow-y-auto pr-2 space-y-2">
                    {events.map(event => (
                        <div key={event.id} className="flex items-center justify-between p-3 bg-gray-800/60 border border-gray-700 rounded-lg">
                            <div className="flex items-center gap-3">
                                {React.createElement(getIconComponent(event.icon), { className: "w-5 h-5" })}
                                <span className="font-semibold">{event.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button onClick={() => handleSelectEvent(event)} variant="outline" size="sm">Modifier</Button>
                                <Button onClick={() => setDeleteModal({ isOpen: true, event })} variant="destructive" size="icon"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <ActionModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, event: null })}
                title="Confirmer la suppression"
                description={`Voulez-vous vraiment supprimer l'événement "${deleteModal.event?.name}" ?`}
                actions={[
                    { label: "Supprimer", onClick: handleDelete, variant: "destructive" },
                    { label: "Annuler", onClick: () => setDeleteModal({ isOpen: false, event: null }), variant: "secondary" }
                ]}
            />
        </div>
    );
};

export default EventManager;