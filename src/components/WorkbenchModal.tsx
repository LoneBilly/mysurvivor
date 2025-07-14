import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { X, Loader2, ChevronRight, Package, Clock } from 'lucide-react';

interface WorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  workbench: any;
  workbenchItems: any[];
  recipes: any[];
  items: any[];
  craftingJobs: any[];
  onDataRefresh: () => Promise<void>;
}

export function WorkbenchModal({ isOpen, onClose, workbench, workbenchItems, recipes, items, craftingJobs, onDataRefresh }: WorkbenchModalProps) {
  const { toast } = useToast();
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [maxCraftCount, setMaxCraftCount] = useState(1);
  const [isCrafting, setIsCrafting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [currentCraftCount, setCurrentCraftCount] = useState(0);

  const workbenchJob = useMemo(() => 
    craftingJobs.find(job => job.workbench_id === workbench.id),
    [craftingJobs, workbench.id]
  );

  const outputItem = useMemo(() => {
    if (!workbench.output_item_id) return null;
    return items.find(item => item.id === workbench.output_item_id);
  }, [workbench.output_item_id, items]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedRecipe(null);
      setMaxCraftCount(1);
      setIsCrafting(false);
      setProgress(0);
      setCountdown(0);
      setCurrentCraftCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCrafting && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCrafting, countdown]);

  useEffect(() => {
    if (!isCrafting || !selectedRecipe) return;

    const craftTime = selectedRecipe.craft_time_seconds * 1000;
    setCountdown(selectedRecipe.craft_time_seconds);
    
    let progressInterval: NodeJS.Timeout;
    const startTime = Date.now();

    progressInterval = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const newProgress = Math.min(100, (elapsedTime / craftTime) * 100);
      setProgress(newProgress);
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(progressInterval);
      setProgress(100);
      
      const nextCraftCount = currentCraftCount + 1;
      if (nextCraftCount < maxCraftCount) {
        setCurrentCraftCount(nextCraftCount);
        setProgress(0);
      } else {
        setIsCrafting(false);
        toast({
          title: "Fabrication terminée",
          description: `${maxCraftCount} x ${selectedRecipe.items.name} ont été fabriqués.`,
        });
        onDataRefresh();
      }
    }, craftTime);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timeout);
    };
  }, [isCrafting, currentCraftCount, maxCraftCount, selectedRecipe, onDataRefresh, toast]);


  const handleStartCraft = async () => {
    if (!selectedRecipe) return;

    setIsCrafting(true);
    setCurrentCraftCount(0);
    setProgress(0);

    try {
      for (let i = 0; i < maxCraftCount; i++) {
        const { error } = await supabase.rpc('start_craft', {
          p_workbench_id: workbench.id,
          p_recipe_id: selectedRecipe.id,
        });
        if (error) throw error;
      }
      toast({
        title: "Fabrication lancée",
        description: `La fabrication de ${maxCraftCount} x ${selectedRecipe.items.name} a commencé.`,
      });
      onDataRefresh();
    } catch (error: any) {
      console.error('Error starting craft:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
      setIsCrafting(false);
    }
  };

  const handleCollectOutput = async () => {
    if (!workbench.output_item_id) return;
    try {
      const { error } = await supabase.rpc('collect_workbench_output', {
        p_workbench_id: workbench.id,
      });
      if (error) throw error;
      toast({
        title: 'Objet récupéré',
        description: 'L\'objet a été ajouté à votre inventaire.',
      });
      await onDataRefresh();
    } catch (error: any) {
      console.error('Error collecting output:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const calculateMaxCraft = (recipe: any) => {
    let max = Infinity;
    const ingredients = [
      { id: recipe.ingredient1_id, qty: recipe.ingredient1_quantity },
      { id: recipe.ingredient2_id, qty: recipe.ingredient2_quantity },
      { id: recipe.ingredient3_id, qty: recipe.ingredient3_quantity },
    ].filter(ing => ing.id && ing.qty);

    for (const ingredient of ingredients) {
      const itemInWorkbench = workbenchItems.find(wi => wi.item_id === ingredient.id);
      const availableQty = itemInWorkbench ? itemInWorkbench.quantity : 0;
      max = Math.min(max, Math.floor(availableQty / ingredient.qty!));
    }
    return max === Infinity ? 0 : max;
  };

  const handleRecipeSelect = (recipe: any) => {
    setSelectedRecipe(recipe);
    const max = calculateMaxCraft(recipe);
    setMaxCraftCount(max > 0 ? 1 : 0);
  };

  const renderIngredient = (id?: number, required?: number) => {
    if (!id || !required) return null;
    const item = items.find(i => i.id === id);
    if (!item) return null;
    const available = workbenchItems.find(wi => wi.item_id === id)?.quantity || 0;
    const hasEnough = available >= required;
    return (
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <img src={item.icon} alt={item.name} className="w-6 h-6" />
          <span>{item.name}</span>
        </div>
        <span className={hasEnough ? 'text-green-400' : 'text-red-400'}>
          {available} / {required}
        </span>
      </div>
    );
  };

  const renderContent = () => {
    if (outputItem && workbench.output_quantity) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <h3 className="text-lg font-semibold mb-2">Fabrication terminée !</h3>
          <p className="text-gray-400 mb-4">Récupérez votre objet.</p>
          <div className="bg-gray-800 p-4 rounded-lg flex flex-col items-center gap-2">
            <img src={outputItem.icon} alt={outputItem.name} className="w-16 h-16" />
            <span className="font-bold">{outputItem.name}</span>
            <span className="text-gray-400">x{workbench.output_quantity}</span>
          </div>
          <Button onClick={handleCollectOutput} className="mt-6 w-full">
            <Package className="mr-2 h-4 w-4" />
            Récupérer
          </Button>
        </div>
      );
    }

    if (isCrafting && selectedRecipe) {
      const totalTime = selectedRecipe.craft_time_seconds * maxCraftCount;
      return (
        <div className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <img src={selectedRecipe.items.icon} alt={selectedRecipe.items.name} className="w-16 h-16 rounded-md" />
            <div>
              <h3 className="text-lg font-bold">Fabrication de {selectedRecipe.items.name}</h3>
              <p className="text-sm text-gray-400">Temps total: {totalTime}s</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm text-gray-300">
              <span>Fabrication en cours...</span>
              <span>{currentCraftCount + 1} / {maxCraftCount}</span>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="flex justify-center items-center text-sm text-gray-400 gap-1">
                <Clock size={14} />
                <span>{countdown}s</span>
            </div>
          </div>
        </div>
      );
    }
    
    if (workbenchJob) {
        const timeRemaining = Math.round((new Date(workbenchJob.ends_at).getTime() - Date.now()) / 1000);
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                <h3 className="text-lg font-semibold">Fabrication en cours...</h3>
                <p className="text-gray-400">Votre {workbenchJob.result_item_name} sera prêt bientôt.</p>
                <p className="text-sm text-gray-500 mt-2">(Termine dans ~{timeRemaining > 0 ? timeRemaining : 0}s)</p>
            </div>
        )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 h-[60vh]">
        <div className="flex flex-col border-r border-gray-700">
          <h3 className="p-4 font-semibold border-b border-gray-700">Recettes disponibles</h3>
          <ScrollArea className="flex-grow">
            <div className="p-2">
              {recipes.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => handleRecipeSelect(recipe)}
                  className={`w-full text-left p-2 rounded-md flex items-center justify-between ${selectedRecipe?.id === recipe.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                >
                  <div className="flex items-center gap-2">
                    <img src={recipe.items.icon} alt={recipe.items.name} className="w-8 h-8" />
                    <span>{recipe.items.name}</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="flex flex-col">
          {selectedRecipe ? (
            <>
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center gap-4 mb-4">
                  <img src={selectedRecipe.items.icon} alt={selectedRecipe.items.name} className="w-16 h-16 rounded-md" />
                  <div>
                    <h3 className="text-xl font-bold">{selectedRecipe.items.name}</h3>
                    <p className="text-sm text-gray-400">{selectedRecipe.items.description}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Ingrédients requis:</h4>
                  {renderIngredient(selectedRecipe.ingredient1_id, selectedRecipe.ingredient1_quantity)}
                  {renderIngredient(selectedRecipe.ingredient2_id, selectedRecipe.ingredient2_quantity)}
                  {renderIngredient(selectedRecipe.ingredient3_id, selectedRecipe.ingredient3_quantity)}
                </div>
              </div>
              <div className="p-4 flex-grow flex flex-col justify-end">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="craft-count" className="block text-sm font-medium text-gray-300 mb-1">Quantité à fabriquer</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        id="craft-count"
                        min="1"
                        max={calculateMaxCraft(selectedRecipe)}
                        value={maxCraftCount}
                        onChange={(e) => setMaxCraftCount(Number(e.target.value))}
                        className="w-full"
                        disabled={calculateMaxCraft(selectedRecipe) === 0}
                      />
                      <span className="text-lg font-semibold">{maxCraftCount}</span>
                    </div>
                  </div>
                  <Button
                    onClick={handleStartCraft}
                    disabled={calculateMaxCraft(selectedRecipe) === 0 || maxCraftCount === 0 || isCrafting}
                    className="w-full"
                  >
                    {isCrafting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Fabriquer ({selectedRecipe.craft_time_seconds * maxCraftCount}s)
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Sélectionnez une recette pour voir les détails.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-gray-900 text-white border-gray-700 p-0">
        <DialogHeader className="p-4 border-b border-gray-700">
          <DialogTitle>Établi</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}