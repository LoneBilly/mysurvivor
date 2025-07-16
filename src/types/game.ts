export interface Item {
  id: number;
  name: string;
  description: string | null;
  stackable: boolean;
  created_at: string;
  icon: string | null;
  type: string;
  use_action_text: string | null;
  recipe_id: number | null;
}

export interface InventoryItem {
  id: number;
  item_id: number;
  quantity: number;
  slot_position: number;
  items?: Item;
  workbench_id?: number;
}

export interface PlayerState {
  id: string;
  username: string | null;
  spawn_date: string;
  vie: number;
  faim: number;
  soif: number;
  energie: number;
  current_zone_id: number | null;
  base_zone_id: number | null;
  wood: number;
  metal: number;
  components: number;
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
  base_position_x: number | null;
  base_position_y: number | null;
  base_zone_type: string | null;
  bank_balance: number | null;
}

export interface BaseConstruction {
  id: number;
  x: number;
  y: number;
  type: string;
  output_item_id?: number | null;
  output_quantity?: number | null;
}

export interface ConstructionJob {
  id: number;
  player_id: string;
  x: number;
  y: number;
  type: string;
  ends_at: string;
  created_at: string;
}

export interface ScoutingMission {
  id: number;
  target_player_id: string;
  target_username: string;
  started_at: string;
  status: 'in_progress' | 'completed';
  report_data: {
    target_username: string;
    base_zone_type: string;
  } | null;
  is_favorite: boolean;
}

export interface ChestItem {
  item_id: number;
  quantity: number;
}

export interface CraftingJob {
  id: number;
  workbench_id: number;
  recipe_id: number;
  started_at: string;
  ends_at: string;
  result_item_id: number;
  result_quantity: number;
  result_item_name: string;
  result_item_icon: string;
}

export interface FullPlayerData {
  playerState: PlayerState;
  inventory: InventoryItem[];
  baseConstructions: BaseConstruction[];
  constructionJobs?: ConstructionJob[];
  scoutingMissions: ScoutingMission[];
  chestItems: ChestItem[];
  craftingJobs: CraftingJob[];
  workbenchItems: InventoryItem[];
}

export interface MapCell {
  id: number;
  x: number;
  y: number;
  type: string;
  icon: string | null;
  interaction_type: string;
}

export interface CraftingRecipe {
  id: number;
  result_item_id: number;
  result_quantity: number;
  slot1_item_id: number | null;
  slot1_quantity: number | null;
  slot2_item_id: number | null;
  slot2_quantity: number | null;
  slot3_item_id: number | null;
  slot3_quantity: number | null;
  craft_time_seconds: number;
  created_at: string;
}