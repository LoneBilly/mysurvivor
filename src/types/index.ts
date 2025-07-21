export interface Item {
  id: number;
  name: string;
  description: string;
  icon: string;
  type: string;
  stackable: boolean;
  effects: any;
}

export interface InventoryItem {
  id: number;
  item_id: number;
  quantity: number;
  slot_position: number;
  items: Item;
}

export interface BaseConstruction {
  id: number;
  x: number;
  y: number;
  type: string;
  output_item_id: number | null;
  output_quantity: number | null;
  level: number;
  burn_time_remaining_seconds?: number;
  fuel_last_updated_at?: string;
}

export interface PlayerData {
  playerState: any;
  inventory: InventoryItem[];
  equipment: any;
  baseConstructions: BaseConstruction[];
  // ... autres champs de get_full_player_data
}