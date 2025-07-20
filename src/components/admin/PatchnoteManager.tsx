import { useState, useEffect, useCallback, FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, PlusCircle, Edit, Trash2, ArrowLeft, BookText, Plus, Pencil, Save } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import ActionModal from '../ActionModal';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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

const PatchnoteManager = () => {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [changes, setChanges] = useState<PatchNoteChange[]>([]);
  const [selectedPatch, setSelectedPatch] = useState<PatchNote | null>(null);
  const [loading, setLoading] = useState(true);

  const [isPatchModalOpen, setIsPatchModalOpen] = useState(false);
  const [editingPatch, setEditingPatch] = useState<PatchNote | null>(null);

  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [editingChange, setEditingChange] = useState<Partial<PatchNoteChange> | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'patch' | 'change'; item: PatchNote | PatchNoteChange | null }>({ isOpen: false, type: 'patch', item: null });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: patchesData, error: patchesError } = await supabase.from('patch_notes').select('*').order('created_at', { ascending: false });
    const { data: changesData, error: changesError } = await supabase.from('patch_note_changes').select('*');
    
    if (patchesError || changesError) {
      showError("Erreur de chargement des données.");
    } else {
      setPatchNotes(patchesData || []);
      setChanges(changesData || []);
      if (selectedPatch) {
        setSelectedPatch(patchesData.find(p => p.id === selectedPatch.id) || null);
      }
    }
    setLoading(false);
  }, [selectedPatch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSavePatch = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPatch || !editingPatch.title.trim() || !editingPatch.version.trim()) return;

    const { id, ...dataToSave } = editingPatch;
    const promise = id ? supabase.from('patch_notes').update(dataToSave).eq('id', id) : supabase.from('patch_notes').insert(dataToSave);
    
    const { error } = await promise;
    if (error) showError(error.message);
    else {
      showSuccess(`Patch note ${id ? 'mis à jour' : 'créé'}.`);
      setIsPatchModalOpen(false);
      setEditingPatch(null);
      fetchData();
    }
  };

  const handleSaveChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingChange || !editingChange.entity_name?.trim() || !selectedPatch) return;

    const { id, ...dataToSave } = { ...editingChange, patch_note_id: selectedPatch.id };
    const promise = id ? supabase.from('patch_note_changes').update(dataToSave).eq('id', id) : supabase.from('patch_note_changes').insert(dataToSave);
    
    const { error } = await promise;
    if (error) showError(error.message);
    else {
      showSuccess(`Changement ${id ? 'mis à jour' : 'ajouté'}.`);
      setIsChangeModalOpen(false);
      setEditingChange(null);
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.item) return;
    const fromTable = deleteModal.type === 'patch' ? 'patch_notes' : 'patch_note_changes';
    const { error } = await supabase.from(fromTable).delete().eq('id', deleteModal.item.id);
    
    if (error) showError(error.message);
    else {
      showSuccess(`${deleteModal.type === 'patch' ? 'Patch note' : 'Changement'} supprimé.`);
      if (deleteModal.type === 'patch' && selectedPatch?.id === deleteModal.item.id) {
        setSelectedPatch(null);
      }
      setDeleteModal({ isOpen: false, type: 'patch', item: null });
      fetchData();
    }
  };

  const openDeleteModal = (item: PatchNote | PatchNoteChange, type: 'patch' | 'change') => {
    setDeleteModal({ isOpen: true, item, type });
  };

  const filteredChanges = changes.filter(c => c.patch_note_id === selectedPatch?.id);
  const groupedChanges = filteredChanges.reduce((acc, change) => {
    (acc[change.change_type] = acc[change.change_type] || []).push(change);
    return acc;
  }, {} as Record<string, PatchNoteChange[]>);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        <div className="md:col-span-1 h-full flex flex-col bg-gray-800/50 border-gray-700 rounded-lg">
          <div className="p-4 border-b border-gray-700 flex-shrink-0 flex justify-between items-center">
            <h3 className="text-lg font-bold">Versions</h3>
            <Button size="sm" onClick={() => { setEditingPatch({ id: 0, version: '', title: '', created_at: '' }); setIsPatchModalOpen(true); }}><PlusCircle className="w-4 h-4 mr-2" />Créer</Button>
          </div>
          <div className="flex-grow overflow-y-auto no-scrollbar">
            {patchNotes.map(patch => (
              <div key={patch.id} onClick={() => setSelectedPatch(patch)} className="cursor-pointer p-3 flex items-center justify-between border-b border-gray-700 hover:bg-gray-800/50">
                <div>
                  <p className="font-bold">{patch.version}</p>
                  <p className="text-sm text-gray-400">{patch.title}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingPatch(patch); setIsPatchModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
        </div>
        <div className="md:col-span-2 h-full overflow-y-auto no-scrollbar bg-gray-800/50 border-gray-700 rounded-lg p-4">
          {selectedPatch ? (
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedPatch.version} - {selectedPatch.title}</h2>
                  <p className="text-gray-400">Publié le {new Date(selectedPatch.created_at).toLocaleDateString()}</p>
                </div>
                <Button onClick={() => { setEditingChange({ change_type: 'Ajout', entity_type: 'Système' }); setIsChangeModalOpen(true); }}><Plus className="w-4 h-4 mr-2" />Ajouter un changement</Button>
              </div>
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
                          <div key={change.id} className={`p-3 rounded-lg border ${bg} ${border} flex justify-between items-start`}>
                            <div>
                              <p><span className="font-semibold bg-gray-700/50 px-2 py-0.5 rounded-md text-xs mr-2">{change.entity_type}</span><strong className="text-white">{change.entity_name}</strong></p>
                              {change.description && <p className="text-gray-300 mt-1 text-sm">{change.description}</p>}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingChange(change); setIsChangeModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => openDeleteModal(change, 'change')}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Sélectionnez une version pour voir les détails.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isPatchModalOpen} onOpenChange={(isOpen) => { setIsPatchModalOpen(isOpen); if (!isOpen) setEditingPatch(null); }}>
        <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader><DialogTitle>{editingPatch?.id ? 'Modifier' : 'Nouveau'} Patch Note</DialogTitle></DialogHeader>
          <form onSubmit={handleSavePatch} className="py-4 space-y-4">
            <div><Label>Version (ex: v1.0.0)</Label><Input value={editingPatch?.version || ''} onChange={(e) => setEditingPatch(prev => prev ? {...prev, version: e.target.value} : null)} required /></div>
            <div><Label>Titre</Label><Input value={editingPatch?.title || ''} onChange={(e) => setEditingPatch(prev => prev ? {...prev, title: e.target.value} : null)} required /></div>
            <DialogFooter><Button type="submit">Sauvegarder</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isChangeModalOpen} onOpenChange={(isOpen) => { setIsChangeModalOpen(isOpen); if (!isOpen) setEditingChange(null); }}>
        <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader><DialogTitle>{editingChange?.id ? 'Modifier' : 'Nouveau'} Changement</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveChange} className="py-4 space-y-4">
            <div><Label>Type de changement</Label><select value={editingChange?.change_type || 'Ajout'} onChange={(e) => setEditingChange(prev => prev ? {...prev, change_type: e.target.value as any} : null)} className="w-full p-2 bg-gray-800 border border-gray-600 rounded"><option>Ajout</option><option>Modification</option><option>Suppression</option></select></div>
            <div><Label>Type d'entité</Label><Input value={editingChange?.entity_type || ''} onChange={(e) => setEditingChange(prev => prev ? {...prev, entity_type: e.target.value} : null)} placeholder="Système, Objet, Bâtiment..." required /></div>
            <div><Label>Nom de l'entité</Label><Input value={editingChange?.entity_name || ''} onChange={(e) => setEditingChange(prev => prev ? {...prev, entity_name: e.target.value} : null)} required /></div>
            <div><Label>Description</Label><Textarea value={editingChange?.description || ''} onChange={(e) => setEditingChange(prev => prev ? {...prev, description: e.target.value} : null)} /></div>
            <DialogFooter><Button type="submit">Sauvegarder</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: 'patch', item: null })}
        title={`Supprimer ${deleteModal.type === 'patch' ? 'le patch note' : 'le changement'}`}
        description={`Êtes-vous sûr de vouloir supprimer "${deleteModal.type === 'patch' ? (deleteModal.item as PatchNote)?.version : (deleteModal.item as PatchNoteChange)?.entity_name}" ?`}
        actions={[{ label: "Supprimer", onClick: handleDelete, variant: "destructive" }, { label: "Annuler", onClick: () => setDeleteModal({ isOpen: false, type: 'patch', item: null }), variant: "secondary" }]}
      />
    </>
  );
};

export default PatchnoteManager;