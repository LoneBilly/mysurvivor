export interface GameStats {
  vie: number;
  faim: number;
  soif: number;
  energie: number;
}

export interface InventoryItem {
  id: number;
  item_id: number;
  quantity: number;
  slot_position: number;
  items: {
    name: string;
    description: string | null;
    icon: string | null;
    signedIconUrl?: string;
    type?: string;
    use_action_text: string;
  } | null;
}

export interface BaseConstruction {
  x: number;
  y: number;
  type: string;
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
}

export interface GameState {
  id: string; // user_id
  username: string | null;
  jours_survecus: number;
  vie: number;
  faim: number;
  soif: number;
  energie: number;
  zones_decouvertes: number[];
  inventaire: InventoryItem[];
  base_constructions: BaseConstruction[];
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
}

export interface MapCell {
  id: number;
  x: number;
  y: number;
  type: string; // Type est maintenant plus générique
  icon: string | null;
}