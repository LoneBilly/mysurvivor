import { MapCell } from "./game";

export interface Item {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  stackable: boolean;
  type: string;
  use_action_text: string;
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

export interface Event {
    id: number;
    name: string;
    description: string | null;
    icon: string | null;
}

export interface ZoneEvent {
    id?: number;
    zone_id: number;
    event_id: number;
    spawn_chance: number;
    success_chance: number;
    effects: Record<string, number>;
    events?: { name: string };
}