// Based on the get_full_player_data function and its sub-functions
export interface PlayerState {
  id: string;
  username: string;
  spawn_date: string;
  vie: number;
  faim: number;
  soif: number;
  energie: number;
  current_zone_id: number;
  base_zone_id: number;
  created_at: string;
  updated_at: string;
  jours_survecus: number;
  zones_decouvertes: number[];
  exploration_x: number | null;
  exploration_y: number | null;
  unlocked_slots: number;
  credits: number;
  sale_slots: number;
  position_x: number;
  position_y: number;
  current_zone_type: string;
  base_position_x: number;
  base_position_y: number;
  base_zone_type: string;
  bank_balance: number | null;
}

export interface ItemDetails {
  name: string;
  description: string;
  icon: string;
  use_action_text: string | null;
  type: string;
  stackable: boolean;
  effects: any | null; // JSONB
}

export interface InventoryItem {
  id: number;
  item_id: number;
  quantity: number;
  slot_position: number;
  items: ItemDetails;
}

export interface Equipment {
  armor: { items: ItemDetails } | null;
  backpack: { items: ItemDetails } | null;
  shoes: { items: ItemDetails } | null;
  vehicle: { items: ItemDetails } | null;
}

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
  cooking_slot: any | null; // JSONB
  building_state: any | null; // JSONB
  rotation: number;
}

export interface ScoutingMission {
  id: number;
  target_player_id: string;
  target_username: string;
  started_at: string;
  status: string;
  report_data: any | null; // JSONB
  is_favorite: boolean;
}

export interface ChestItem {
  id: number;
  chest_id: number;
  item_id: number;
  quantity: number;
  slot_position: number;
  items: ItemDetails;
}

export interface CraftingJob {
  id: number;
  workbench_id: number;
  recipe_id: number;
  started_at: string;
  ends_at: string;
  quantity: number;
  initial_quantity: number;
  result_item_id: number;
  result_quantity: number;
  craft_time_seconds: number;
  result_item_name: string;
  result_item_icon: string;
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

export interface WorkbenchItem {
  id: number;
  workbench_id: number;
  item_id: number;
  quantity: number;
  slot_position: number;
  items: ItemDetails;
}

export interface PlayerData {
  playerState: PlayerState | null;
  inventory: InventoryItem[];
  equipment: Equipment | null;
  baseConstructions: BaseConstruction[];
  scoutingMissions: ScoutingMission[];
  chestItems: ChestItem[];
  craftingJobs: CraftingJob[];
  constructionJobs: ConstructionJob[];
  workbenchItems: WorkbenchItem[];
}