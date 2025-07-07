"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerState } from "@/hooks/usePlayerState";
import ActionModal from "./ActionModal";
import { toast } from "sonner";
import { Home, TreeDeciduous, Mountain, Wrench, HelpCircle, Shield, Tent, Building, Waves } from 'lucide-react';

interface MapZone {
  id: number;
  x: number;
  y: number;
  type: string;
  icon: string;
}

interface PlayerPosition {
  x: number;
  y: number;
}

const ICONS: { [key: string]: React.ElementType } = {
  Forêt: TreeDeciduous,
  Montagne: Mountain,
  "Zone Industrielle": Wrench,
  Inconnue: HelpCircle,
  Base: Home,
  "Avant-poste": Shield,
  Camp: Tent,
  Ville: Building,
  Rivière: Waves,
};

const Map = () => {
  const [mapLayout, setMapLayout] = useState<MapZone[]>([]);
  const [playerPosition, setPlayerPosition] = useState<PlayerPosition | null>(null);
  const { playerState, loading, refreshPlayerState } = usePlayerState();
  const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMapLayout = async () => {
      const { data, error } = await supabase.from("map_layout").select("*");
      if (error) {
        console.error("Error fetching map layout:", error);
      } else {
        setMapLayout(data);
      }
    };

    fetchMapLayout();
  }, []);

  useEffect(() => {
    if (playerState && mapLayout.length > 0) {
      const currentZone = mapLayout.find(zone => zone.id === playerState.current_zone_id);
      if (currentZone) {
        setPlayerPosition({ x: currentZone.x, y: currentZone.y });
      }
    }
  }, [playerState, mapLayout]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, zone: MapZone) => {
    if (isDiscovered(zone.x, zone.y) && mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      setTooltip({
        content: zone.type,
        x: e.clientX - rect.left + mapContainerRef.current.scrollLeft,
        y: e.clientY - rect.top + mapContainerRef.current.scrollTop,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const handleCellClick = (zone: MapZone) => {
    if (!isDiscovered(zone.x, zone.y) || (playerPosition && zone.x === playerPosition.x && zone.y === playerPosition.y)) {
      return;
    }
    setSelectedZone(zone);
    setIsModalOpen(true);
  };

  const handleConfirmMove = async () => {
    if (!selectedZone || !playerState) return;

    if (playerState.energie < 10) {
      toast.error("Pas assez d'énergie pour se déplacer.");
      setIsModalOpen(false);
      return;
    }

    const { data: updatedPlayerState, error } = await supabase
      .from('player_states')
      .update({ 
        current_zone_id: selectedZone.id,
        energie: playerState.energie - 10,
        zones_decouvertes: [...(playerState.zones_decouvertes || []), selectedZone.id]
       })
      .eq('id', playerState.id)
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors du déplacement.");
      console.error("Move error:", error);
    } else {
      toast.success(`Déplacement vers ${selectedZone.type} réussi !`);
      refreshPlayerState();
    }
    setIsModalOpen(false);
    setSelectedZone(null);
  };

  const isDiscovered = (x: number, y: number) => {
    if (!playerState?.zones_decouvertes) return false;
    const zone = mapLayout.find(z => z.x === x && z.y === y);
    return zone ? playerState.zones_decouvertes.includes(zone.id) : false;
  };

  const getGrid = () => {
    if (mapLayout.length === 0) return [];
    const maxX = Math.max(...mapLayout.map(z => z.x));
    const maxY = Math.max(...mapLayout.map(z => z.y));
    const grid: (MapZone | null)[][] = Array(maxY + 1).fill(null).map(() => Array(maxX + 1).fill(null));
    mapLayout.forEach(zone => {
      grid[zone.y][zone.x] = zone;
    });
    return grid;
  };

  const grid = getGrid();

  if (loading) return <div className="text-white">Chargement de la carte...</div>;

  return (
    <div ref={mapContainerRef} className="relative bg-gray-800 p-4 rounded-lg shadow-lg w-full h-full overflow-auto">
      {grid.map((row, y) => (
        <div key={y} className="flex">
          {row.map((cell, x) => {
            if (!cell) return <div key={`${x}-${y}`} className="w-16 h-16 border border-gray-700 bg-gray-900" />;
            
            const isPlayerHere = playerPosition && playerPosition.x === x && playerPosition.y === y;
            const discovered = isDiscovered(x, y);
            const Icon = ICONS[cell.type] || HelpCircle;

            return (
              <div
                key={`${x}-${y}`}
                className={`w-16 h-16 border border-gray-700 flex items-center justify-center relative
                  ${discovered ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-900'}
                  ${isPlayerHere ? 'bg-blue-500' : ''}
                  ${discovered && !(isPlayerHere) ? 'cursor-pointer' : 'cursor-default'}
                `}
                onMouseMove={(e) => handleMouseMove(e, cell)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleCellClick(cell)}
              >
                {discovered && <Icon className="w-8 h-8 text-white" />}
                {isPlayerHere && <Home className="w-8 h-8 text-yellow-400 z-10" />}
              </div>
            );
          })}
        </div>
      ))}

      {tooltip && (
        <div
          className="absolute bg-black text-white p-2 rounded text-sm pointer-events-none z-50"
          style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}
        >
          {tooltip.content}
        </div>
      )}

      {selectedZone && (
        <ActionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleConfirmMove}
          title={selectedZone.type}
          description={`Êtes-vous sûr de vouloir vous déplacer vers la zone ${selectedZone.type} ? Cela consommera 10 points d'énergie.`}
        />
      )}
    </div>
  );
};

export default Map;