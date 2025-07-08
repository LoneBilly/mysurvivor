import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { usePlayerState } from "@/hooks/usePlayerState";
import { useMapLayout } from "@/hooks/useMapLayout";
import { useCurrentZone } from "@/hooks/useCurrentZone";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import BaseConstructionView from "@/components/BaseConstructionView";
import { Loader2 } from "lucide-react";
import ZoneIcon from "@/components/ZoneIcon";
import ExplorationView from "@/components/ExplorationView";

const Game = () => {
  const { playerState, setPlayerState, isLoading: isLoadingPlayer } = usePlayerState();
  const { layout, isLoading: isLoadingMap } = useMapLayout();
  const { currentZone, isLoading: isLoadingZone } = useCurrentZone(playerState?.current_zone_id);
  const { toast } = useToast();
  const [isMoving, setIsMoving] = useState(false);
  const [showBaseConstruction, setShowBaseConstruction] = useState(false);
  const [showExploration, setShowExploration] = useState(false);

  const handleMove = async (direction: "north" | "south" | "east" | "west") => {
    if (!playerState || !currentZone || isMoving) return;

    let targetX = currentZone.x;
    let targetY = currentZone.y;

    switch (direction) {
      case "north":
        targetY--;
        break;
      case "south":
        targetY++;
        break;
      case "west":
        targetX--;
        break;
      case "east":
        targetX++;
        break;
    }

    const targetZone = layout?.find((z) => z.x === targetX && z.y === targetY);

    if (!targetZone) {
      toast({ title: "Déplacement impossible", description: "Cette zone est inaccessible.", variant: "destructive" });
      return;
    }

    setIsMoving(true);
    const { data, error } = await supabase
      .from("player_states")
      .update({ 
        current_zone_id: targetZone.id,
        zones_decouvertes: Array.from(new Set([...(playerState.zones_decouvertes || []), targetZone.id]))
      })
      .eq("id", playerState.id)
      .select()
      .single();

    if (error) {
      toast({ title: "Erreur de déplacement", description: error.message, variant: "destructive" });
    } else if (data) {
      setPlayerState(data);
      toast({ title: "Déplacement réussi", description: `Vous êtes maintenant dans la zone ${targetZone.type}.` });
    }
    setIsMoving(false);
  };

  const handleExplore = () => {
    setShowExploration(true);
  };

  const handleSearch = () => {
    console.log("Fouille de la zone...");
    toast({ title: "Fouille", description: "Vous fouillez la zone..." });
  };

  const handleBuildBase = () => {
    if (currentZone) {
      if (playerState?.base_zone_id) {
        toast({ title: "Base déjà construite", description: "Vous avez déjà une base.", variant: "destructive" });
        return;
      }
      setShowBaseConstruction(true);
    }
  };

  if (isLoadingPlayer || isLoadingMap || isLoadingZone) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }
  
  if (showExploration) {
    return <ExplorationView onBack={() => setShowExploration(false)} />;
  }

  if (showBaseConstruction) {
    return <BaseConstructionView currentZone={currentZone} onBaseBuilt={() => setShowBaseConstruction(false)} />;
  }

  if (!playerState || !currentZone) {
    return <div>Erreur de chargement des données du joueur.</div>;
  }

  const actions = [
    { label: "Explorer", onClick: handleExplore, variant: "secondary" as const },
    { label: "Fouiller", onClick: handleSearch, variant: "secondary" as const },
    { label: "Construire une base", onClick: handleBuildBase, variant: "default" as const },
  ];

  const getZoneInDirection = (direction: "north" | "south" | "east" | "west") => {
    if (!currentZone) return null;
    let { x, y } = currentZone;
    if (direction === 'north') y--;
    if (direction === 'south') y++;
    if (direction === 'west') x--;
    if (direction === 'east') x++;
    return layout?.find(zone => zone.x === x && zone.y === y);
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Tableau de bord du survivant</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>État du joueur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p>Vie: {playerState.vie}</p>
              <Progress value={playerState.vie} />
            </div>
            <div>
              <p>Faim: {playerState.faim}</p>
              <Progress value={playerState.faim} />
            </div>
            <div>
              <p>Soif: {playerState.soif}</p>
              <Progress value={playerState.soif} />
            </div>
            <div>
              <p>Énergie: {playerState.energie}</p>
              <Progress value={playerState.energie} />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Zone actuelle: {currentZone.type} ({currentZone.x}, {currentZone.y})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center mb-4">
              <ZoneIcon type={currentZone.type} icon={currentZone.icon} className="w-24 h-24" />
            </div>
            <p>Vous vous trouvez dans une zone de type: {currentZone.type}.</p>
            <div className="mt-4 grid grid-cols-3 gap-2 justify-center">
                <div></div>
                <Button onClick={() => handleMove("north")} disabled={isMoving || !getZoneInDirection('north')}>Nord</Button>
                <div></div>
                <Button onClick={() => handleMove("west")} disabled={isMoving || !getZoneInDirection('west')}>Ouest</Button>
                <div className="flex items-center justify-center">(Vous)</div>
                <Button onClick={() => handleMove("east")} disabled={isMoving || !getZoneInDirection('east')}>Est</Button>
                <div></div>
                <Button onClick={() => handleMove("south")} disabled={isMoving || !getZoneInDirection('south')}>Sud</Button>
                <div></div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {actions.map((action, index) => (
                <Button key={index} onClick={action.onClick} variant={action.variant}>
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Game;