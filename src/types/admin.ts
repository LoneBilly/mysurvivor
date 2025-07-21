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

export interface BuildingLevel {
  id?: number;
  building_type: string;
  level: number;
  upgrade_cost_wood: number;
  upgrade_cost_metal: number;
  upgrade_cost_components: number;
  upgrade_time_seconds: number;
  stats: Record<string, any> | null;
}