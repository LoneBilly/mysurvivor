"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { useGame } from '@/hooks/useGame'; // Import du hook useGame
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const GameGrid: React.FC = () => {
  const {
    grid,
    playerX,
    playerY,
    discoveredGrid,
    isGameOver,
    gameOverMessage,
    showSaveDialog,
    username,
    setUsername,
    handleSaveGame,
    handleCloseSaveDialog,
    handleRestartGame,
    handleDiscoverCell, // Utilisation de handleDiscoverCell du hook
  } = useGame(); // Appel du hook useGame

  const getCellContent = (cell: string, x: number, y: number) => {
    if (x === playerX && y === playerY) {
      return '🧑'; // Player icon
    }
    if (!discoveredGrid[y]?.[x]) {
      return '❓'; // Undiscovered cell
    }
    switch (cell) {
      case 'start':
        return '🏠';
      case 'forest':
        return '🌳';
      case 'mountain':
        return '⛰️';
      case 'water':
        return '🌊';
      case 'desert':
        return '🏜️';
      case 'city':
        return '🏙️';
      case 'item':
        return '📦';
      case 'enemy':
        return '👹';
      case 'safe_zone':
        return '✨';
      default:
        return '';
    }
  };

  const getCellClasses = (cell: string, x: number, y: number) => {
    const classes = ['w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center text-xl md:text-2xl lg:text-3xl rounded-md shadow-sm'];
    if (x === playerX && y === playerY) {
      classes.push('bg-yellow-300 border-2 border-yellow-500');
    } else if (!discoveredGrid[y]?.[x]) {
      classes.push('bg-gray-700 text-white');
    } else {
      switch (cell) {
        case 'start':
          classes.push('bg-green-400');
          break;
        case 'forest':
          classes.push('bg-green-600');
          break;
        case 'mountain':
          classes.push('bg-gray-400');
          break;
        case 'water':
          classes.push('bg-blue-400');
          break;
        case 'desert':
          classes.push('bg-yellow-200');
          break;
        case 'city':
          classes.push('bg-gray-500');
          break;
        case 'item':
          classes.push('bg-purple-300');
          break;
        case 'enemy':
          classes.push('bg-red-500');
          break;
        case 'safe_zone':
          classes.push('bg-indigo-300');
          break;
        default:
          classes.push('bg-gray-200');
      }
    }
    return cn(classes);
  };

  return (
    <main className="flex-1 flex items-center justify-center p-4 bg-blue-950">
      <div className="grid grid-cols-7 gap-1 md:gap-2 max-w-md md:max-w-lg lg:max-w-xl">
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x}-${y}`}
              className={getCellClasses(cell, x, y)}
              onClick={() => handleDiscoverCell(x, y)}
              disabled={isGameOver}
            >
              {getCellContent(cell, x, y)}
            </button>
          ))
        )}
      </div>

      <Dialog open={isGameOver} onOpenChange={handleRestartGame}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Game Over!</DialogTitle>
            <DialogDescription>{gameOverMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleRestartGame}>Restart Game</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveDialog} onOpenChange={handleCloseSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Game</DialogTitle>
            <DialogDescription>Enter a username to save your progress.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveGame}>Save</Button>
            <Button variant="outline" onClick={handleCloseSaveDialog}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default GameGrid;