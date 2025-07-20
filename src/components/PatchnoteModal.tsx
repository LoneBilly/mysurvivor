import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, GitBranch, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { showError } from '@/utils/toast';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface PatchNote {
  id: number;
  title: string;
  created_at: string;
  changes: PatchNoteChange[];
}

interface PatchNoteChange {
  id: number;
  patch_note_id: number;
  change_type: 'Ajout' | 'Modification' | 'Suppression';
  entity_type: string;
  entity_name: string;
  description: string | null;
}

const changeTypeMap = {
  Ajout: { label: 'Ajouts', styles: 'border-green-500/50 bg-green-500/10 text-green-300', icon: <CheckCircle className="w-5 h-5 text-green-400" /> },
  Modification: { label: 'Modifications', styles: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300', icon: <AlertTriangle className="w-5 h-5 text-yellow-400" /> },
  Suppression: { label: 'Suppressions', styles: 'border-red-500/50 bg-red-500/10 text-red-300', icon: <XCircle className="w-5 h-5 text-red-400" /> },
};

const PatchnoteModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      const { data: notesData, error: notesError } = await supabase
        .from('patch_notes')
        .select('*, patch_note_changes(*)')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (notesError) {
        showError("Erreur de chargement des patchnotes.");
      } else {
        const formattedData = (notesData || []).map(note => ({
          ...note,
          changes: note.patch_note_changes || [],
        }));
        setPatchNotes(formattedData);
      }
      setLoading(false);
    };

    fetchData();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-center gap-3">
            <GitBranch className="w-7 h-7 text-white" />
            <DialogTitle className="text-2xl font-bold text-center text-white">Patchnotes</DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto no-scrollbar p-4">
          {loading ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>
          ) : patchNotes.length === 0 ? (
            <div className="text-center text-gray-400 h-full flex items-center justify-center">Aucun patchnote disponible.</div>
          ) : (
            <Accordion type="single" collapsible defaultValue={`item-${patchNotes[0].id}`}>
              {patchNotes.map(note => (
                <AccordionItem key={note.id} value={`item-${note.id}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="text-left">
                      <h3 className="text-lg font-bold">{new Date(note.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                      <p className="text-sm text-gray-300">{note.title}</p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 bg-black/20 rounded-b-lg">
                    <div className="space-y-6">
                      {Object.keys(changeTypeMap).map(type => {
                        const key = type as keyof typeof changeTypeMap;
                        const changesOfType = note.changes.filter(c => c.change_type === key);
                        if (changesOfType.length === 0) return null;
                        const displayInfo = changeTypeMap[key];
                        return (
                          <div key={type}>
                            <h4 className={cn("text-xl font-bold mb-3 flex items-center gap-2", displayInfo.styles.replace('bg-', 'text-').replace('/10', ''))}>
                              {displayInfo.icon} {displayInfo.label}
                            </h4>
                            <div className="space-y-3">
                              {changesOfType.map(change => (
                                <div key={change.id} className={cn("p-3 rounded-lg border", displayInfo.styles)}>
                                  <span className="text-xs font-semibold uppercase bg-gray-500/20 px-2 py-1 rounded-full">{change.entity_type}</span>
                                  <p className="font-bold mt-2">{change.entity_name}</p>
                                  {change.description && (
                                    <div className="prose prose-sm prose-invert text-gray-300 mt-1">
                                      <Markdown remarkPlugins={[remarkGfm]}>{change.description}</Markdown>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PatchnoteModal;