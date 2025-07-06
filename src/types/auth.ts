export interface UserProfile {
  id: string;
  username: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerGameState {
  id: string;
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