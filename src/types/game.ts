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
  stats: GameStats;
  grille_decouverte: boolean[][];
  inventaire: string[];
  created_at: string;
  updated_at: string;
}

export interface Cell {
  type: 'mountain' | 'water' | 'forest' | 'start' | 'end' | 'empty';
}

export interface CellType {
  type: 'unknown' | 'foret' | 'plage' | 'autre';
  discovered: boolean;
}

export interface GridCell {
  x: number;
  y: number;
  type: CellType;
}