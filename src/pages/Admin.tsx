import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AdminMapGrid from "@/components/admin/AdminMapGrid";
import ZoneItemEditor from "@/components/admin/ZoneItemEditor";
import { MapCell } from "@/types/game";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

const Admin = () => {
  const navigate = useNavigate();
  const [mapLayout, setMapLayout] = useState<MapCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<Map<number, { x: number; y: number }>>(new Map());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectedZone, setSelectedZone] = useState<MapCell | null>(null);

  const debouncedPendingChanges = useDebounce(pendingChanges, 1500);
  const isInitialMount = useRef(true);

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

  const handleMapUpdate = (newLayout: MapCell[], changedCells: MapCell[]) => {
    setMapLayout(newLayout);
    setPendingChanges(prev => {
      const newChanges = new Map(prev);
      changedCells.forEach(cell => {
        newChanges.set(cell.id, { x: cell.x, y: cell.y });
      });
      return newChanges;
    });
  };

  const handleSaveChanges = useCallback(async (changes: Map<number, { x: number; y: number }>) => {
    if (changes.size === 0) return;
    setSaveStatus('saving');
    const changesToSave = Array.from(changes.entries()).map(([id, coords]) => ({ id, ...coords }));
    
    const { error } = await supabase.rpc('update_map_layout_positions', { changes: changesToSave });
    
    if (error) {
      showError(`Erreur lors de la sauvegarde de la carte.`);
      console.error("Failed to save map layout:", error);
      setSaveStatus('error');
    } else {
      showSuccess("Carte sauvegardée !");
      setSaveStatus('saved');
      setPendingChanges(new Map());
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (debouncedPendingChanges.size > 0) {
      handleSaveChanges(debouncedPendingChanges);
    }
  }, [debouncedPendingChanges, handleSaveChanges]);
  
  useEffect(() => {
    if (saveStatus === 'saved' || saveStatus === 'error') {
      const timer = setTimeout(() => setSaveStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const handleZoneSelect = (zone: MapCell) => setSelectedZone(zone);
  const handleBackToGrid = () => setSelectedZone(null);

  const renderSaveStatus = () => {
    switch (saveStatus) {
      case 'saving': return <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Sauvegarde...</div>;
      case 'saved': return <div className="flex items-center gap-2 text-green-400"><CheckCircle className="w-4 h-4" />Enregistré</div>;
      case 'error': return <div className="flex items-center gap-2 text-red-400"><XCircle className="w-4 h-4" />Erreur</div>;
      default: return null;
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/')} variant="outline" className="bg-gray-800 border-gray-700 hover:bg-gray-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au jeu
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Panneau d'Administration</h1>
              <p className="text-gray-400 mt-1">Gérez la carte et les objets du jeu.</p>
            </div>
          </div>
          {!selectedZone && <div className="text-sm text-gray-400 h-6">{renderSaveStatus()}</div>}
        </div>

        {selectedZone ? (
          <ZoneItemEditor zone={selectedZone} onBack={handleBackToGrid} />
        ) : (
          <AdminMapGrid mapLayout={mapLayout} onMapUpdate={handleMapUpdate} onZoneSelect={handleZoneSelect} />
        )}
      </div>
    </div>
  );
};

export default Admin;