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
  created_at: string;
  updated_at: string;
}

export interface GameGridCell {
  x: number;
  y: number;
  type: 'unknown' | 'foret' | 'plage' | 'start' | 'end' | 'autre'; // Define possible cell types
  decouverte: boolean;
}