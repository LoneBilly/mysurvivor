export interface InventoryItem {
  id: number;
  item_id: number;
  quantity: number;
  slot_position: number | null;
  items: {
    name: string;
    description: string;
    icon: string;
    use_action_text: string | null;
    type: string;
    stackable: boolean;
    effects: any; // jsonb
  };
}

export interface BaseConstruction {
  id: number;
  x: number;
  y: number;
  type: string;
  level: number;
  rotation: number;
  building_state: any; // jsonb
  output_item_id: number | null;
  output_quantity: number | null;
}

export interface FullPlayerData {
  playerState: any;
  inventory: InventoryItem[];
  equipment: any;
  baseConstructions: BaseConstruction[];
  // ... autres champs de get_full_player_data
}