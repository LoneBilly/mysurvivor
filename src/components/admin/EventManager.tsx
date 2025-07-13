import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Zap } from 'lucide-react';
import { showError } from '@/utils/toast';
import { Event } from '@/types/admin';
import EventEditorModal from './EventEditorModal';
import * as LucideIcons from "lucide-react";

const EventManager = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('events').select('*').order('name');
    if (error) {
      showError("Impossible de charger les événements.");
      console.error(error);
    } else {
      setEvents(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCreate = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  }

  return (
    <>
      <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700 flex-shrink-0 flex justify-between items-center">
          <h2 className="text-xl font-bold">Gestion des Événements</h2>
          <Button onClick={handleCreate}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Créer un événement
          </Button>
        </div>
        <div className="flex-grow overflow-y-auto p-4">
          {events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map(event => {
                const IconComponent = event.icon ? (LucideIcons as any)[event.icon] : Zap;
                return (
                  <div key={event.id} onClick={() => handleEdit(event)} className="bg-gray-800/60 p-4 rounded-lg border border-gray-700 cursor-pointer hover:border-sky-500 transition-colors">
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-6 h-6 text-sky-400 flex-shrink-0" />
                      <h3 className="font-bold text-lg truncate">{event.name}</h3>
                    </div>
                    <p className="text-sm text-gray-400 mt-2 line-clamp-2">{event.description || 'Aucune description.'}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-10">Aucun événement créé.</div>
          )}
        </div>
      </div>
      <EventEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={editingEvent}
        onSave={fetchEvents}
      />
    </>
  );
};

export default EventManager;