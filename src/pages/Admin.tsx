import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AdminMapGrid from "@/components/admin/AdminMapGrid";
import { MapCell } from "@/types/game";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, Save } from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();
  const [mapLayout, setMapLayout] = useState<MapCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<Map<number, { x: number; y: number }>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchMapLayout = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('map_layout').select('*').order('y').order('x');
      if (error) {
        console.error("Error fetching map layout:", error);
        showError("Impossible de charger la carte.");
      } else {
        setMapLayout(data as MapCell[]);
      }
      setLoading(false);
    };
    fetchMapLayout();
  }, []);

  const handleMapUpdate = (newLayout: MapCell[], changedCells: MapCell[]) => {
    setMapLayout(newLayout); // Met à jour l'affichage immédiatement
    setPendingChanges(prev => {
      const newChanges = new Map(prev);
      changedCells.forEach(cell => {
        newChanges.set(cell.id, { x: cell.x, y: cell.y });
      });
      return newChanges;
    });
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0) return;

    setIsSaving(true);
    const changesToSave = Array.from(pendingChanges.entries());

    const updatePromises = changesToSave.map(([id, coords]) =>
      supabase
        .from('map_layout')
        .update({ x: coords.x, y: coords.y })
        .eq('id', id)
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
        
        {loading ? (
          <div className="bg-gray-800 p-2 rounded-lg shadow-lg h-[500px] w-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : (
          <AdminMapGrid mapLayout={mapLayout} onMapUpdate={handleMapUpdate} />
        )}

      </div>
    </div>
  );
};

export default Admin;