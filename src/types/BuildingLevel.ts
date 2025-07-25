export interface BuildingLevel {
  id: number | string;
  building_type: string;
  level: number;
  upgrade_cost_wood: number;
  upgrade_cost_metal: number;
  upgrade_cost_components: number;
  upgrade_cost_metal_ingots: number;
  upgrade_cost_energy: number;
  upgrade_time_seconds: number;
  stats: {
    health?: number;
    [key: string]: any;
  } | null;
  created_at: string;
}