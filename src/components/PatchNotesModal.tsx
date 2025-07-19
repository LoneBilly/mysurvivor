import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from '@/integrations/supabase/client';
import { Loader2, BookText } from 'lucide-react';

interface PatchNote {
  id: number;
  version: string;
  title: string;
  content: string | null;
  created_at: string;
}

interface PatchNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PatchNotesModal = ({ isOpen, onClose }: PatchNotesModalProps) => {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchNotes = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('patch_notes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) console.error(error);
        else setPatchNotes(data || []);
        setLoading(false);
      };
      fetchNotes();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
        <DialogHeader className="text-center">
          <BookText className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Patch Notes</DialogTitle>
          <DialogDescription>Les dernières mises à jour du jeu.</DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-32"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : patchNotes.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {patchNotes.map(note => (
                <AccordionItem key={note.id} value={`item-${note.id}`}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm bg-gray-700/50 px-2 py-0.5 rounded">{note.version}</span>
                      <span className="font-semibold">{note.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap p-2">
                      {note.content}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-center text-gray-400">Aucune note de mise à jour disponible.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PatchNotesModal;