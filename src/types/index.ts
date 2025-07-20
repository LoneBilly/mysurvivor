export interface PlayerState {
  id: string;
  username: string;
  vie: number;
  faim: number;
  soif: number;
  energie: number;
  unlocked_slots: number;
  credits: number;
  // ... autres champs de player_states
}

export interface Item {
  id: number;
  name: string;
  description: string;
  icon: string;
  type: string;
  stackable: boolean;
  effects?: { [key: string]: any };
}

export interface InventoryItem {
  id: number; // inventory id
  item_id: number;
  quantity: number;
  slot_position: number | null;
  items: Item; // détails de l'objet imbriqué
}

export type EquipmentSlotType = 'armor' | 'backpack' | 'weapon' | 'shoes' | 'vehicle';

export interface Equipment {
  armor: InventoryItem | null;
  backpack: InventoryItem | null;
  weapon: InventoryItem | null;
  shoes: InventoryItem | null;
  vehicle: InventoryItem | null;
}

export interface PlayerData {
  playerState: PlayerState;
  inventory: InventoryItem[];
  equipment: Equipment;
  // ... autres données du joueur
}