import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AdminMapGrid from "@/components/admin/AdminMapGrid";
import ZoneItemEditor from "@/components/admin/ZoneItemEditor";
import PlayerManager from "@/components/admin/PlayerManager";
import ItemManager from "@/components/admin/ItemManager";
import EventManager from "@/components/admin/EventManager";
import BuildingManager from "@/components/admin/BuildingManager";
import AuctionManager from "@/components/admin/AuctionManager";
import GuideManager from "@/components/admin/GuideManager";
import PatchnoteManager from "@/components/admin/PatchnoteManager";
import { MapCell } from "@/types/game";
import { Item } from "@/types/admin";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, ArrowLeft, Map, Users, Package, Zap, Wrench, Gavel, BookText, GitBranch } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-is-mobile";

const Admin = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('map');
  
  const [mapLayout, setMapLayout] = useState<MapCell[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  
  const [selectedZone, setSelectedZone] = useState<MapCell | null>(null);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [mapRes, itemsRes, eventsRes, buildingsRes] = await Promise.all([
        supabase.from('map_layout').select('*').order('y').order('x'),
        supabase.from('items').select('*').order('name'),
        supabase.from('events').select('*').order('name'),
        supabase.from('building_definitions').select('*').order('name'),
      ]);

      if (mapRes.error) throw mapRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (buildingsRes.error) throw buildingsRes.error;

      setMapLayout(mapRes.data as MapCell[]);
      setItems(itemsRes.data as Item[]);
      setEvents(eventsRes.data);
      setBuildings(buildingsRes.data);

    } catch (error: any) {
      console.error("Error fetching admin data:", error);
      showError("Impossible de charger les données d'administration.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

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
  const handleBackToGrid = () => {
    setSelectedZone(null);
    fetchAdminData();
  };

  if (loading) {
    return <div className="h-full bg-gray-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'map':
        return (
          <div className="w-full h-full flex items-center justify-center">
            {selectedZone ? (
              <ZoneItemEditor zone={selectedZone} onBack={handleBackToGrid} allItems={items} />
            ) : (
              <AdminMapGrid mapLayout={mapLayout} onMapUpdate={handleMapUpdate} onZoneSelect={handleZoneSelect} />
            )}
          </div>
        );
      case 'players':
        return <PlayerManager mapLayout={mapLayout} />;
      case 'items':
        return <ItemManager items={items} onItemsUpdate={fetchAdminData} />;
      case 'events':
        return <EventManager mapLayout={mapLayout} events={events} allItems={items} onEventsUpdate={fetchAdminData} />;
      case 'buildings':
        return <BuildingManager buildings={buildings} onBuildingsUpdate={fetchAdminData} />;
      case 'auctions':
        return <AuctionManager allItems={items} onUpdate={fetchAdminData} />;
      case 'guide':
        return <GuideManager />;
      case 'patchnotes':
        return <PatchnoteManager />;
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
                <option value="auctions">Enchères</option>
                <option value="guide">Guide</option>
                <option value="patchnotes">Patchnotes</option>
              </select>
            </div>
            <div className="flex-1 min-h-0">
              {renderContent()}
            </div>
          </>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1 min-h-0">
            <div className="flex justify-center mb-4">
              <TabsList className="grid w-full grid-cols-8 max-w-6xl flex-shrink-0">
                <TabsTrigger value="map"><Map className="w-4 h-4 mr-2" />Carte</TabsTrigger>
                <TabsTrigger value="players"><Users className="w-4 h-4 mr-2" />Joueurs</TabsTrigger>
                <TabsTrigger value="items"><Package className="w-4 h-4 mr-2" />Items</TabsTrigger>
                <TabsTrigger value="events"><Zap className="w-4 h-4 mr-2" />Events</TabsTrigger>
                <TabsTrigger value="buildings"><Wrench className="w-4 h-4 mr-2" />Bâtiments</TabsTrigger>
                <TabsTrigger value="auctions"><Gavel className="w-4 h-4 mr-2" />Enchères</TabsTrigger>
                <TabsTrigger value="guide"><BookText className="w-4 h-4 mr-2" />Guide</TabsTrigger>
                <TabsTrigger value="patchnotes"><GitBranch className="w-4 h-4 mr-2" />Patchnotes</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="map" className="flex-1 min-h-0">
              <div className="w-full h-full flex items-center justify-center">
                {selectedZone ? (
                  <ZoneItemEditor zone={selectedZone} onBack={handleBackToGrid} allItems={items} />
                ) : (
                  <AdminMapGrid mapLayout={mapLayout} onMapUpdate={handleMapUpdate} onZoneSelect={handleZoneSelect} />
                )}
              </div>
            </TabsContent>
            <TabsContent value="players" className="flex-1 min-h-0">
              <PlayerManager mapLayout={mapLayout} />
            </TabsContent>
            <TabsContent value="items" className="flex-1 min-h-0">
              <ItemManager items={items} onItemsUpdate={fetchAdminData} />
            </TabsContent>
            <TabsContent value="events" className="flex-1 min-h-0">
              <EventManager mapLayout={mapLayout} events={events} allItems={items} onEventsUpdate={fetchAdminData} />
            </TabsContent>
            <TabsContent value="buildings" className="flex-1 min-h-0">
              <BuildingManager buildings={buildings} onBuildingsUpdate={fetchAdminData} />
            </TabsContent>
            <TabsContent value="auctions" className="flex-1 min-h-0">
              <AuctionManager allItems={items} onUpdate={fetchAdminData} />
            </TabsContent>
            <TabsContent value="guide" className="flex-1 min-h-0">
              <GuideManager />
            </TabsContent>
            <TabsContent value="patchnotes" className="flex-1 min-h-0">
              <PatchnoteManager />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Admin;