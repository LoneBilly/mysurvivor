import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AdminMapGrid from "@/components/admin/AdminMapGrid";
import { MapCell } from "@/types/game";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, Save } from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();
  const [pendingChanges, setPendingChanges] = useState<Map<number, MapCell>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  const handleMapUpdate = (changedCells: MapCell[]) => {
    setPendingChanges(prev => {
      const newChanges = new Map(prev);
      changedCells.forEach(cell => {
        newChanges.set(cell.id, cell);
      });
      return newChanges;
    });
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0) return;

    setIsSaving(true);
    const changesToSave = Array.from(pendingChanges.values());

    const updatePromises = changesToSave.map(cell =>
      supabase
        .from('map_layout')
        .update({ x: cell.x, y: cell.y })
        .eq('id', cell.id)
    );

    const results = await Promise.all(updatePromises);
    
    const failedUpdates = results.filter(res => res.error);

    if (failedUpdates.length > 0) {
      showError(`Erreur lors de la sauvegarde de ${failedUpdates.length} zones.`);
      console.error("Failed updates:", failedUpdates.map(f => f.error));
    } else {
      showSuccess("La carte a été mise à jour avec succès !");
      setPendingChanges(new Map());
    }

    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Éditeur de Carte</h1>
            <p className="text-gray-400 mt-1">Glissez-déposez les zones pour les réorganiser. Cliquez sur "Sauvegarder" pour appliquer les changements.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button onClick={() => navigate('/')} variant="secondary">Retour au jeu</Button>
            {pendingChanges.size > 0 && (
              <Button onClick={handleSaveChanges} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Sauvegarder
              </Button>
            )}
          </div>
        </div>
        
        <AdminMapGrid onMapUpdate={handleMapUpdate} />

      </div>
    </div>
  );
};

export default Admin;