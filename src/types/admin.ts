import { MapCell } from "./game";

export interface Item {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  stackable: boolean;
  signedIconUrl?: string;
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