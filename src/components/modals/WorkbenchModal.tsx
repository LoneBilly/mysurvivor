import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import toast from 'react-hot-toast';
import { BaseConstruction, CraftingJob } from '@/components/game/BaseGrid';

// Ces types sont des exemples, vous devriez les adapter à votre projet
export interface CraftingRecipe {
  id: number;
  result_item_id: number;
  result_quantity: number;
  craft_time_seconds: number;
  // ... add ingredients
}

export interface Item {
  id: number;
  name: string;
  icon: string;
}

interface WorkbenchModalProps {
  workbench: BaseConstruction;
  recipes: CraftingRecipe[];
  items: Item[];
  playerData: { craftingJobs: CraftingJob[] };
  fetchPlayerData: () => void;
  onClose: () => void;
}

const WorkbenchModal = ({ workbench, recipes, items, playerData, fetchPlayerData, onClose }: WorkbenchModalProps) => {
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);
  const [craftingJob, setCraftingJob] = useState<CraftingJob | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [progress, setProgress] = useState(0);

  const outputItem = workbench.output_item_id ? items.find(i => i.id === workbench.output_item_id) : null;
  
  useEffect(() => {
    const job = playerData.craftingJobs?.find(j => j.workbench_id === workbench.id && j.status === 'in_progress') || null;
    setCraftingJob(job);
  }, [playerData.craftingJobs, workbench.id]);

  useEffect(() => {
    if (!craftingJob) {
      setRemainingTime(0);
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      const endsAt = new Date(craftingJob.ends_at).getTime();
      const startedAt = new Date(craftingJob.started_at).getTime();
      const now = new Date().getTime();
      
      const totalDuration = endsAt - startedAt;
      const elapsed = now - startedAt;
      const newProgress = Math.min(100, (elapsed / totalDuration) * 100);
      setProgress(newProgress);

      const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
      setRemainingTime(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        toast.success('Fabrication terminée !');
        fetchPlayerData();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [craftingJob, fetchPlayerData]);

  const handleCraft = async () => {
    if (!selectedRecipe) return;
    const toastId = toast.loading('Lancement de la fabrication...');
    try {
      const { error } = await supabase.rpc('start_craft', {
        p_workbench_id: workbench.id,
        p_recipe_id: selectedRecipe.id,
      });
      if (error) throw error;
      toast.success('Fabrication lancée !', { id: toastId });
      fetchPlayerData();
      setSelectedRecipe(null);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`, { id: toastId });
    }
  };

  const handleCollect = async () => {
    const toastId = toast.loading('Récupération...');
    try {
      const { error } = await supabase.rpc('collect_workbench_output', {
        p_workbench_id: workbench.id,
      });
      if (error) throw error;
      toast.success('Objet récupéré !', { id: toastId });
      fetchPlayerData();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`, { id: toastId });
    }
  };

  const getRecipeResultItem = (recipe: CraftingRecipe) => {
    return items.find(i => i.id === recipe.result_item_id);
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gray-900 text-white border-gray-700">
      <CardHeader>
        <CardTitle>Établi</CardTitle>
        <Button onClick={onClose} variant="ghost" size="sm" className="absolute top-4 right-4 text-gray-400 hover:text-white">X</Button>
      </CardHeader>
      <CardContent>
        {outputItem ? (
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Fabrication terminée !</h3>
            <div className="flex flex-col items-center bg-gray-800 p-4 rounded-lg">
              <img src={outputItem.icon} alt={outputItem.name} className="w-16 h-16 mb-2" />
              <p>{outputItem.name} x{workbench.output_quantity}</p>
            </div>
            <Button onClick={handleCollect} className="mt-4 w-full">Récupérer</Button>
          </div>
        ) : craftingJob ? (
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Fabrication en cours...</h3>
            <div className="flex flex-col items-center bg-gray-800 p-4 rounded-lg">
              <p className="mb-2">
                {getRecipeResultItem(recipes.find(r => r.id === craftingJob.recipe_id)!)?.name || 'Objet inconnu'}
              </p>
              <Progress value={progress} className="w-full my-4" />
              <p className="font-mono text-xl">{remainingTime}s</p>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold mb-2">Recettes disponibles</h3>
            <ScrollArea className="h-64 pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {recipes.map(recipe => (
                  <div
                    key={recipe.id}
                    className={`p-2 border rounded-lg cursor-pointer ${selectedRecipe?.id === recipe.id ? 'border-yellow-400 bg-gray-800' : 'border-gray-700 hover:bg-gray-800'}`}
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    <p>{getRecipeResultItem(recipe)?.name}</p>
                    <p className="text-xs text-gray-400">Temps: {recipe.craft_time_seconds}s</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {selectedRecipe && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="font-bold text-lg">{getRecipeResultItem(selectedRecipe)?.name}</h4>
                <p className="text-sm text-gray-400">Quantité produite: {selectedRecipe.result_quantity}</p>
                <p className="text-sm text-gray-400">Temps de fabrication: {selectedRecipe.craft_time_seconds}s</p>
                {/* Vous pouvez ajouter l'affichage des ingrédients ici */}
                <Button onClick={handleCraft} className="mt-4 w-full">
                  Fabriquer
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkbenchModal;