export interface Zone {
  id: number;
  x: number;
  y: number;
  type: string;
  icon: string | null;
}

export interface PlayerPosition {
  x: number;
  y: number;
}