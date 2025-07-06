export interface GameStats {
  vie: number;
  faim: number;
  soif: number;
  energie: number;
}

export interface GameState {
  id: string;
  user_id: string;
  jours_survecus: number;
  vie: number;
  faim: number;
  soif: number;
  energie: number;
  grille_decouverte: boolean[][];
  inventaire: string[];
  position_x: number;
  position_y: number;
  base_position_x: number | null;
  base_position_y: number | null;
  created_at: string;
  updated_at: string;
  wood: number;
  metal: number;
  components: number;
}

export interface MapCell {
  x: number;
  y: number;
  type: 'foret' | 'plage' | 'unknown';
}