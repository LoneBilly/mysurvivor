import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, ArrowLeft, Save, Trash2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import ActionModal from '../ActionModal';

interface PatchNote {
  id: number;
  version: string;
  title: string;
  content: string | null;
  created_at: string;
}

const PatchNotesManager = () => {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<PatchNote | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const isMobile = useIsMobile();

  const fetchPatchNotes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('patch_notes').select('*').order('created_at', { ascending: false });
    if (error) showError("Impossible de charger les patch-notes.");
    else setPatchNotes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPatchNotes();
  }, [fetchPatchNotes]);

  const handleSelectNote = (note: PatchNote) => {
    setSelectedNote(note);
    setIsCreating(false);
  };

  const handleCreateNew = () => {
    setSelectedNote({ id: 0, version: '', title: '', content: '', created_at: new Date().toISOString() });
    setIsCreating(true);
  };

  const handleBack = () => {
    setSelectedNote(null);
    setIsCreating(false);
  };

  const handleSave = async () => {
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
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Patch-note sauvegardé !");
      fetchPatchNotes();
      setSelectedNote(data as PatchNote);
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNote || isCreating) return;
    const { error } = await supabase.from('patch_notes').delete().eq('id', selectedNote.id);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Patch-note supprimé !");
      fetchPatchNotes();
      handleBack();
    }
    setIsDeleteModalOpen(false);
  };

  const EditorView = () => (
    <div className="p-4 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleBack}><ArrowLeft className="w-5 h-5" /></Button>
          <h3 className="text-xl font-bold">{isCreating ? "Nouveau Patch-Note" : "Modifier le Patch-Note"}</h3>
        </div>
        <div className="flex gap-2">
          {!isCreating && (
            <Button variant="destructive" size="icon" onClick={() => setIsDeleteModalOpen(true)}><Trash2 className="w-4 h-4" /></Button>
          )}
          <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" />Sauvegarder</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input placeholder="Version (ex: 1.0.1)" value={selectedNote?.version || ''} onChange={(e) => setSelectedNote(p => p ? {...p, version: e.target.value} : null)} />
        <Input placeholder="Titre" value={selectedNote?.title || ''} onChange={(e) => setSelectedNote(p => p ? {...p, title: e.target.value} : null)} />
      </div>
      <Textarea
        placeholder="Contenu du patch-note (Markdown supporté)..."
        value={selectedNote?.content || ''}
        onChange={(e) => setSelectedNote(p => p ? {...p, content: e.target.value} : null)}
        className="flex-grow resize-none"
      />
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
          { label: "Supprimer", onClick: handleDelete, variant: "destructive" },
          { label: "Annuler", onClick: () => setIsDeleteModalOpen(false), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default PatchNotesManager;