export interface GameStats {
  vie: number;
  faim: number;
  soif: number;
  energie: number;
}

export interface GameState {
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
  grille_decouverte: boolean[][];
  wood: number;
  metal: number;
  components: number;
  inventaire: any[];
  created_at: string;
  updated_at: string;
}

export interface MapCell {
  x: number;
  y: number;
  type: 'foret' | 'plage' | 'unknown';
}