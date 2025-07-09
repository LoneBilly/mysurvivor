import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import GameGrid from './GameGrid';
import BaseGrid from './BaseGrid';
import PlayerStats from './PlayerStats';
import GameLog from './GameLog';
import Actions from './Actions';
import Inventory from './Inventory';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from 'lucide-react';
import { toast } from 'sonner';

const GameInterface = () => {
  const [currentView, setCurrentView] = useState('map'); // 'map' or 'base'
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number; type: string } | null>(null);
  const [playerState, setPlayerState] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchPlayerState = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('player_states')
        .select('*, current_zone:current_zone_id(x, y, type)')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('Error fetching player state:', error);
        addLog(`Erreur: Impossible de récupérer l'état du joueur.`);
      } else {
        setPlayerState(data);
      }
    }
  };

  const fetchInventory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('inventories')
        .select('quantity, item:item_id(name, description, type)')
        .eq('player_id', user.id);
      if (error) {
        console.error('Error fetching inventory:', error);
        addLog(`Erreur: Impossible de récupérer l'inventaire.`);
      } else {
        setInventory(data.map(item => ({ ...item.item, quantity: item.quantity })));
      }
    }
  };

  useEffect(() => {
    fetchPlayerState();
    fetchInventory();
  }, []);

  const addLog = (message: string) => {
    setLogs(prevLogs => [...prevLogs, `${new Date().toLocaleTimeString()}: ${message}`]);
    toast(message);
  };

  const handleCellSelect = (cell: { x: number; y: number; type: string }) => {
    setSelectedCell(cell);
    addLog(`Zone [${cell.x}, ${cell.y}] sélectionnée: ${cell.type}.`);
  };

  const handleAction = async (action: string) => {
    if (!selectedCell) {
      addLog("Aucune zone sélectionnée pour l'action.");
      return;
    }
    addLog(`Action '${action}' sur la zone [${selectedCell.x}, ${selectedCell.y}].`);
    // TODO: Implement action logic (e.g., call Supabase function)
  };

  const renderSidebar = () => (
    <div className="flex flex-col h-full bg-gray-800 text-white">
      <PlayerStats playerState={playerState} />
      <Tabs defaultValue="actions" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="log">Log</TabsTrigger>
          <TabsTrigger value="inventory">Inventaire</TabsTrigger>
        </TabsList>
        <TabsContent value="actions" className="flex-1 overflow-y-auto p-2">
          <Actions onAction={handleAction} selectedCell={selectedCell} />
        </TabsContent>
        <TabsContent value="log" className="flex-1 overflow-y-auto">
          <GameLog logs={logs} />
        </TabsContent>
        <TabsContent value="inventory" className="flex-1 overflow-y-auto p-2">
          <Inventory items={inventory} />
        </TabsContent>
      </Tabs>
    </div>
  );

  if (isMobile) {
    return (
      <div className="h-screen w-screen bg-gray-900 text-white flex flex-col">
        <header className="flex justify-between items-center p-4 bg-gray-800">
          <h1 className="text-xl font-bold">Survie</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-3/4 p-0">
              <SheetHeader>
                <SheetTitle className="p-4 bg-gray-800 text-white">Menu</SheetTitle>
              </SheetHeader>
              {renderSidebar()}
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 flex items-center justify-center bg-gray-900 min-h-0 overflow-hidden">
          {currentView === 'map' ? (
            <GameGrid 
              onCellSelect={handleCellSelect}
              playerX={playerState?.current_zone?.x}
              playerY={playerState?.current_zone?.y}
            />
          ) : (
            <BaseGrid />
          )}
        </main>
        <footer className="p-2 bg-gray-800">
          <div className="flex justify-around">
            <Button onClick={() => setCurrentView('map')} variant={currentView === 'map' ? 'secondary' : 'ghost'}>Carte</Button>
            <Button onClick={() => setCurrentView('base')} variant={currentView === 'base' ? 'secondary' : 'ghost'}>Base</Button>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-gray-900 text-white">
      <aside className="w-80 flex-shrink-0">
        {renderSidebar()}
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex justify-end items-center p-4 bg-gray-800">
          <Button onClick={() => setCurrentView('map')} variant={currentView === 'map' ? 'secondary' : 'ghost'}>Exploration</Button>
          <Button onClick={() => setCurrentView('base')} variant={currentView === 'base' ? 'secondary' : 'ghost'} className="ml-2">Base</Button>
        </header>
        <main className="flex-1 flex items-center justify-center bg-gray-900 min-h-0 overflow-hidden">
          {currentView === 'map' ? (
            <GameGrid 
              onCellSelect={handleCellSelect}
              playerX={playerState?.current_zone?.x}
              playerY={playerState?.current_zone?.y}
            />
          ) : (
            <BaseGrid />
          )}
        </main>
      </div>
    </div>
  );
};

export default GameInterface;