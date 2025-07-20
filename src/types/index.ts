export interface Item {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  stackable: boolean;
  type: string;
  use_action_text?: string | null;
  effects?: any; // JSONB
  recipe_id?: number | null;
}

export interface ChestItem {
  id: number; // chest_items.id
  item_id: number;
  quantity: number;
  slot_position: number;
  items: Item; // Joined data from items table
}