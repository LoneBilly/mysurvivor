import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2, GitBranch, Send, EyeOff, CheckCircle, AlertTriangle, XCircle, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type PatchNote = {
  id: number;
  title: string;
  created_at: string;
  is_published: boolean;
};

type PatchNoteChange = {
  id: number;
  patch_note_id: number;
  change_type: 'ADDED' | 'MODIFIED' | 'REMOVED' | 'FIXED' | 'IMPROVED';
  entity_type: string;
  entity_name: string;
  description: string;
};

const changeTypeMap = {
  ADDED: {
    title: 'Ajouts',
    icon: CheckCircle,
    color: 'text-green-300',
    borderColor: 'border-green-500/50',
    bgColor: 'bg-green-500/10',
    iconColor: 'text-green-400',
  },
  MODIFIED: {
    title: 'Modifications',
    icon: AlertTriangle,
    color: 'text-yellow-300',
    borderColor: 'border-yellow-500/50',
    bgColor: 'bg-yellow-500/10',
    iconColor: 'text-yellow-400',
  },
  REMOVED: {
    title: 'Suppressions',
    icon: Trash2,
    color: 'text-red-300',
    borderColor: 'border-red-500/50',
    bgColor: 'bg-red-500/10',
    iconColor: 'text-red-400',
  },
  FIXED: {
    title: 'Correctifs',
    icon: XCircle,
    color: 'text-blue-300',
    borderColor: 'border-blue-500/50',
    bgColor: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
  IMPROVED: {
    title: 'Améliorations',
    icon: GitBranch,
    color: 'text-purple-300',
    borderColor: 'border-purple-500/50',
    bgColor: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
  },
};

const entityTypes = ['Général', 'Item', 'Zone', 'Bâtiment', 'UI', 'Système', 'Événement', 'Recette'];

const PatchnoteManager = () => {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [selectedPatchNote, setSelectedPatchNote] = useState<PatchNote | null>(null);
  const [changes, setChanges] = useState<PatchNoteChange[]>([]);
  const [isPatchNoteModalOpen, setIsPatchNoteModalOpen] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [currentPatchNote, setCurrentPatchNote] = useState<Partial<PatchNote>>({});
  const [currentChange, setCurrentChange] = useState<Partial<PatchNoteChange>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('patch_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Erreur lors de la récupération des patchnotes.');
        console.error(error);
      } else {
        setPatchNotes(data || []);
        if (data && data.length > 0) {
          setSelectedPatchNote(data[0]);
        }
      }
      setIsLoading(false);
    };
    fetchInitialData();
  }, []);

  const fetchChanges = useCallback(async () => {
    if (!selectedPatchNote) {
      setChanges([]);
      return;
    }
    const { data, error } = await supabase
      .from('patch_note_changes')
      .select('*')
      .eq('patch_note_id', selectedPatchNote.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erreur lors de la récupération des changements.');
      console.error(error);
    } else {
      setChanges(data || []);
    }
  }, [selectedPatchNote]);

  useEffect(() => {
    fetchChanges();
  }, [fetchChanges]);

  const handleSavePatchNote = async () => {
    const { id, ...patchNoteData } = currentPatchNote;
    const query = id
      ? supabase.from('patch_notes').update(patchNoteData).eq('id', id).select().single()
      : supabase.from('patch_notes').insert(patchNoteData as any).select().single();

    const { data: savedPatchNote, error } = await query;

    if (error) {
      toast.error('Erreur lors de la sauvegarde du patchnote.');
    } else if (savedPatchNote) {
      toast.success('Patchnote sauvegardé.');
      setIsPatchNoteModalOpen(false);
      if (id) {
        setPatchNotes(prev => prev.map(pn => (pn.id === id ? savedPatchNote : pn)));
        if (selectedPatchNote?.id === id) {
          setSelectedPatchNote(savedPatchNote);
        }
      } else {
        setPatchNotes(prev => [savedPatchNote, ...prev]);
        setSelectedPatchNote(savedPatchNote);
      }
    }
  };

  const handleDeletePatchNote = async (patchNoteId: number) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce patchnote et tous ses changements ?')) {
      await supabase.from('patch_note_changes').delete().eq('patch_note_id', patchNoteId);
      const { error } = await supabase.from('patch_notes').delete().eq('id', patchNoteId);
      if (error) {
        toast.error('Erreur lors de la suppression du patchnote.');
      } else {
        toast.success('Patchnote supprimé.');
        const newPatchNotes = patchNotes.filter(p => p.id !== patchNoteId);
        setPatchNotes(newPatchNotes);
        if (selectedPatchNote?.id === patchNoteId) {
          setSelectedPatchNote(newPatchNotes.length > 0 ? newPatchNotes[0] : null);
        }
      }
    }
  };

  const handleTogglePublish = async (patchNote: PatchNote) => {
    const newStatus = !patchNote.is_published;
    const { data: updatedPatchNote, error } = await supabase
      .from('patch_notes')
      .update({ is_published: newStatus })
      .eq('id', patchNote.id)
      .select()
      .single();

    if (error) {
      toast.error('Erreur lors du changement de statut.');
    } else if (updatedPatchNote) {
      toast.success(`Patchnote ${newStatus ? 'publié' : 'dépublié'}.`);
      setPatchNotes(prev => prev.map(pn => (pn.id === patchNote.id ? updatedPatchNote : pn)));
      if (selectedPatchNote?.id === patchNote.id) {
        setSelectedPatchNote(updatedPatchNote);
      }
    }
  };

  const handleSaveChange = async () => {
    if (!selectedPatchNote) return;
    const { id, ...changeData } = { ...currentChange, patch_note_id: selectedPatchNote.id };
    const query = id
      ? supabase.from('patch_note_changes').update(changeData).eq('id', id).select().single()
      : supabase.from('patch_note_changes').insert(changeData as any).select().single();

    const { data: savedChange, error } = await query;

    if (error) {
      toast.error('Erreur lors de la sauvegarde du changement.');
    } else if (savedChange) {
      toast.success('Changement sauvegardé.');
      setIsChangeModalOpen(false);
      if (id) {
        setChanges(prev => prev.map(c => (c.id === id ? savedChange : c)));
      } else {
        setChanges(prev => [savedChange, ...prev]);
      }
    }
  };

  const handleDeleteChange = async (changeId: number) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce changement ?')) {
      const { error } = await supabase.from('patch_note_changes').delete().eq('id', changeId);
      if (error) {
        toast.error('Erreur lors de la suppression du changement.');
      } else {
        toast.success('Changement supprimé.');
        setChanges(prev => prev.filter(c => c.id !== changeId));
      }
    }
  };

  const groupedChanges = changes.reduce((acc, change) => {
    (acc[change.change_type] = acc[change.change_type] || []).push(change);
    return acc;
  }, {} as Record<string, PatchNoteChange[]>);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p>Chargement...</p></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
      <div className="md:col-span-1 h-full flex flex-col bg-gray-800/50 border border-gray-700 rounded-lg min-h-0">
        <div className="p-4 border-b border-gray-700 flex-shrink-0 flex justify-between items-center">
          <h3 className="text-lg font-bold">Versions</h3>
          <Button onClick={() => { setCurrentPatchNote({ title: '', is_published: false }); setIsPatchNoteModalOpen(true); }}>
            <PlusCircle className="w-4 h-4 mr-2" />Créer
          </Button>
        </div>
        <div className="flex-grow overflow-y-auto no-scrollbar">
          {patchNotes.map(pn => (
            <div key={pn.id} className={`p-3 border-b border-gray-700 hover:bg-gray-800/50 ${selectedPatchNote?.id === pn.id ? 'bg-slate-700' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer flex-grow min-w-0" onClick={() => setSelectedPatchNote(pn)}>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${pn.is_published ? 'bg-green-400' : 'bg-yellow-400'}`} title={pn.is_published ? 'Publié' : 'Brouillon'}></div>
                  <GitBranch className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  <div className="truncate">
                    <p className="font-semibold truncate">{new Date(pn.created_at).toLocaleDateString('fr-FR')}</p>
                    <p className="text-sm text-gray-400 truncate">{pn.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <Button size="icon" variant={pn.is_published ? "secondary" : "default"} onClick={() => handleTogglePublish(pn)} title={pn.is_published ? 'Dépublier' : 'Publier'}>
                    {pn.is_published ? <EyeOff className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setCurrentPatchNote(pn); setIsPatchNoteModalOpen(true); }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDeletePatchNote(pn.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-2 h-full flex flex-col bg-gray-800/50 border border-gray-700 rounded-lg min-h-0">
        {selectedPatchNote ? (
          <>
            <div className="p-4 border-b border-gray-700 flex-shrink-0 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">{new Date(selectedPatchNote.created_at).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                <p className="text-gray-400">{selectedPatchNote.title}</p>
              </div>
              <Button onClick={() => { setCurrentChange({ change_type: 'ADDED', entity_type: 'Général' }); setIsChangeModalOpen(true); }}>
                <PlusCircle className="w-4 h-4 mr-2" />Ajouter un changement
              </Button>
            </div>
            <div className="flex-grow overflow-y-auto no-scrollbar p-4 space-y-6">
              {Object.keys(groupedChanges).length === 0 && <p className="text-gray-500 text-center mt-8">Aucun changement pour cette version.</p>}
              {Object.keys(changeTypeMap).map(type => {
                const key = type as keyof typeof changeTypeMap;
                if (groupedChanges[key] && groupedChanges[key].length > 0) {
                  const { title, icon: Icon, color, borderColor, bgColor, iconColor } = changeTypeMap[key];
                  return (
                    <div key={key}>
                      <h4 className={`text-xl font-bold mb-3 flex items-center gap-2 ${borderColor} ${color}`}>
                        <Icon className={`w-5 h-5 ${iconColor}`} /> {title}
                      </h4>
                      <div className="space-y-3">
                        {groupedChanges[key].map(change => (
                          <div key={change.id} className={`p-3 rounded-lg border ${borderColor} ${bgColor} ${color}`}>
                            <div className="flex justify-between items-start">
                              <div className="min-w-0">
                                <span className="text-xs font-semibold uppercase bg-gray-500/20 px-2 py-1 rounded-full">{change.entity_type}</span>
                                <p className="font-bold mt-1 truncate">{change.entity_name}</p>
                                <div className="prose prose-sm prose-invert text-gray-300 mt-1">
                                  <ReactMarkdown>{change.description}</ReactMarkdown>
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0 ml-2">
                                <Button size="icon" variant="ghost" onClick={() => { setCurrentChange(change); setIsChangeModalOpen(true); }}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => handleDeleteChange(change.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Sélectionnez une version pour voir les détails.</p>
          </div>
        )}
      </div>

      <Dialog open={isPatchNoteModalOpen} onOpenChange={setIsPatchNoteModalOpen}>
        <DialogContent className="sm:max-w-md bg-gray-800/90 border-gray-700 text-white backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{currentPatchNote.id ? 'Modifier' : 'Créer'} un patchnote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="patchnote-title" className="block text-sm font-medium text-gray-300 mb-1">
                Titre du patchnote
              </label>
              <Input
                id="patchnote-title"
                placeholder="Ex: Mise à jour v1.2.3"
                value={currentPatchNote.title || ''}
                onChange={e => setCurrentPatchNote({ ...currentPatchNote, title: e.target.value })}
                className="bg-gray-900/70 border-gray-700"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPatchNoteModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSavePatchNote}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isChangeModalOpen} onOpenChange={setIsChangeModalOpen}>
        <DialogContent className="sm:max-w-lg bg-gray-800/90 border-gray-700 text-white backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {currentChange.id ? 'Modifier un changement' : 'Ajouter un changement'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="change-type" className="block text-sm font-medium text-gray-300 mb-1">
                  Type de changement
                </label>
                <div className="relative">
                  <select
                    id="change-type"
                    value={currentChange.change_type || 'ADDED'}
                    onChange={(e) => setCurrentChange({ ...currentChange, change_type: e.target.value as PatchNoteChange['change_type'] })}
                    className="w-full appearance-none bg-gray-900/70 border border-gray-700 rounded-md h-10 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(changeTypeMap).map(([key, { title }]) => (
                      <option key={key} value={key}>{title}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label htmlFor="entity-type" className="block text-sm font-medium text-gray-300 mb-1">
                  Type d'entité
                </label>
                <div className="relative">
                  <select
                    id="entity-type"
                    value={currentChange.entity_type || 'Général'}
                    onChange={(e) => setCurrentChange({ ...currentChange, entity_type: e.target.value })}
                    className="w-full appearance-none bg-gray-900/70 border border-gray-700 rounded-md h-10 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {entityTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="entity-name" className="block text-sm font-medium text-gray-300 mb-1">
                Nom de l'entité
              </label>
              <Input
                id="entity-name"
                placeholder="Ex: Hache en fer, Zone de départ..."
                value={currentChange.entity_name || ''}
                onChange={e => setCurrentChange({ ...currentChange, entity_name: e.target.value })}
                className="bg-gray-900/70 border-gray-700"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <Textarea
                id="description"
                placeholder="Décrivez le changement en détail. Le Markdown est supporté."
                value={currentChange.description || ''}
                onChange={e => setCurrentChange({ ...currentChange, description: e.target.value })}
                rows={6}
                className="bg-gray-900/70 border-gray-700"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangeModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveChange}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatchnoteManager;