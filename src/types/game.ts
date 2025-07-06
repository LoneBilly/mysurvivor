export interface GameStats {
  vie: number;
  faim: number;
  soif: number;
  energie: number;
}

export interface PlayerState {
  id: string;
  username: string | null;
  jours_survecus: number;
  vie: number;
  faim: number;
  soif: number;
  energie: number;
  position_x: number;
  position_y: number;
  base_position_x: number | null;
  base_position_y: number | null;
  grille_decouverte: number[];
  wood: number;
  metal: number;
  components: number;
  created_at: string;
  updated_at: string;
}

export interface MapCell {
  id: number;
  x: number;
  y: number;
  type: 'foret' | 'plage' | 'unknown';
}

export interface InventoryItem {
  id: number;
  player_id: string;
  item_name: string;
  quantity: number;
}