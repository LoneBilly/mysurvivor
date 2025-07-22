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
  effects?: {
    ammo_item_id?: number;
    [key: string]: any;
  };
}

export interface InventoryItem {
  id: number;
  item_id: number;
  quantity: number;
  slot_position: number | null;
  items: ItemDetails | null;
  workbench_id?: number;
}

export interface Equipment {
  armor: InventoryItem | null;
  backpack: InventoryItem | null;
  shoes: InventoryItem | null;
  vehicle: InventoryItem | null;
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
  cooking_item_id: number | null;
  cooking_item_quantity: number | null;
  cooking_started_at: string | null;
  cooking_ends_at: string | null;
  cooked_at: string | null;
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
  current_zone_id: number | null;
  base_zone_id: number | null;
  created_at: string;
  updated_at: string;
  zones_decouvertes: number[];
  exploration_x: number | null;
  exploration_y: number | null;
  unlocked_slots: number;
  credits: number;
  sale_slots: number;
  spawn_date: string;
  position_x: number;
  position_y: number;
  base_position_x: number | null;
  base_position_y: number | null;
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
  construction_id: number | null;
  target_level: number | null;
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
  craft_time_seconds: number;
}

export interface ChestItem {
  id: number;
  chest_id: number;
  item_id: number;
  quantity: number;
  slot_position: number | null;
  items: ItemDetails | null;
}

export interface FullPlayerData {
  playerState: PlayerState;
  inventory: InventoryItem[];
  equipment: Equipment;
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
  type: string | null;
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
  effects?: Record<string, any>;
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

export interface DiscoverableZone extends MapCell {
  is_discovered: boolean;
}

export interface BuildingLevel {
  id?: number;
  building_type: string;
  level: number;
  upgrade_cost_wood: number;
  upgrade_cost_metal: number;
  upgrade_cost_components: number;
  upgrade_time_seconds: number;
  stats: {
    storage_slots?: number;
    [key: string]: any;
  } | null;
}