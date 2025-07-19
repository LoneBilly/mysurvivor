import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from '@/integrations/supabase/client';
import { Loader2, BookText, Plus, Minus, Wrench, Bug, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatchNote {
  id: number;
  version: string;
  title: string;
  created_at: string;
}

interface PatchNoteChange {
  id: number;
  change_type: 'ADDED' | 'MODIFIED' | 'REMOVED' | 'FIXED' | 'IMPROVED';
  entity_type: string;
  entity_name: string;
  description: string | null;
}

const changeTypeConfig = {
  ADDED: { icon: Plus, color: 'text-green-400' },
  MODIFIED: { icon: Wrench, color: 'text-blue-400' },
  REMOVED: { icon: Minus, color: 'text-red-400' },
  FIXED: { icon: Bug, color: 'text-yellow-400' },
  IMPROVED: { icon: ArrowUp, color: 'text-purple-400' },
};

interface PatchNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PatchNotesModal = ({ isOpen, onClose }: PatchNotesModalProps) => {
  const [patchNotes, setPatchNotes] = useState<(PatchNote & { changes: PatchNoteChange[] })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchNotes = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('patch_notes')
          .select('*, patch_note_changes(*)')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) console.error(error);
        else setPatchNotes(data as any[] || []);
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
            <Accordion type="single" collapsible className="w-full" defaultValue={`item-${patchNotes[0].id}`}>
              {patchNotes.map(note => (
                <AccordionItem key={note.id} value={`item-${note.id}`}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm bg-gray-700/50 px-2 py-0.5 rounded">{note.version}</span>
                      <span className="font-semibold text-left">{note.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 p-2">
                      {note.changes.length > 0 ? note.changes.map(change => {
                        const config = changeTypeConfig[change.change_type];
                        const Icon = config.icon;
                        return (
                          <div key={change.id} className="flex items-start gap-3">
                            <Icon className={cn("w-4 h-4 mt-1 flex-shrink-0", config.color)} />
                            <div>
                              <p><span className="font-semibold">{change.entity_name}</span></p>
                              {change.description && <p className="text-sm text-gray-400">{change.description}</p>}
                            </div>
                          </div>
                        );
                      }) : <p className="text-gray-400">Aucun détail pour ce patch.</p>}
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