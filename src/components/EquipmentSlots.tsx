import { Equipment, InventoryItem } from '@/types/game';
import InventorySlot from './InventorySlot';
import { Backpack, Shield, Sword, Footprints, Car } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';

interface EquipmentSlotsProps {
  equipment: Equipment;
  onDragStart: (slotType: keyof Equipment, node: HTMLDivElement, e: React.MouseEvent | React.TouchEvent) => void;
  onItemClick: (item: InventoryItem, slotType: keyof Equipment) => void;
  draggedItem: { source: string; index?: number; slotType?: keyof Equipment } | null;
  dragOverSlot: keyof Equipment | null;
}

const slotConfig: Record<keyof Equipment, { icon: React.ElementType; label: string }> = {
  weapon: { icon: Sword, label: 'Arme' },
  armor: { icon: Shield, label: 'Armure' },
  backpack: { icon: Backpack, label: 'Sac à dos' },
  shoes: { icon: Footprints, label: 'Chaussures' },
  vehicle: { icon: Car, label: 'Véhicule' },
};

const EquipmentSlots = ({ equipment, onDragStart, onItemClick, draggedItem, dragOverSlot }: EquipmentSlotsProps) => {
  const { playerData } = useGame();

  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 rounded-lg border border-slate-800 h-full">
      <h3 className="font-bold mb-2 text-white font-mono">Équipement</h3>
      <div className="grid grid-cols-1 gap-2 w-full">
        {Object.keys(slotConfig).map(slotKey => {
          const key = slotKey as keyof Equipment;
          const item = playerData.equipment[key];
          const config = slotConfig[key];
          const Icon = config.icon;

          return (
            <div key={key} data-slot-target="equipment" data-slot-type={key} className="relative w-full aspect-square">
              <InventorySlot
                item={item}
                index={-1}
                isUnlocked={true}
                onDragStart={(node, e) => onDragStart(key, node, e)}
                onItemClick={() => item && onItemClick(item, key)}
                isBeingDragged={draggedItem?.source === 'equipment' && draggedItem?.slotType === key}
                isDragOver={dragOverSlot === key}
              />
              {!item && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Icon className="w-8 h-8 text-slate-600" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EquipmentSlots;