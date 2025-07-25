import { MapCell } from "./game";

export interface Item {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  stackable: boolean;
  type: string;
  use_action_text: string;
  effects?: {
    ammo_item_id?: number;
    [key: string]: any;
  };
  created_at: string; // Added missing created_at
  recipe_id?: number | null; // Added missing recipe_id
}

export interface ZoneItem {
  zone_id: number;
  item_id: number;
  spawn_chance: number;
  max_quantity: number;
}

export interface ZoneItemEditorProps {
  zone: MapCell;
  onBack: () => void;
}