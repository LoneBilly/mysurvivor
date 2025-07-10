import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AdminMapGrid from "@/components/admin/AdminMapGrid";
import ZoneItemEditor from "@/components/admin/ZoneItemEditor";
import PlayerManager from "@/components/admin/PlayerManager";
import { MapCell } from "@/types/game";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, ArrowLeft, Map, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Admin = () => {
  const navigate = useNavigate();
  const [mapLayout, setMapLayout] = useState<MapCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<MapCell | null>(null);

  const fetchMapLayout = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('map_layout').select('*').order('y').order('x');
    if (error) {
      console.error("Error fetching map layout:", error);
      showError("Impossible de charger la carte.");
    } else {
      setMapLayout(data as MapCell[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!selectedZone) {
      fetchMapLayout();
    }
  }, [selectedZone, fetchMapLayout]);

  const handleMapUpdate = async (newLayout: MapCell[], changedCells: MapCell[]) => {
    setMapLayout(newLayout);
    const changesToSave = changedCells.map(cell => ({ id: cell.id, x: cell.x, y: cell.y }));
    const { error } = await supabase.rpc('update_map_layout_positions', { changes: changesToSave });
    if (error) {
      showError(`Erreur lors de la sauvegarde de la carte.`);
      console.error("Failed to save map layout:", error);
    } else {
      showSuccess("Carte sauvegardée !");
    }
  };

  const handleZoneSelect = (zone: MapCell) => setSelectedZone(zone);
  const handleBackToGrid = () => setSelectedZone(null);

  if (loading && !mapLayout.length) {
    return <div className="h-screen bg-gray-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0 p-4 sm:p-8">
        <div className="flex items-center justify-between mb-8 gap-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/game')} variant="outline" size="icon" className="bg-gray-800 border-gray-700 hover:bg-gray-700">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Panel Admin</h1>
              <p className="text-gray-400 mt-1">Gérez la carte et les objets du jeu.</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="map" className="w-full flex flex-col flex-1 min-h-0">
          <TabsList className="grid w-full grid-cols-2 max-w-md mb-6 flex-shrink-0">
            <TabsTrigger value="map"><Map className="w-4 h-4 mr-2" />Gestion de la carte</TabsTrigger>
            <TabsTrigger value="players"><Users className="w-4 h-4 mr-2" />Gestion des joueurs</TabsTrigger>
          </TabsList>
          <TabsContent value="map" className="flex-1 overflow-y-auto no-scrollbar">
            {selectedZone ? (
              <ZoneItemEditor zone={selectedZone} onBack={handleBackToGrid} />
            ) : (
              <AdminMapGrid mapLayout={mapLayout} onMapUpdate={handleMapUpdate} onZoneSelect={handleZoneSelect} />
            )}
          </TabsContent>
          <TabsContent value="players" className="flex-1 overflow-y-auto no-scrollbar">
            <PlayerManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;