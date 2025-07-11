"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapGrid } from '@/components/MapGrid';
import { ZoneItemEditor } from '@/components/ZoneItemEditor';
import { PlayerManager } from '@/components/PlayerManager'; // Assurez-vous que ce composant existe

export function Admin() {
  const [selectedTab, setSelectedTab] = useState('map');
  const [selectedZone, setSelectedZone] = useState(null);

  const handleBackToGrid = () => {
    setSelectedZone(null);
  };

  return (
    <div className="flex flex-col h-screen p-4">
      <h1 className="text-3xl font-bold mb-6 text-center text-white">Panneau d'Administration</h1>
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex flex-col flex-1">
        <TabsList className="grid w-full grid-cols-2 bg-gray-700 text-white">
          <TabsTrigger value="map" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Éditeur de Carte</TabsTrigger>
          <TabsTrigger value="players" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Gestion des Joueurs</TabsTrigger>
        </TabsList>
        <TabsContent value="map" className="flex-1 min-h-0 flex items-center justify-center p-4 bg-gray-800 rounded-b-lg">
          {selectedZone ? (
            <ZoneItemEditor zone={selectedZone} onBack={handleBackToGrid} />
          ) : (
            <MapGrid onZoneSelect={setSelectedZone} />
          )}
        </TabsContent>
        <TabsContent value="players" className="flex-1 min-h-0 flex flex-col items-center justify-start p-4 bg-gray-800 rounded-b-lg overflow-auto">
          <PlayerManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}