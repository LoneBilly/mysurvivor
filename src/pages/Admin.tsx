import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AdminMapGrid from "@/components/admin/AdminMapGrid";
import ZoneItemEditor from "@/components/admin/ZoneItemEditor";
import PlayerManager from "@/components/admin/PlayerManager";
import ItemManager from "@/components/admin/ItemManager";
import EventManager from "@/components/admin/EventManager";
import BuildingManager from "@/components/admin/BuildingManager";
import { MapCell } from "@/types/game";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, ArrowLeft, Map, Users, Package, Zap, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

const Admin = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mapLayout, setMapLayout] = useState<MapCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<MapCell | null>(null);
  const [activeTab, setActiveTab] = useState('map');

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
    return <div className="h-full bg-gray-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'map':
        return (
          <div className="w-full h-full flex items-center justify-center">
            {selectedZone ? (
              <ZoneItemEditor zone={selectedZone} onBack={handleBackToGrid} />
            ) : (
              <AdminMapGrid mapLayout={mapLayout} onMapUpdate={handleMapUpdate} onZoneSelect={handleZoneSelect} />
            )}
          </div>
        );
      case 'players':
        return <PlayerManager mapLayout={mapLayout} />;
      case 'items':
        return <ItemManager />;
      case 'events':
        return <EventManager mapLayout={mapLayout} />;
      case 'buildings':
        return <BuildingManager />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full bg-gray-900 text-white flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0 p-4 sm:p-8">
        <div className="flex items-center justify-between mb-8 gap-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/game')} variant="outline" size="icon" className="bg-gray-800 border-gray-700 hover:bg-gray-700">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Panel Admin</h1>
              <p className="text-gray-400 mt-1">Gérez la carte, les objets et les événements du jeu.</p>
            </div>
          </div>
        </div>

        {isMobile ? (
          <>
            <div className="mb-4">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full bg-gray-800 border-gray-700 px-3 h-10 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="map">Carte</option>
                <option value="players">Joueurs</option>
                <option value="items">Items</option>
                <option value="events">Events</option>
                <option value="buildings">Bâtiments</option>
              </select>
            </div>
            <div className="flex-1 min-h-0">
              {renderContent()}
            </div>
          </>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1 min-h-0">
            <div className="flex justify-center mb-4">
              <TabsList className="grid w-full grid-cols-5 max-w-3xl flex-shrink-0">
                <TabsTrigger value="map"><Map className="w-4 h-4 mr-2" />Carte</TabsTrigger>
                <TabsTrigger value="players"><Users className="w-4 h-4 mr-2" />Joueurs</TabsTrigger>
                <TabsTrigger value="items"><Package className="w-4 h-4 mr-2" />Items</TabsTrigger>
                <TabsTrigger value="events"><Zap className="w-4 h-4 mr-2" />Events</TabsTrigger>
                <TabsTrigger value="buildings"><Wrench className="w-4 h-4 mr-2" />Bâtiments</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="map" className="flex-1 min-h-0">
              <div className="w-full h-full flex items-center justify-center">
                {selectedZone ? (
                  <ZoneItemEditor zone={selectedZone} onBack={handleBackToGrid} />
                ) : (
                  <AdminMapGrid mapLayout={mapLayout} onMapUpdate={handleMapUpdate} onZoneSelect={handleZoneSelect} />
                )}
              </div>
            </TabsContent>
            <TabsContent value="players" className="flex-1 min-h-0">
              <PlayerManager mapLayout={mapLayout} />
            </TabsContent>
            <TabsContent value="items" className="flex-1 min-h-0">
              <ItemManager />
            </TabsContent>
            <TabsContent value="events" className="flex-1 min-h-0">
              <EventManager mapLayout={mapLayout} />
            </TabsContent>
            <TabsContent value="buildings" className="flex-1 min-h-0">
              <BuildingManager />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Admin;