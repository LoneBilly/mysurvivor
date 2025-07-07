export interface GameStats {
  vie: number;
  faim: number;
  soif: number;
  energie: number;
}

export interface GameState {
  id: string; // user_id
  username: string | null;
  jours_survecus: number;
  vie: number;
  faim: number;
  soif: number;
  energie: number;
  grille_decouverte: boolean[][];
  inventaire: string[]; // L'inventaire n'est pas encore complètement implémenté
  position_x: number;
  position_y: number;
  base_position_x: number | null;
  base_position_y: number | null;
  created_at: string;
  updated_at: string;
  wood: number;
  metal: number;
  components: number;
  spawn_date: string;
}

export interface MapCell {
  x: number;
  y: number;
  type: 'foret' | 'plage' | 'unknown';
}