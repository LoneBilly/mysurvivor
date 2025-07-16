export interface GameStats {
  vie: number;
  faim: number;
  soif: number;
  energie: number;
}

export interface ItemDetails {
  name: string;
  description: string | null;
  icon: string | null;
  type?: string;
  use_action_text: string;
  stackable: boolean;
}

export interface InventoryItem {
  id: number;
  item_id: number;
  quantity: number;
  slot_position: number;
  items: ItemDetails | null;
  workbench_id?: number;
}

export interface BaseConstruction {
  id: number;
  x: number;
  y: number;
  type: string;
  output_item_id: number | null;
  output_quantity: number | null;
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

export interface PlayerState {
  id:string;
  username: string | null;
  jours_survecus: number;
  vie: number;
  faim: number;
  soif: number;
  energie: number;
  zones_decouvertes: number[];
  position_x: number;
  position_y: number;
  base_position_x: number | null;
  base_position_y: number | null;
  exploration_x: number | null;
  exploration_y: number | null;
  created_at: string;
  updated_at: string;
  wood: number;
  metal: number;
  components: number;
  spawn_date: string;
  unlocked_slots: number;
  credits: number;
  sale_slots: number;
  bank_balance: number | null;
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

export interface CraftingRecipe {
  id: number;
  result_item_id: number;
  result_quantity: number;
  slot1_item_id: number;
  slot1_quantity: number;
  slot2_item_id: number | null;
  slot2_quantity: number | null;
  slot3_item_id: number | null;
  slot3_quantity: number | null;
  craft_time_seconds: number;
}

export interface CraftingJob {
  id: number;
  workbench_id: number;
  player_id: string;
  recipe_id: number;
  started_at: string;
  ends_at: string;
  status: 'in_progress' | 'completed';
  result_item_id: number;
  result_quantity: number;
  result_item_name: string;
  result_item_icon: string;
  quantity: number;
  initial_quantity: number;
}

export interface ChestItem {
  item_id: number;
  quantity: number;
}

export interface FullPlayerData {
  playerState: PlayerState;
  inventory: InventoryItem[];
  baseConstructions: BaseConstruction[];
  scoutingMissions: ScoutingMission[];
  constructionJobs?: ConstructionJob[];
  craftingJobs?: CraftingJob[];
  chestItems?: ChestItem[];
  workbenchItems: InventoryItem[];
}

export interface MapCell {
  id: number;
  x: number;
  y: number;
  type: string;
  icon: string | null;
  interaction_type: 'Ressource' | 'Action' | 'Non défini';
}

export interface Item {
  id: number;
  name: string;
  description: string | null;
  stackable: boolean;
  created_at: string;
  icon: string | null;
  type: string;
  use_action_text: string;
}

export interface MarketListing {
  listing_id: number;
  seller_id: string;
  seller_username: string;
  item_id: number;
  item_name: string;
  item_icon: string | null;
  quantity: number;
  price: number;
  created_at: string;
  views: number;
}