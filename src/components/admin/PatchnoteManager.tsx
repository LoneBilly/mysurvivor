import { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, PlusCircle, Edit, Trash2, ArrowLeft, GitBranch, FileText, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import ActionModal from '../ActionModal';
import { Label } from '@/components/ui/label';
import MarkdownToolbar from './MarkdownToolbar';
import { cn } from '@/lib/utils';

interface PatchNote {
  id: number;
  title: string;
  created_at: string;
}

interface PatchNoteChange {
  id: number;
  patch_note_id: number;
  change_type: 'ajout' | 'modification' | 'suppression';
  entity_type: string;
  entity_name: string;
  description: string | null;
}

const changeTypeMap = {
  ajout: { label: 'Ajout', styles: 'border-green-500/50 bg-green-500/10 text-green-300', icon: <CheckCircle className="w-5 h-5 text-green-400" /> },
  modification: { label: 'Modification', styles: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300', icon: <AlertTriangle className="w-5 h-5 text-yellow-400" /> },
  suppression: { label: 'Suppression', styles: 'border-red-500/50 bg-red-500/10 text-red-300', icon: <XCircle className="w-5 h-5 text-red-400" /> },
};

const PatchnoteManager = () => {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [changes, setChanges] = useState<PatchNoteChange[]>([]);
  const [selectedPatchNote, setSelectedPatchNote] = useState<PatchNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Partial<PatchNote> | null>(null);
  
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [editingChange, setEditingChange] = useState<Partial<PatchNoteChange> | null>(null);
  const changeTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'note' | 'change'; item: PatchNote | PatchNoteChange | null }>({ isOpen: false, type: 'note', item: null });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: notesData, error: notesError } = await supabase.from('patch_notes').select('*').order('created_at', { ascending: false });
      if (notesError) throw notesError;
      
      const { data: changesData, error: changesError } = await supabase.from('patch_note_changes').select('*');
      if (changesError) throw changesError;

      setPatchNotes(notesData || []);
      setChanges(changesData || []);
    } catch (error: any) {
      showError("Erreur de chargement des patchnotes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editingNote.title?.trim()) return;

    setIsSubmitting(true);
    try {
      const { id, ...dataToSave } = editingNote;
      if (id) {
        const { data: updatedNote, error } = await supabase.from('patch_notes').update(dataToSave).eq('id', id).select().single();
        if (error) throw error;
        setPatchNotes(prev => prev.map(p => p.id === id ? updatedNote : p));
        showSuccess(`Patchnote mis à jour.`);
      } else {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const { data: existing, error: checkError } = await supabase.from('patch_notes').select('id').gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString());
        if (checkError) throw checkError;
        if (existing && existing.length > 0) {
          showError("Un patchnote pour aujourd'hui existe déjà.");
          setIsSubmitting(false);
          return;
        }

        const { data: newNote, error } = await supabase.from('patch_notes').insert(dataToSave).select().single();
        if (error) throw error;
        setPatchNotes(prev => [newNote, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setSelectedPatchNote(newNote);
        showSuccess(`Patchnote créé.`);
      }
      setIsNoteModalOpen(false);
      setEditingNote(null);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingChange || !editingChange.entity_name?.trim() || !selectedPatchNote) return;

    setIsSubmitting(true);
    try {
      const { id, ...dataToSave } = { ...editingChange, patch_note_id: selectedPatchNote.id };
      if (id) {
        const { data: updatedChange, error } = await supabase.from('patch_note_changes').update(dataToSave).eq('id', id).select().single();
        if (error) throw error;
        setChanges(prev => prev.map(c => c.id === id ? updatedChange : c));
        showSuccess(`Changement mis à jour.`);
      } else {
        const { data: newChange, error } = await supabase.from('patch_note_changes').insert(dataToSave).select().single();
        if (error) throw error;
        setChanges(prev => [...prev, newChange]);
        showSuccess(`Changement ajouté.`);
      }
      setIsChangeModalOpen(false);
      setEditingChange(null);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.item) return;
    setIsSubmitting(true);
    try {
      const fromTable = deleteModal.type === 'note' ? 'patch_notes' : 'patch_note_changes';
      const { error } = await supabase.from(fromTable).delete().eq('id', deleteModal.item.id);
      if (error) throw error;

      showSuccess(`${deleteModal.type === 'note' ? 'Patchnote' : 'Changement'} supprimé.`);
      
      if (deleteModal.type === 'note') {
        setPatchNotes(prev => prev.filter(p => p.id !== deleteModal.item!.id));
        if (selectedPatchNote?.id === deleteModal.item.id) {
          setSelectedPatchNote(null);
        }
      } else {
        setChanges(prev => prev.filter(c => c.id !== deleteModal.item!.id));
      }
      
      setDeleteModal({ isOpen: false, type: 'note', item: null });
    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (item: PatchNote | PatchNoteChange, type: 'note' | 'change') => {
    setDeleteModal({ isOpen: true, item, type });
  };

  const filteredChanges = changes.filter(c => c.patch_note_id === selectedPatchNote?.id);
  const groupedChanges = filteredChanges.reduce((acc, change) => {
    (acc[change.change_type] = acc[change.change_type] || []).push(change);
    return acc;
  }, {} as Record<string, PatchNoteChange[]>);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        <div className="md:col-span-1 h-full flex flex-col bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="p-4 border-b border-gray-700 flex-shrink-0 flex justify-between items-center">
            <h3 className="text-lg font-bold">Patchnotes</h3>
            <Button size="sm" onClick={() => { setEditingNote({ id: 0, title: '', created_at: '' }); setIsNoteModalOpen(true); }}><PlusCircle className="w-4 h-4 mr-2" />Créer</Button>
          </div>
          <div className="flex-grow overflow-y-auto no-scrollbar">
            {patchNotes.map(note => (
              <div key={note.id} onClick={() => setSelectedPatchNote(note)} className="cursor-pointer p-3 flex items-center justify-between border-b border-gray-700 hover:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <GitBranch className="w-5 h-5 text-gray-300" />
                  <div>
                    <p className="font-semibold truncate">{new Date(note.created_at).toLocaleDateString('fr-FR')}</p>
                    <p className="text-sm text-gray-400 truncate">{note.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="md:col-span-2 h-full flex flex-col bg-gray-800/50 border border-gray-700 rounded-lg">
          {selectedPatchNote ? (
            <>
              <div className="p-4 border-b border-gray-700 flex-shrink-0 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">{new Date(selectedPatchNote.created_at).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                  <p className="text-gray-400">{selectedPatchNote.title}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingNote(selectedPatchNote); setIsNoteModalOpen(true); }}><Edit className="w-4 h-4 mr-2" />Modifier</Button>
                  <Button size="sm" onClick={() => { setEditingChange({ change_type: 'ajout', entity_type: 'Fonctionnalité' }); setIsChangeModalOpen(true); }}><PlusCircle className="w-4 h-4 mr-2" />Ajouter</Button>
                </div>
              </div>
              <div className="flex-grow overflow-y-auto no-scrollbar p-4 space-y-6">
                {Object.keys(changeTypeMap).map(type => {
                  const key = type as keyof typeof changeTypeMap;
                  return groupedChanges[key] && (
                    <div key={type}>
                      <h4 className={cn("text-xl font-bold mb-3 flex items-center gap-2", changeTypeMap[key].styles.replace('bg-', 'text-').replace('/10', ''))}>
                        {changeTypeMap[key].icon} {changeTypeMap[key].label}s
                      </h4>
                      <div className="space-y-3">
                        {groupedChanges[key].map(change => (
                          <div key={change.id} className={cn("p-3 rounded-lg border", changeTypeMap[key].styles)}>
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-xs font-semibold uppercase bg-gray-500/20 px-2 py-1 rounded-full">{change.entity_type}</span>
                                <p className="font-bold mt-1">{change.entity_name}</p>
                                <div className="prose prose-sm prose-invert text-gray-300 mt-1">
                                  <p>{change.description}</p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => { setEditingChange(change); setIsChangeModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => openDeleteModal(change, 'change')}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Sélectionnez un patchnote pour voir les changements.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isNoteModalOpen} onOpenChange={(isOpen) => { setIsNoteModalOpen(isOpen); if (!isOpen) setEditingNote(null); }}>
        <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader><DialogTitle>{editingNote?.id ? 'Modifier' : 'Nouveau'} Patchnote</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveNote} className="py-4 space-y-4">
            <div><Label>Titre</Label><Input value={editingNote?.title || ''} onChange={(e) => setEditingNote(prev => prev ? {...prev, title: e.target.value} : null)} required disabled={isSubmitting} /></div>
            <DialogFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sauvegarder"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isChangeModalOpen} onOpenChange={(isOpen) => { setIsChangeModalOpen(isOpen); if (!isOpen) setEditingChange(null); }}>
        <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader><DialogTitle>{editingChange?.id ? 'Modifier' : 'Nouveau'} Changement</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveChange} className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Type de changement</Label><select value={editingChange?.change_type || 'ajout'} onChange={(e) => setEditingChange(prev => prev ? {...prev, change_type: e.target.value as any} : null)} className="w-full p-2 bg-gray-800 border border-gray-600 rounded" disabled={isSubmitting}>{Object.entries(changeTypeMap).map(([value, {label}]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div><Label>Type d'entité</Label><select value={editingChange?.entity_type || 'Fonctionnalité'} onChange={(e) => setEditingChange(prev => prev ? {...prev, entity_type: e.target.value} : null)} className="w-full p-2 bg-gray-800 border border-gray-600 rounded" disabled={isSubmitting}>{['Fonctionnalité', 'Item', 'Bâtiment', 'Zone', 'Correction', 'Équilibrage'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            </div>
            <div><Label>Nom de l'entité</Label><Input value={editingChange?.entity_name || ''} onChange={(e) => setEditingChange(prev => prev ? {...prev, entity_name: e.target.value} : null)} required disabled={isSubmitting} /></div>
            <div><Label>Description</Label><Textarea value={editingChange?.description || ''} onChange={(e) => setEditingChange(prev => prev ? {...prev, description: e.target.value} : null)} rows={5} disabled={isSubmitting} /></div>
            <DialogFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sauvegarder"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: 'note', item: null })}
        title={`Supprimer ${deleteModal.type === 'note' ? 'le patchnote' : 'le changement'}`}
        description={`Êtes-vous sûr de vouloir supprimer "${deleteModal.item?.title || (deleteModal.item as PatchNoteChange)?.entity_name}" ?`}
        actions={[{ label: "Supprimer", onClick: handleDelete, variant: "destructive", disabled: isSubmitting }, { label: "Annuler", onClick: () => setDeleteModal({ isOpen: false, type: 'note', item: null }), variant: "secondary" }]}
      />
    </>
  );
};

export default PatchnoteManager;