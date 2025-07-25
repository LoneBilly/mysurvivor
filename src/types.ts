export interface BaseConstruction {
  id: number;
  x: number;
  y: number;
  type: string;
  output_item_id: number | null;
  output_quantity: number | null;
  level: number;
  burn_time_remaining_seconds: number;
  fuel_last_updated_at: string;
  cooking_slot: any | null;
  building_state: {
    arrow_quantity?: number;
    is_armed?: boolean;
    [key: string]: any;
  } | null;
  rotation: number;
}

export interface ItemDetails {
  name: string;
  description: string;
  icon: string;
  use_action_text: string | null;
  type: string;
  stackable: boolean;
  effects: any | null;
}

export interface InventoryItem {
  id: number;
  item_id: number;
  quantity: number;
  slot_position: number | null;
  items: ItemDetails;
}

export interface ConstructionJob {
    id: number;
    player_id: string;
    x: number;
    y: number;
    type: string;
    ends_at: string;
    created_at: string;
    construction_id: number | null;
    target_level: number | null;
}

export interface PlayerData {
    playerState: any;
    inventory: InventoryItem[];
    equipment: any;
    baseConstructions: BaseConstruction[];
    scoutingMissions: any[];
    chestItems: any[];
    craftingJobs: any[];
    constructionJobs: ConstructionJob[];
    workbenchItems: any[];
}