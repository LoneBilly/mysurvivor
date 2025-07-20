import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { PlusCircle, Trash2, Save, GitCommit, ChevronsRight, ChevronsLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  change_type: 'new' | 'improvement' | 'fix' | 'breaking';
  entity_type: string;
  entity_name: string;
  description: string;
};

const PatchnoteManager = () => {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [selectedPatchNote, setSelectedPatchNote] = useState<PatchNote | null>(null);
  const [changes, setChanges] = useState<PatchNoteChange[]>([]);
  const [newPatchNoteTitle, setNewPatchNoteTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const fetchPatchNotes = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('patch_notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch patch notes');
      console.error(error);
    } else {
      setPatchNotes(data || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPatchNotes();
  }, [fetchPatchNotes]);

  const fetchChanges = async (patchNoteId: number) => {
    const { data, error } = await supabase
      .from('patch_note_changes')
      .select('*')
      .eq('patch_note_id', patchNoteId);

    if (error) {
      toast.error('Failed to fetch patch note changes');
    } else {
      setChanges(data || []);
    }
  };

  const handleSelectPatchNote = (note: PatchNote) => {
    setSelectedPatchNote(note);
    fetchChanges(note.id);
  };

  const handleNewPatchNote = async () => {
    if (!newPatchNoteTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    const { data, error } = await supabase
      .from('patch_notes')
      .insert({ title: newPatchNoteTitle })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create patch note');
    } else {
      toast.success('Patch note created');
      setPatchNotes(prev => [data, ...prev]);
      setNewPatchNoteTitle('');
      setSelectedPatchNote(data);
      setChanges([]);
    }
  };

  const handleDeletePatchNote = async (noteId: number) => {
    const { error } = await supabase.from('patch_notes').delete().eq('id', noteId);
    if (error) {
      toast.error('Failed to delete patch note');
    } else {
      toast.success('Patch note deleted');
      setPatchNotes(prev => prev.filter(n => n.id !== noteId));
      if (selectedPatchNote?.id === noteId) {
        setSelectedPatchNote(null);
        setChanges([]);
      }
    }
  };

  const handlePublishPatchNote = async (noteId: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from('patch_notes')
      .update({ is_published: !currentStatus })
      .eq('id', noteId);

    if (error) {
      toast.error('Failed to update publish status');
    } else {
      toast.success(`Patch note ${!currentStatus ? 'published' : 'unpublished'}`);
      setPatchNotes(prev =>
        prev.map(n => (n.id === noteId ? { ...n, is_published: !currentStatus } : n))
      );
      if (selectedPatchNote?.id === noteId) {
        setSelectedPatchNote(prev => prev ? { ...prev, is_published: !currentStatus } : null);
      }
    }
  };

  const handleAddChange = () => {
    if (!selectedPatchNote) return;
    setChanges(prev => [
      ...prev,
      {
        patch_note_id: selectedPatchNote.id,
        change_type: 'new',
        entity_type: '',
        entity_name: '',
        description: '',
      },
    ]);
  };

  const handleUpdateChange = (index: number, field: keyof PatchNoteChange, value: string) => {
    const newChanges = [...changes];
    (newChanges[index] as any)[field] = value;
    setChanges(newChanges);
  };

  const handleRemoveChange = (index: number) => {
    const newChanges = [...changes];
    newChanges.splice(index, 1);
    setChanges(newChanges);
  };

  const handleSaveChanges = async () => {
    if (!selectedPatchNote) return;

    const upserts = changes.map(change => ({
      ...change,
      patch_note_id: selectedPatchNote.id,
    }));

    const { error } = await supabase.from('patch_note_changes').upsert(upserts);

    if (error) {
      toast.error('Failed to save changes');
      console.error(error);
    } else {
      toast.success('Changes saved');
      fetchChanges(selectedPatchNote.id);
    }
  };

  const changeTypeOptions = [
    { value: 'new', label: 'New', icon: '✨' },
    { value: 'improvement', label: 'Improvement', icon: '🚀' },
    { value: 'fix', label: 'Fix', icon: '🐛' },
    { value: 'breaking', label: 'Breaking', icon: '💥' },
  ];

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      <div className={cn(
        "bg-gray-900/80 backdrop-blur-sm border-r border-gray-700 flex flex-col transition-all duration-300",
        isSidebarCollapsed ? "w-16" : "w-[400px]"
      )}>
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          {!isSidebarCollapsed && <h2 className="text-xl font-bold">Patch Notes</h2>}
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            {isSidebarCollapsed ? <ChevronsRight /> : <ChevronsLeft />}
          </Button>
        </div>
        
        {!isSidebarCollapsed && (
          <>
            <div className="p-4 space-y-2 border-b border-gray-700">
              <Input
                type="text"
                placeholder="New patch note title..."
                value={newPatchNoteTitle}
                onChange={(e) => setNewPatchNoteTitle(e.target.value)}
                className="bg-gray-800 border-gray-600"
              />
              <Button onClick={handleNewPatchNote} className="w-full bg-indigo-600 hover:bg-indigo-700">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create
              </Button>
            </div>
            <div className="flex-grow overflow-y-auto no-scrollbar min-h-0">
              {patchNotes.map(note => (
                <div key={note.id} onClick={() => handleSelectPatchNote(note)} className={cn("p-3 border-b border-gray-700 hover:bg-gray-800/50 cursor-pointer", selectedPatchNote?.id === note.id ? 'bg-slate-700' : '')}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{note.title}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${note.is_published ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {note.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{new Date(note.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex-grow p-6 overflow-y-auto">
        {selectedPatchNote ? (
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold">{selectedPatchNote.title}</h1>
                <p className="text-gray-400">Created on {new Date(selectedPatchNote.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleSaveChanges} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
                <Button onClick={() => handlePublishPatchNote(selectedPatchNote.id, selectedPatchNote.is_published)} variant={selectedPatchNote.is_published ? "secondary" : "default"}>
                  {selectedPatchNote.is_published ? 'Unpublish' : 'Publish'}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the patch note and all its changes.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeletePatchNote(selectedPatchNote.id)}>
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="space-y-4">
              <Button onClick={handleAddChange} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Change
              </Button>
              {changes.map((change, index) => (
                <div key={index} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-400">Type</label>
                      <select
                        value={change.change_type}
                        onChange={(e) => handleUpdateChange(index, 'change_type', e.target.value)}
                        className="w-full mt-1 bg-gray-700 border-gray-600 rounded p-2 text-sm"
                      >
                        {changeTypeOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Entity Type</label>
                      <Input
                        type="text"
                        placeholder="e.g., Item, Zone, Feature"
                        value={change.entity_type}
                        onChange={(e) => handleUpdateChange(index, 'entity_type', e.target.value)}
                        className="bg-gray-700 border-gray-600 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Entity Name</label>
                      <Input
                        type="text"
                        placeholder="e.g., Medkit, Forest, Crafting"
                        value={change.entity_name}
                        onChange={(e) => handleUpdateChange(index, 'entity_name', e.target.value)}
                        className="bg-gray-700 border-gray-600 mt-1"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="text-xs text-gray-400">Description</label>
                    <Textarea
                      placeholder="Describe the change..."
                      value={change.description}
                      onChange={(e) => handleUpdateChange(index, 'description', e.target.value)}
                      className="bg-gray-700 border-gray-600 mt-1"
                    />
                  </div>
                  <div className="text-right mt-2">
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveChange(index)} className="text-red-500 hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <GitCommit className="mx-auto h-12 w-12" />
              <p className="mt-4">Select a patch note to view its details or create a new one.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatchnoteManager;