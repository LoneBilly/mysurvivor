import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Edit } from 'lucide-react';
import { showError } from '@/utils/toast';
import { Event } from '@/types/admin';
import EventEditor from './EventEditor';

const EventManager = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('events').select('*').order('name');
    if (error) {
      showError("Impossible de charger les événements.");
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!selectedEvent && !isCreating) {
      fetchEvents();
    }
  }, [selectedEvent, isCreating, fetchEvents]);

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

  if (selectedEvent || isCreating) {
    return <EventEditor event={selectedEvent} onBack={handleBackToList} />;
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Gestion des Événements</h2>
        <Button onClick={handleCreateNew}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Créer un événement
        </Button>
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {events.map(event => (
            <div key={event.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <span className="font-semibold">{event.name}</span>
              <Button variant="ghost" size="icon" onClick={() => handleSelectEvent(event)}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventManager;