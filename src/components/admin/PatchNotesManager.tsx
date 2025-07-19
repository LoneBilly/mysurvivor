import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, ArrowLeft, Save, Trash2, Edit, Plus } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import ActionModal from '../ActionModal';
import { Item } from '@/types/admin';

interface PatchNote {
  id: number;
  version: string;
  title: string;
  created_at: string;
}

interface PatchNoteChange {
  id: number;
  patch_note_id: number;
  change_type: 'ADDED' | 'MODIFIED' | 'REMOVED' | 'FIXED' | 'IMPROVED';
  entity_type: string;
  entity_name: string;
  description: string | null;
}

const ChangeTypeBadge = ({ type }: { type: PatchNoteChange['change_type'] }) => {
  const styles = {
    ADDED: 'bg-green-500/20 text-green-400 border-green-500/30',
    MODIFIED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    REMOVED: 'bg-red-500/20 text-red-400 border-red-500/30',
    FIXED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    IMPROVED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };
  return <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full border", styles[type])}>{type}</span>;
};

const PatchNotesManager = () => {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<PatchNote | null>(null);
  const [noteChanges, setNoteChanges] = useState<PatchNoteChange[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isChangeFormOpen, setIsChangeFormOpen] = useState(false);
  const [editingChange, setEditingChange] = useState<Partial<PatchNoteChange> | null>(null);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const isMobile = useIsMobile();

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    const [notesRes, itemsRes] = await Promise.all([
      supabase.from('patch_notes').select('*').order('created_at', { ascending: false }),
      supabase.from('items').select('name').order('name')
    ]);
    if (notesRes.error) showError("Impossible de charger les patch-notes.");
    else setPatchNotes(notesRes.data || []);
    if (itemsRes.error) showError("Impossible de charger les objets.");
    else setAllItems(itemsRes.data as Item[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const fetchChangesForNote = useCallback(async (noteId: number) => {
    const { data, error } = await supabase.from('patch_note_changes').select('*').eq('patch_note_id', noteId).order('created_at');
    if (error) showError("Impossible de charger les changements.");
    else setNoteChanges(data || []);
  }, []);

  useEffect(() => {
    if (selectedNote && !isCreating) {
      fetchChangesForNote(selectedNote.id);
    } else {
      setNoteChanges([]);
    }
  }, [selectedNote, isCreating, fetchChangesForNote]);

  const handleSelectNote = (note: PatchNote) => {
    setSelectedNote(note);
    setIsCreating(false);
  };

  const handleCreateNew = () => {
    setSelectedNote({ id: 0, version: '', title: '', created_at: new Date().toISOString() });
    setIsCreating(true);
  };

  const handleBack = () => {
    setSelectedNote(null);
    setIsCreating(false);
  };

  const handleSaveNote = async () => {
    if (!selectedNote) return;
    const { id, created_at, ...upsertData } = selectedNote;
    if (!upsertData.version.trim() || !upsertData.title.trim()) {
      showError("La version et le titre sont requis.");
      return;
    }
    const promise = isCreating
      ? supabase.from('patch_notes').insert(upsertData).select().single()
      : supabase.from('patch_notes').update(upsertData).eq('id', id).select().single();
    const { data, error } = await promise;
    if (error) showError(error.message);
    else {
      showSuccess("Patch-note sauvegardé !");
      fetchAllData();
      setSelectedNote(data as PatchNote);
      setIsCreating(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!selectedNote || isCreating) return;
    const { error } = await supabase.from('patch_notes').delete().eq('id', selectedNote.id);
    if (error) showError(error.message);
    else {
      showSuccess("Patch-note supprimé !");
      fetchAllData();
      handleBack();
    }
    setIsDeleteModalOpen(false);
  };

  const handleSaveChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChange || !selectedNote) return;
    const { id, ...upsertData } = { ...editingChange, patch_note_id: selectedNote.id };
    const promise = id
      ? supabase.from('patch_note_changes').update(upsertData).eq('id', id)
      : supabase.from('patch_note_changes').insert(upsertData);
    const { error } = await promise;
    if (error) showError(error.message);
    else {
      showSuccess("Changement sauvegardé.");
      fetchChangesForNote(selectedNote.id);
      setIsChangeFormOpen(false);
    }
  };

  const handleDeleteChange = async (changeId: number) => {
    const { error } = await supabase.from('patch_note_changes').delete().eq('id', changeId);
    if (error) showError(error.message);
    else {
      showSuccess("Changement supprimé.");
      if (selectedNote) fetchChangesForNote(selectedNote.id);
    }
  };

  const EditorView = () => (
    <div className="p-4 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleBack}><ArrowLeft className="w-5 h-5" /></Button>
          <h3 className="text-xl font-bold">{isCreating ? "Nouveau Patch-Note" : "Modifier le Patch-Note"}</h3>
        </div>
        <div className="flex gap-2">
          {!isCreating && <Button variant="destructive" size="icon" onClick={() => setIsDeleteModalOpen(true)}><Trash2 className="w-4 h-4" /></Button>}
          <Button onClick={handleSaveNote}><Save className="w-4 h-4 mr-2" />Sauvegarder</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input placeholder="Version (ex: 1.0.1)" value={selectedNote?.version || ''} onChange={(e) => setSelectedNote(p => p ? {...p, version: e.target.value} : null)} />
        <Input placeholder="Titre" value={selectedNote?.title || ''} onChange={(e) => setSelectedNote(p => p ? {...p, title: e.target.value} : null)} />
      </div>
      <div className="flex-grow flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold">Changements</h4>
          {!isCreating && <Button size="sm" onClick={() => { setEditingChange({ change_type: 'ADDED', entity_type: 'Item', entity_name: '' }); setIsChangeFormOpen(true); }}><Plus className="w-4 h-4 mr-2" />Ajouter</Button>}
        </div>
        <div className="flex-grow overflow-y-auto space-y-2 bg-gray-900/50 p-2 rounded-lg">
          {noteChanges.map(change => (
            <div key={change.id} className="flex items-center gap-2 p-2 bg-gray-800/50 rounded">
              <ChangeTypeBadge type={change.change_type} />
              <span className="font-semibold">{change.entity_name}</span>
              <span className="text-gray-400 text-sm truncate">{change.description}</span>
              <div className="ml-auto flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingChange(change); setIsChangeFormOpen(true); }}><Edit className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteChange(change.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const ListView = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700 flex justify-end">
        <Button onClick={handleCreateNew}><PlusCircle className="w-4 h-4 mr-2" />Nouveau</Button>
      </div>
      <div className="flex-grow overflow-y-auto">
        {loading ? <div className="flex justify-center items-center h-full"><Loader2 className="w-6 h-6 animate-spin" /></div>
        : patchNotes.map(note => (
          <div key={note.id} onClick={() => handleSelectNote(note)} className={cn("cursor-pointer p-3 border-b border-l-4 border-gray-700", selectedNote?.id === note.id ? "bg-blue-500/10 border-l-blue-500" : "border-l-transparent hover:bg-gray-800/50")}>
            <div className="flex justify-between items-center">
              <p className="font-bold">{note.title}</p>
              <span className="text-sm text-gray-400 font-mono bg-gray-700/50 px-2 py-0.5 rounded">{note.version}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{new Date(note.created_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className="h-full bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        {isMobile ? (
          selectedNote ? <EditorView /> : <ListView />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 h-full">
            <div className="md:col-span-1 border-r border-gray-700"><ListView /></div>
            <div className="md:col-span-2">
              {selectedNote ? <EditorView /> : <div className="flex items-center justify-center h-full text-gray-500"><p>Sélectionnez une note à modifier ou créez-en une nouvelle.</p></div>}
            </div>
          </div>
        )}
      </div>
      <ActionModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Supprimer le Patch-Note"
        description={`Êtes-vous sûr de vouloir supprimer "${selectedNote?.title}" ?`}
        actions={[
          { label: "Supprimer", onClick: handleDeleteNote, variant: "destructive" },
          { label: "Annuler", onClick: () => setIsDeleteModalOpen(false), variant: "secondary" },
        ]}
      />
      {isChangeFormOpen && editingChange && (
        <Dialog open={isChangeFormOpen} onOpenChange={setIsChangeFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingChange.id ? 'Modifier' : 'Ajouter'} un changement</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveChange} className="space-y-4">
              <div>
                <Label>Type de changement</Label>
                <select value={editingChange.change_type} onChange={(e) => setEditingChange(p => p ? {...p, change_type: e.target.value as any} : null)} className="w-full p-2 bg-gray-800 border border-gray-600 rounded">
                  <option value="ADDED">Ajout</option>
                  <option value="MODIFIED">Modification</option>
                  <option value="REMOVED">Suppression</option>
                  <option value="FIXED">Correction</option>
                  <option value="IMPROVED">Amélioration</option>
                </select>
              </div>
              <div>
                <Label>Type d'entité</Label>
                <select value={editingChange.entity_type} onChange={(e) => setEditingChange(p => p ? {...p, entity_type: e.target.value, entity_name: ''} : null)} className="w-full p-2 bg-gray-800 border border-gray-600 rounded">
                  <option value="Item">Objet</option>
                  <option value="Feature">Fonctionnalité</option>
                  <option value="Misc">Divers</option>
                </select>
              </div>
              <div>
                <Label>Nom</Label>
                {editingChange.entity_type === 'Item' ? (
                  <select value={editingChange.entity_name} onChange={(e) => setEditingChange(p => p ? {...p, entity_name: e.target.value} : null)} className="w-full p-2 bg-gray-800 border border-gray-600 rounded">
                    <option value="">Sélectionner un objet</option>
                    {allItems.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
                  </select>
                ) : (
                  <Input value={editingChange.entity_name} onChange={(e) => setEditingChange(p => p ? {...p, entity_name: e.target.value} : null)} required />
                )}
              </div>
              <div>
                <Label>Description (optionnel)</Label>
                <Textarea value={editingChange.description || ''} onChange={(e) => setEditingChange(p => p ? {...p, description: e.target.value} : null)} />
              </div>
              <DialogFooter>
                <Button type="submit">Sauvegarder</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default PatchNotesManager;