import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

// Types
type PatchNote = {
  id: number;
  title: string;
  created_at: string;
  is_published: boolean;
};

type PatchNoteChange = {
  id?: number;
  patch_note_id: number;
  change_type: string;
  entity_type: string;
  entity_name: string;
  description: string;
};

const PatchnoteManager = () => {
  const [patchnotes, setPatchnotes] = useState<PatchNote[]>([]);
  const [selectedPatchnote, setSelectedPatchnote] = useState<PatchNote | null>(null);
  const [changes, setChanges] = useState<PatchNoteChange[]>([]);
  
  const [isPatchnoteModalOpen, setIsPatchnoteModalOpen] = useState(false);
  const [editingPatchnote, setEditingPatchnote] = useState<PatchNote | null>(null);

  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [editingChange, setEditingChange] = useState<PatchNoteChange | null>(null);
  const [newChange, setNewChange] = useState<Partial<PatchNoteChange>>({});

  useEffect(() => {
    fetchPatchnotes();
  }, []);

  useEffect(() => {
    if (selectedPatchnote) {
      fetchChanges(selectedPatchnote.id);
    } else {
      setChanges([]);
    }
  }, [selectedPatchnote]);

  const fetchPatchnotes = async () => {
    const { data, error } = await supabase
      .from('patch_notes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error("Erreur lors de la récupération des patch notes.");
      console.error(error);
    } else {
      setPatchnotes(data);
    }
  };

  const fetchChanges = async (patchnoteId: number) => {
    const { data, error } = await supabase
      .from('patch_note_changes')
      .select('*')
      .eq('patch_note_id', patchnoteId)
      .order('id', { ascending: true });
    if (error) {
      toast.error("Erreur lors de la récupération des changements.");
      console.error(error);
    } else {
      setChanges(data);
    }
  };

  const handleSavePatchnote = async (e: FormEvent) => {
    e.preventDefault();
    const target = e.target as typeof e.target & { title: { value: string } };
    const title = target.title.value;
    if (!title) {
      toast.warning("Le titre est requis.");
      return;
    }

    const upsertData = { title };
    let query;
    if (editingPatchnote) {
      query = supabase.from('patch_notes').update(upsertData).eq('id', editingPatchnote.id);
    } else {
      query = supabase.from('patch_notes').insert(upsertData);
    }

    const { error } = await query;
    if (error) {
      toast.error("Erreur lors de la sauvegarde du patch note.");
      console.error(error);
    } else {
      toast.success(`Patch note ${editingPatchnote ? 'modifié' : 'créé'} avec succès.`);
      setIsPatchnoteModalOpen(false);
      setEditingPatchnote(null);
      fetchPatchnotes();
    }
  };

  const handlePublishPatchnote = async (patchnote: PatchNote) => {
    const { error } = await supabase
      .from('patch_notes')
      .update({ is_published: !patchnote.is_published })
      .eq('id', patchnote.id);

    if (error) {
      toast.error("Erreur lors du changement de statut de publication.");
    } else {
      toast.success(`Patch note ${patchnote.is_published ? 'dépublié' : 'publié'}.`);
      fetchPatchnotes();
      if (selectedPatchnote?.id === patchnote.id) {
        setSelectedPatchnote({ ...selectedPatchnote, is_published: !patchnote.is_published });
      }
    }
  };

  const handleSaveChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPatchnote) return;

    const changeData: Omit<PatchNoteChange, 'id'> = {
      patch_note_id: selectedPatchnote.id,
      change_type: newChange.change_type || '',
      entity_type: newChange.entity_type || '',
      entity_name: newChange.entity_name || '',
      description: newChange.description || '',
    };

    if (!changeData.change_type || !changeData.entity_type || !changeData.entity_name || !changeData.description) {
      toast.warning("Tous les champs sont requis.");
      return;
    }

    let query;
    if (editingChange) {
      query = supabase.from('patch_note_changes').update(changeData).eq('id', editingChange.id);
    } else {
      query = supabase.from('patch_note_changes').insert([changeData]);
    }

    const { error } = await query;
    if (error) {
      toast.error("Erreur lors de la sauvegarde du changement.", { description: error.message });
      console.error(error);
    } else {
      toast.success(`Changement ${editingChange ? 'modifié' : 'ajouté'} avec succès.`);
      setIsChangeModalOpen(false);
      setEditingChange(null);
      setNewChange({});
      fetchChanges(selectedPatchnote.id);
    }
  };

  const handleDeleteChange = async (changeId: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce changement ?")) return;

    const { error } = await supabase.from('patch_note_changes').delete().eq('id', changeId);
    if (error) {
      toast.error("Erreur lors de la suppression du changement.");
    } else {
      toast.success("Changement supprimé.");
      fetchChanges(selectedPatchnote!.id);
    }
  };

  const openChangeModal = (change: PatchNoteChange | null) => {
    setEditingChange(change);
    setNewChange(change || {});
    setIsChangeModalOpen(true);
  };

  const changeTypes = [
    { value: 'new', label: 'Nouveau' },
    { value: 'fix', label: 'Correction' },
    { value: 'improvement', label: 'Amélioration' },
    { value: 'balancing', label: 'Équilibrage' },
    { value: 'removal', label: 'Suppression' },
  ];

  return (
    <div className="p-4 text-white">
      <h1 className="text-2xl font-bold mb-4">Gestion des Patch Notes</h1>
      
      <div className="flex justify-end mb-4">
        <Dialog open={isPatchnoteModalOpen} onOpenChange={(isOpen) => { setIsPatchnoteModalOpen(isOpen); if (!isOpen) setEditingPatchnote(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPatchnote(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Patch Note
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
            <DialogHeader>
              <DialogTitle>{editingPatchnote ? 'Modifier' : 'Nouveau'} Patch Note</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSavePatchnote} className="py-4 space-y-4">
              <Input name="title" placeholder="Titre du patch note" defaultValue={editingPatchnote?.title || ''} required />
              <Button type="submit">Sauvegarder</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <h2 className="text-xl font-semibold mb-2">Patch Notes</h2>
          <ul className="space-y-2">
            {patchnotes.map(pn => (
              <li key={pn.id} 
                  className={`p-2 rounded cursor-pointer ${selectedPatchnote?.id === pn.id ? 'bg-slate-700' : 'bg-slate-800 hover:bg-slate-700'}`}
                  onClick={() => setSelectedPatchnote(pn)}>
                <div className="flex justify-between items-center">
                  <span>{pn.title}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingPatchnote(pn); setIsPatchnoteModalOpen(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant={pn.is_published ? 'secondary' : 'default'} size="sm" onClick={(e) => { e.stopPropagation(); handlePublishPatchnote(pn); }}>
                      {pn.is_published ? 'Dépublier' : 'Publier'}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2">
          {selectedPatchnote ? (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold">Changements pour: {selectedPatchnote.title}</h2>
                <Dialog open={isChangeModalOpen} onOpenChange={(isOpen) => { setIsChangeModalOpen(isOpen); if (!isOpen) setEditingChange(null); }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => openChangeModal(null)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un changement
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
                    <DialogHeader>
                      <DialogTitle>{editingChange ? 'Modifier' : 'Nouveau'} Changement</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveChange} className="py-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Select value={newChange.change_type} onValueChange={(value) => setNewChange(prev => ({ ...prev, change_type: value }))}>
                          <SelectTrigger><SelectValue placeholder="Type de changement" /></SelectTrigger>
                          <SelectContent>
                            {changeTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input placeholder="Type d'entité (ex: Item, Zone)" value={newChange.entity_type || ''} onChange={(e) => setNewChange(prev => ({ ...prev, entity_type: e.target.value }))} />
                      </div>
                      <Input placeholder="Nom de l'entité (ex: Hache en fer)" value={newChange.entity_name || ''} onChange={(e) => setNewChange(prev => ({ ...prev, entity_name: e.target.value }))} />
                      <Textarea placeholder="Description du changement" value={newChange.description || ''} onChange={(e) => setNewChange(prev => ({ ...prev, description: e.target.value }))} />
                      <Button type="submit">Sauvegarder</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <ul className="space-y-2">
                {changes.map(change => (
                  <li key={change.id} className="p-3 bg-slate-800 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`font-bold text-sm px-2 py-1 rounded-full bg-slate-700`}>
                          {changeTypes.find(ct => ct.value === change.change_type)?.label || change.change_type}
                        </span>
                        <span className="ml-2 font-semibold">{change.entity_type}: {change.entity_name}</span>
                        <p className="text-slate-300 mt-1">{change.description}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openChangeModal(change)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteChange(change.id!)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full bg-slate-800 rounded-lg">
              <p>Sélectionnez un patch note pour voir les changements.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatchnoteManager;