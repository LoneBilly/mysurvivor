import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Mock components for other tabs
const PlaceholderTab = ({ title }: { title: string }) => (
  <div className="bg-gray-800 rounded-lg p-6 h-full flex items-center justify-center">
    <h2 className="text-2xl font-bold text-gray-500">{title} Management</h2>
  </div>
);

const PatchNotesAdmin = () => {
  const [patchNotes, setPatchNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatchNotes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("patch_notes")
        .select("*, patch_note_changes(*)")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Erreur lors de la récupération des patch notes.");
        console.error(error);
      } else {
        setPatchNotes(data);
      }
      setLoading(false);
    };
    fetchPatchNotes();
  }, []);

  if (loading) {
    return <div className="text-center p-8">Chargement des patch notes...</div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Gestion des Patch Notes</h2>
        <Button>Créer un Patch Note</Button>
      </div>
      <div className="space-y-4">
        {patchNotes.length > 0 ? (
          patchNotes.map((note) => (
            <div key={note.id} className="bg-gray-700/50 p-4 rounded-md border border-gray-600">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{note.title}</h3>
                  <p className="text-sm text-gray-400">
                    {new Date(note.created_at).toLocaleDateString()} -{" "}
                    <span className={note.is_published ? "text-green-400" : "text-yellow-400"}>
                      {note.is_published ? "Publié" : "Brouillon"}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Modifier</Button>
                  <Button variant="destructive" size="sm">Supprimer</Button>
                </div>
              </div>
              <ul className="list-disc list-inside pl-2 mt-3 space-y-1 text-gray-300">
                {note.patch_note_changes.map((change: any) => (
                  <li key={change.id}>
                    <span
                      className={`font-semibold mr-2 ${
                        change.change_type === "new"
                          ? "text-green-400"
                          : change.change_type === "fix"
                          ? "text-blue-400"
                          : change.change_type === "improvement"
                          ? "text-yellow-400"
                          : "text-gray-400"
                      }`}
                    >
                      [{change.change_type.toUpperCase()}]
                    </span>
                    <span className="font-medium text-gray-200">{change.entity_type} - {change.entity_name}:</span> {change.description}
                  </li>
                ))}
                 {note.patch_note_changes.length === 0 && <p className="text-gray-500 italic">Aucun changement pour ce patch note.</p>}
              </ul>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>Aucun patch note trouvé.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Admin = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full bg-gray-900 text-white flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0 p-4 sm:p-8">
        <div className="flex items-center justify-between mb-8 gap-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/game')} variant="outline" size="icon" className="bg-gray-800 border-gray-700 hover:bg-gray-700">
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-2xl font-bold">Tableau de bord Administrateur</h1>
          </div>
        </div>

        <Tabs defaultValue="patch-notes" className="w-full flex flex-col flex-1 min-h-0">
          <TabsList className="grid w-full grid-cols-6 bg-gray-800">
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="items">Objets</TabsTrigger>
            <TabsTrigger value="map">Carte</TabsTrigger>
            <TabsTrigger value="patch-notes">Patch Notes</TabsTrigger>
            <TabsTrigger value="guide">Guide</TabsTrigger>
            <TabsTrigger value="auctions">Enchères</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-4 flex-1 overflow-y-auto"><PlaceholderTab title="Users" /></TabsContent>
          <TabsContent value="items" className="mt-4 flex-1 overflow-y-auto"><PlaceholderTab title="Items" /></TabsContent>
          <TabsContent value="map" className="mt-4 flex-1 overflow-y-auto"><PlaceholderTab title="Map" /></TabsContent>
          <TabsContent value="patch-notes" className="mt-4 flex-1 overflow-y-auto">
            <PatchNotesAdmin />
          </TabsContent>
          <TabsContent value="guide" className="mt-4 flex-1 overflow-y-auto"><PlaceholderTab title="Guide" /></TabsContent>
          <TabsContent value="auctions" className="mt-4 flex-1 overflow-y-auto"><PlaceholderTab title="Auctions" /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;