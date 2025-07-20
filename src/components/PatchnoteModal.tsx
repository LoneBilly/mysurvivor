import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, BookText, Plus, Pencil, Trash2 } from 'lucide-react';
import { showError } from '@/utils/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PatchNote {
  id: number;
  version: string;
  title: string;
  created_at: string;
}

interface PatchNoteChange {
  id: number;
  patch_note_id: number;
  change_type: 'Ajout' | 'Modification' | 'Suppression';
  entity_type: string;
  entity_name: string;
  description: string | null;
}

const changeTypeStyles = {
  'Ajout': { icon: Plus, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  'Modification': { icon: Pencil, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  'Suppression': { icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
};

const PatchnoteModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [changes, setChanges] = useState<PatchNoteChange[]>([]);
  const [selectedPatchId, setSelectedPatchId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      const { data: patchesData, error: patchesError } = await supabase.from('patch_notes').select('*').order('created_at', { ascending: false });
      const { data: changesData, error: changesError } = await supabase.from('patch_note_changes').select('*');
      
      if (patchesError || changesError) {
        showError("Erreur de chargement des patch notes.");
      } else {
        setPatchNotes(patchesData || []);
        setChanges(changesData || []);
        if (patchesData && patchesData.length > 0) {
          setSelectedPatchId(String(patchesData[0].id));
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [isOpen]);

  const selectedPatch = patchNotes.find(p => String(p.id) === selectedPatchId);
  const filteredChanges = changes.filter(c => String(c.patch_note_id) === selectedPatchId);
  const groupedChanges = filteredChanges.reduce((acc, change) => {
    (acc[change.change_type] = acc[change.change_type] || []).push(change);
    return acc;
  }, {} as Record<string, PatchNoteChange[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full h-[80vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col">
        <DialogHeader className="text-center flex-shrink-0">
          <BookText className="w-10 h-10 mx-auto text-white mb-2" />
          <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Patch Notes</DialogTitle>
          <DialogDescription>Découvrez les dernières mises à jour du jeu.</DialogDescription>
        </DialogHeader>
        <div className="my-4 flex-shrink-0">
          <Select value={selectedPatchId} onValueChange={setSelectedPatchId}>
            <SelectTrigger className="w-full bg-slate-700/50 border-slate-600">
              <SelectValue placeholder="Sélectionner une version..." />
            </SelectTrigger>
            <SelectContent>
              {patchNotes.map(patch => (
                <SelectItem key={patch.id} value={String(patch.id)}>
                  {patch.version} - {patch.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-grow overflow-y-auto no-scrollbar pr-2">
          {loading ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : selectedPatch ? (
            <div className="space-y-6">
              {Object.entries(changeTypeStyles).map(([type, style]) => {
                const changesForType = groupedChanges[type as keyof typeof changeTypeStyles];
                if (!changesForType || changesForType.length === 0) return null;
                const { icon: Icon, color, bg, border } = style;
                return (
                  <div key={type}>
                    <h3 className={`text-xl font-bold flex items-center gap-2 mb-3 ${color}`}><Icon className="w-5 h-5" />{type}s</h3>
                    <div className="space-y-3">
                      {changesForType.map(change => (
                        <div key={change.id} className={`p-3 rounded-lg border ${bg} ${border}`}>
                          <p><span className="font-semibold bg-gray-700/50 px-2 py-0.5 rounded-md text-xs mr-2">{change.entity_type}</span><strong className="text-white">{change.entity_name}</strong></p>
                          {change.description && <p className="text-gray-300 mt-1 text-sm">{change.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 pt-10">Aucun patch note disponible.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PatchnoteModal;