export interface BuildingLevel {
  id: number;
  building_type: string;
  level: number;
  upgrade_cost_wood: number;
  upgrade_cost_metal: number;
  upgrade_cost_components: number;
  upgrade_cost_metal_ingots: number;
  upgrade_cost_energy: number;
  upgrade_time_seconds: number;
  stats: {
    energy_regen_per_second?: number;
    health?: number;
    [key: string]: any; // Permet d'autres statistiques
  } | null;
  created_at: string;
}