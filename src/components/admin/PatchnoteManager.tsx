"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Save, X, Edit, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PatchNote {
  id: number;
  title: string;
  created_at: string;
  is_published: boolean;
  patch_note_changes: PatchNoteChange[];
}

interface PatchNoteChange {
  id: number;
  patch_note_id: number;
  change_type: string;
  entity_type: string;
  entity_name: string;
  description: string | null;
  created_at: string;
}

const PatchnoteManager: React.FC = () => {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [selectedPatchNote, setSelectedPatchNote] = useState<PatchNote | null>(null);
  const [newPatchNoteTitle, setNewPatchNoteTitle] = useState('');
  const [isNewPatchNotePublished, setIsNewPatchNotePublished] = useState(false);
  const [newChangeType, setNewChangeType] = useState('');
  const [newEntityType, setNewEntityType] = useState('');
  const [newEntityName, setNewEntityName] = useState('');
  const [newChangeDescription, setNewChangeDescription] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchPatchNotes();
  }, []);

  const fetchPatchNotes = async () => {
    const { data, error } = await supabase
      .from('patch_notes')
      .select(`
        *,
        patch_note_changes (
          id, change_type, entity_type, entity_name, description, created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error fetching patch notes: ' + error.message);
    } else {
      setPatchNotes(data || []);
    }
  };

  const handleCreatePatchNote = async () => {
    if (!newPatchNoteTitle.trim()) {
      toast.error('Patch note title cannot be empty.');
      return;
    }

    const { data, error } = await supabase
      .from('patch_notes')
      .insert({ title: newPatchNoteTitle, is_published: isNewPatchNotePublished })
      .select()
      .single();

    if (error) {
      toast.error('Error creating patch note: ' + error.message);
    } else {
      toast.success('Patch note created successfully!');
      setNewPatchNoteTitle('');
      setIsNewPatchNotePublished(false);
      fetchPatchNotes();
      setSelectedPatchNote(data);
    }
  };

  const handleUpdatePatchNote = async () => {
    if (!selectedPatchNote) return;

    const { error } = await supabase
      .from('patch_notes')
      .update({ title: selectedPatchNote.title, is_published: selectedPatchNote.is_published })
      .eq('id', selectedPatchNote.id);

    if (error) {
      toast.error('Error updating patch note: ' + error.message);
    } else {
      toast.success('Patch note updated successfully!');
      fetchPatchNotes();
    }
  };

  const handleDeletePatchNote = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this patch note and all its changes?')) return;

    const { error } = await supabase
      .from('patch_notes')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error deleting patch note: ' + error.message);
    } else {
      toast.success('Patch note deleted successfully!');
      setSelectedPatchNote(null);
      fetchPatchNotes();
    }
  };

  const handleAddChange = async () => {
    if (!selectedPatchNote) return;
    if (!newChangeType || !newEntityType || !newEntityName) {
      toast.error('Change type, entity type, and entity name cannot be empty.');
      return;
    }

    const { error } = await supabase
      .from('patch_note_changes')
      .insert({
        patch_note_id: selectedPatchNote.id,
        change_type: newChangeType,
        entity_type: newEntityType,
        entity_name: newEntityName,
        description: newChangeDescription || null,
      });

    if (error) {
      toast.error('Error adding change: ' + error.message);
    } else {
      toast.success('Change added successfully!');
      setNewChangeType('');
      setNewEntityType('');
      setNewEntityName('');
      setNewChangeDescription('');
      fetchPatchNotes(); // Re-fetch to update selectedPatchNote with new changes
      // Find and update the selected patch note in state to reflect the new change immediately
      setSelectedPatchNote(prev => {
        if (prev) {
          return {
            ...prev,
            patch_note_changes: [...prev.patch_note_changes, {
              id: Date.now(), // Temp ID for immediate display
              patch_note_id: prev.id,
              change_type: newChangeType,
              entity_type: newEntityType,
              entity_name: newEntityName,
              description: newChangeDescription || null,
              created_at: new Date().toISOString(),
            }],
          };
        }
        return null;
      });
    }
  };

  const handleDeleteChange = async (changeId: number) => {
    if (!window.confirm('Are you sure you want to delete this change?')) return;

    const { error } = await supabase
      .from('patch_note_changes')
      .delete()
      .eq('id', changeId);

    if (error) {
      toast.error('Error deleting change: ' + error.message);
    } else {
      toast.success('Change deleted successfully!');
      fetchPatchNotes(); // Re-fetch to update selectedPatchNote
      setSelectedPatchNote(prev => {
        if (prev) {
          return {
            ...prev,
            patch_note_changes: prev.patch_note_changes.filter(change => change.id !== changeId),
          };
        }
        return null;
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left Panel: Patch Notes List */}
      <div className="w-1/3 border-r border-gray-700 p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Patch Notes</h2>
        <div className="mb-4">
          <Input
            placeholder="New patch note title"
            value={newPatchNoteTitle}
            onChange={(e) => setNewPatchNoteTitle(e.target.value)}
            className="mb-2 bg-gray-800 border-gray-700 text-white"
          />
          <div className="flex items-center space-x-2 mb-2">
            <Checkbox
              id="new-published"
              checked={isNewPatchNotePublished}
              onCheckedChange={(checked) => setIsNewPatchNotePublished(checked as boolean)}
              className="border-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
            />
            <Label htmlFor="new-published">Published</Label>
          </div>
          <Button onClick={handleCreatePatchNote} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> Create Patch Note
          </Button>
        </div>
        <div className="flex-grow overflow-y-auto no-scrollbar">
          {patchNotes.map(note => (
            <div key={note.id} className={cn("p-3 border-b border-gray-700 hover:bg-gray-800/50", selectedPatchNote?.id === note.id ? 'bg-slate-700' : '')}>
              <div className="flex items-center justify-between">
                <span
                  className="cursor-pointer flex-grow"
                  onClick={() => setSelectedPatchNote(note)}
                >
                  {note.title}
                </span>
                <div className="flex items-center space-x-2">
                  {note.is_published ? (
                    <Eye className="h-4 w-4 text-green-500" title="Published" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-yellow-500" title="Draft" />
                  )}
                  <Button variant="ghost" size="icon" onClick={() => handleDeletePatchNote(note.id)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-400">{new Date(note.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: Patch Note Details */}
      <div className="w-2/3 p-4 flex flex-col">
        {selectedPatchNote ? (
          <>
            <div className="mb-4">
              <Input
                value={selectedPatchNote.title}
                onChange={(e) => setSelectedPatchNote({ ...selectedPatchNote, title: e.target.value })}
                className="text-2xl font-bold mb-2 bg-gray-800 border-gray-700 text-white"
              />
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="published"
                  checked={selectedPatchNote.is_published}
                  onCheckedChange={(checked) => setSelectedPatchNote({ ...selectedPatchNote, is_published: checked as boolean })}
                  className="border-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                />
                <Label htmlFor="published">Published</Label>
                <Button onClick={handleUpdatePatchNote} className="ml-auto bg-green-600 hover:bg-green-700 text-white">
                  <Save className="mr-2 h-4 w-4" /> Save Patch Note
                </Button>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-3">Changes</h3>
            <div className="space-y-2 mb-4 flex-grow overflow-y-auto no-scrollbar">
              {selectedPatchNote.patch_note_changes.length === 0 ? (
                <p className="text-gray-400">No changes for this patch note yet.</p>
              ) : (
                selectedPatchNote.patch_note_changes.map(change => (
                  <div key={change.id} className="bg-gray-800 p-3 rounded-md flex items-center justify-between">
                    <div>
                      <p className="font-medium">{change.change_type}: {change.entity_type} - {change.entity_name}</p>
                      {change.description && <p className="text-sm text-gray-400">{change.description}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteChange(change.id)} className="text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-lg font-bold mb-3">Add New Change</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <Select value={newChangeType} onValueChange={setNewChangeType}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Change Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="Added">Added</SelectItem>
                    <SelectItem value="Updated">Updated</SelectItem>
                    <SelectItem value="Removed">Removed</SelectItem>
                    <SelectItem value="Fixed">Fixed</SelectItem>
                    <SelectItem value="Improved">Improved</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={newEntityType} onValueChange={setNewEntityType}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Entity Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="Item">Item</SelectItem>
                    <SelectItem value="Recipe">Recipe</SelectItem>
                    <SelectItem value="Building">Building</SelectItem>
                    <SelectItem value="Zone">Zone</SelectItem>
                    <SelectItem value="Player">Player</SelectItem>
                    <SelectItem value="System">System</SelectItem>
                    <SelectItem value="UI">UI</SelectItem>
                    <SelectItem value="Bug">Bug</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Entity Name (e.g., 'Wooden Axe', 'Crafting Table')"
                value={newEntityName}
                onChange={(e) => setNewEntityName(e.target.value)}
                className="mb-3 bg-gray-800 border-gray-700 text-white"
              />
              <Textarea
                placeholder="Description (optional)"
                value={newChangeDescription}
                onChange={(e) => setNewChangeDescription(e.target.value)}
                className="mb-3 bg-gray-800 border-gray-700 text-white"
              />
              <Button onClick={handleAddChange} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-2 h-4 w-4" /> Add Change
              </Button>
            </div>
          </>
        ) : (
          <p className="text-gray-400">Select a patch note to view/edit its details.</p>
        )}
      </div>
    </div>
  );
};

export default PatchnoteManager;