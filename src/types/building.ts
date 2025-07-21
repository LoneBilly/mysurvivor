export interface BuildingDefinition {
  type: string;
  name: string;
  icon: string | null;
  build_time_seconds: number;
  cost_energy: number;
  cost_wood: number;
  cost_metal: number;
  cost_components: number;
}

export interface BuildingLevel {
  id: number;
  building_type: string;
  level: number;
  upgrade_cost_wood: number;
  upgrade_cost_metal: number;
  upgrade_cost_components: number;
  upgrade_time_seconds: number;
  stats: any; // JSONB
}