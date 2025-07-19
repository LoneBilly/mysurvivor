import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import ItemIcon from "./ItemIcon"
import { ZoneDiscovery } from "./ZoneDiscovery"
import { useGame } from "@/contexts/GameContext"

type LootItem = {
  item_id: number;
  name: string;
  description: string;
  icon: string;
  type: string;
  quantity: number;
};

type EventResult = {
  name: string;
  description: string;
  icon: string;
  success: boolean;
  discoverable_zones?: { id: number; x: number; y: number; type: string; icon: string; }[];
};

type ExplorationResult = {
  loot: LootItem[];
  event_result: EventResult | null;
};

interface ExplorationModalProps {
  explorationResult: ExplorationResult | null;
  isOpen: boolean;
  onClose: () => void;
  onLootCollected: () => void;
}

export function ExplorationModal({ explorationResult, isOpen, onClose, onLootCollected }: ExplorationModalProps) {
  const { getIconUrl } = useGame();

  if (!isOpen || !explorationResult) {
    return null;
  }

  const { loot, event_result } = explorationResult;
  const hasLoot = loot && loot.length > 0;
  const hasEvent = event_result && event_result.success;
  const discoverableZones = hasEvent ? event_result.discoverable_zones : undefined;

  const handleDiscovery = () => {
    onLootCollected();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Résultat de l'exploration</DialogTitle>
          <DialogDescription>
            Vous avez trouvé des objets et un événement s'est peut-être produit.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {hasLoot && (
            <div>
              <h3 className="font-bold mb-2">Butin trouvé</h3>
              <div className="grid grid-cols-5 gap-2">
                {loot.map((item) => (
                  <Dialog key={item.item_id}>
                    <DialogTrigger asChild>
                      <div className="w-16 h-16 bg-gray-800/50 border border-gray-700 rounded-md flex items-center justify-center relative cursor-pointer hover:bg-gray-800 transition-colors">
                        <ItemIcon iconName={getIconUrl(item.icon) || item.icon} alt={item.name} className="w-8 h-8" />
                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                          {item.quantity}
                        </span>
                      </div>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-md flex items-center justify-center">
                            <ItemIcon iconName={getIconUrl(item.icon) || item.icon} alt={item.name} className="w-8 h-8" />
                          </div>
                          <div>
                            <DialogTitle>{item.name}</DialogTitle>
                            <DialogDescription>{item.type}</DialogDescription>
                          </div>
                        </div>
                      </DialogHeader>
                      <p className="py-4 text-muted-foreground">{item.description}</p>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </div>
          )}

          {hasEvent && (
            <div className="border-t pt-4">
              <h3 className="font-bold mb-2">Événement : {event_result.name}</h3>
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 bg-gray-800/50 border border-gray-700 rounded-md flex items-center justify-center relative">
                  <ItemIcon iconName={getIconUrl(event_result.icon) || event_result.icon} alt={event_result.name} className="w-8 h-8" />
                </div>
                <p className="text-sm text-muted-foreground flex-1 pt-1">{event_result.description}</p>
              </div>
            </div>
          )}

          {discoverableZones && discoverableZones.length > 0 && (
            <ZoneDiscovery discoverableZones={discoverableZones} onDiscovery={handleDiscovery} />
          )}
        </div>

        <DialogFooter>
          <Button onClick={onLootCollected} className="w-full">
            Tout prendre et fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}