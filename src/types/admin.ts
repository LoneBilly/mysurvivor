import { MapCell } from "./game";

export interface Item {
  id: number;
  name: string;
  description: string | null;
  type: string;
  stackable: boolean;
}

export interface ZoneItem {
  zone_id: number;
  item_id: number;
  spawn_chance: number;
}

export interface ZoneItemEditorProps {
  zone: MapCell;
  onBack: () => void;
}