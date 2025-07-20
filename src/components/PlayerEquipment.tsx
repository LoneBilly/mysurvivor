import EquipmentSlot from "./EquipmentSlot";
import { PlayerEquipmentData, InventoryItem } from "@/types/game";

interface PlayerEquipmentProps {
  equipment: PlayerEquipmentData;
  onSlotClick: (item: InventoryItem | null) => void;
  onDrop: (e: React.DragEvent, slotType: string) => void;
  onDragOver: (e: React.DragEvent) => void;
}

const PlayerEquipment = ({ equipment, onSlotClick, onDrop, onDragOver }: PlayerEquipmentProps) => {
  return (
    <div className="p-2 rounded-lg bg-slate-900/30">
      <h3 className="text-center font-mono text-lg mb-2 text-white uppercase tracking-wider">Équipement</h3>
      <div className="grid grid-cols-1 gap-2">
        <EquipmentSlot slotType="armor" item={equipment.armor} onClick={onSlotClick} onDrop={(e) => onDrop(e, 'armor')} onDragOver={onDragOver} />
        <EquipmentSlot slotType="backpack" item={equipment.backpack} onClick={onSlotClick} onDrop={(e) => onDrop(e, 'backpack')} onDragOver={onDragOver} />
        <EquipmentSlot slotType="shoes" item={equipment.shoes} onClick={onSlotClick} onDrop={(e) => onDrop(e, 'shoes')} onDragOver={onDragOver} />
        <EquipmentSlot slotType="vehicle" item={equipment.vehicle} onClick={onSlotClick} onDrop={(e) => onDrop(e, 'vehicle')} onDragOver={onDragOver} />
      </div>
    </div>
  );
};

export default PlayerEquipment;