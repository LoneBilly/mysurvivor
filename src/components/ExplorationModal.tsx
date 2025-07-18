import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getIconUrl } from '@/lib/utils';
import ItemIcon from './ItemIcon';

// Types basés sur la structure de données attendue
interface LootItem {
  item_id: number;
  quantity: number;
  name: string;
  icon: string;
  description: string;
  type: string;
}

interface EventResult {
  name: string;
  description: string;
  icon: string;
  success: boolean;
  effects?: any;
}

interface ExplorationResult {
  loot: LootItem[];
  event_result: EventResult | null;
}

interface ExplorationModalProps {
  explorationResult: ExplorationResult;
  onCollect: () => void;
  onClose: () => void;
}

export function ExplorationModal({ explorationResult, onCollect, onClose }: ExplorationModalProps) {
  const { loot, event_result } = explorationResult;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md text-white relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-white">
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-4 text-center">Exploration terminée</h2>

        {event_result && (
          <div className="mb-6 text-center">
            <h3 className="text-lg font-semibold mb-2">{event_result.name}</h3>
            <div className="flex justify-center mb-2">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-10 h-10 bg-gray-700 rounded-md flex items-center justify-center relative cursor-pointer">
                      <ItemIcon iconName={getIconUrl(event_result.icon) || event_result.icon} alt={event_result.name} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{event_result.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-gray-300">{event_result.description}</p>
          </div>
        )}

        {loot && loot.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-center">Butin trouvé</h3>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 justify-center">
              {loot.map((item, index) => (
                <TooltipProvider key={`loot-${index}`} delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-10 h-10 bg-gray-700 rounded-md flex items-center justify-center relative cursor-pointer">
                        <ItemIcon iconName={getIconUrl(item.icon) || item.icon} alt={item.name} />
                        {item.quantity > 1 && (
                          <span className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-xs rounded-full px-1.5 py-0.5">
                            {item.quantity}
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{item.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        )}

        {(!loot || loot.length === 0) && !event_result && (
          <p className="text-center text-gray-400 my-8">Vous n'avez rien trouvé d'intéressant.</p>
        )}

        <div className="flex justify-center mt-6">
          <Button onClick={onCollect} className="bg-green-600 hover:bg-green-700">
            Récupérer et rentrer
          </Button>
        </div>
      </div>
    </div>
  );
}