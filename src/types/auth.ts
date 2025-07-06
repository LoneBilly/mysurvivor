export interface UserProfile {
  id: string;
  created_at: string;
}

export interface PlayerGameState {
  id: string;
  username: string | null;
  spawn_date: string;
  vie: number;
  faim: number;
  soif: number;
  energie: number;
  current_zone_id: number | null;
  base_zone_id: number | null;
  grille_decouverte: number[];
  wood: number;
  metal: number;
  components: number;
  created_at: string;
  updated_at: string;
}