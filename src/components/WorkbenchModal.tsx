import { Hammer, Clock, Package, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ItemIcon from '@/components/ItemIcon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function WorkbenchModal({ isOpen, onClose, workbench, recipes, workbenchItems, allItems, craftingJobs, refreshData }) {
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [outputItemDetails, setOutputItemDetails] = useState(null);

    const activeJob = useMemo(() => 
        craftingJobs?.find(job => job.workbench_id === workbench?.id),
        [craftingJobs, workbench]
    );

    const [timeLeft, setTimeLeft] = useState(0);
    const [craftingProgress, setCraftingProgress] = useState(0);

    useEffect(() => {
        if (workbench?.output_item_id && allItems) {
            setOutputItemDetails(allItems.find(item => item.id === workbench.output_item_id));
        } else {
            setOutputItemDetails(null);
        }
    }, [workbench?.output_item_id, allItems]);

    useEffect(() => {
        if (!activeJob) {
            setCraftingProgress(0);
            setTimeLeft(0);
            return;
        }

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const endsAt = new Date(activeJob.ends_at).getTime();
            const startedAt = new Date(activeJob.started_at).getTime();
            
            const remaining = Math.max(0, endsAt - now);
            setTimeLeft(Math.ceil(remaining / 1000));

            if (remaining > 0) {
                const totalDuration = endsAt - startedAt;
                if (totalDuration > 0) {
                    const elapsed = now - startedAt;
                    setCraftingProgress(Math.min(100, (elapsed / totalDuration) * 100));
                }
            } else {
                setCraftingProgress(100);
                clearInterval(interval);
                toast.info(`Fabrication de ${activeJob.result_item_name} terminée!`);
                refreshData();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [activeJob, refreshData]);

    const handleStartCraft = async () => {
        if (!selectedRecipe) return;
        setIsProcessing(true);
        const { error } = await supabase.rpc('start_craft', {
            p_workbench_id: workbench.id,
            p_recipe_id: selectedRecipe.id,
        });
        if (error) {
            toast.error(`Erreur: ${error.message}`);
        } else {
            toast.success('Fabrication lancée ! Les ressources ont été utilisées.');
            await refreshData();
            setSelectedRecipe(null);
        }
        setIsProcessing(false);
    };

    const handleCollect = async () => {
        setIsProcessing(true);
        const { error } = await supabase.rpc('collect_workbench_output', { p_workbench_id: workbench.id });
        if (error) {
            toast.error(`Erreur: ${error.message}`);
        } else {
            toast.success('Objet récupéré !');
            await refreshData();
        }
        setIsProcessing(false);
    };

    const getIngredientComponent = (id, required) => {
        if (!id || !required) return null;
        const item = allItems.find(i => i.id === id);
        if (!item) return null;
        const available = workbenchItems
            .filter(i => i.item_id === id)
            .reduce((sum, i) => sum + i.quantity, 0);
        const hasEnough = available >= required;

        return (
            <div className={`flex items-center gap-2 p-2 rounded-md ${hasEnough ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                <div className="w-6 h-6 relative"><ItemIcon iconName={item.icon} alt={item.name} /></div>
                <span>{item.name}</span>
                <span className="font-bold ml-auto">{available} / {required}</span>
            </div>
        );
    };

    const canCraft = useMemo(() => {
        if (!selectedRecipe) return false;
        const check = (id, req) => !id || !req || workbenchItems.filter(i => i.item_id === id).reduce((sum, i) => sum + i.quantity, 0) >= req;
        return check(selectedRecipe.ingredient1_id, selectedRecipe.ingredient1_quantity) &&
               check(selectedRecipe.ingredient2_id, selectedRecipe.ingredient2_quantity) &&
               check(selectedRecipe.ingredient3_id, selectedRecipe.ingredient3_quantity);
    }, [selectedRecipe, workbenchItems]);

    const renderContent = () => {
        if (outputItemDetails) {
            return (
                <div className="text-center flex flex-col items-center gap-4 p-8">
                    <h3 className="text-2xl font-bold text-green-400">Fabrication terminée !</h3>
                    <p>Récupérez votre objet.</p>
                    <Card className="bg-slate-700/50 p-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 relative"><ItemIcon iconName={outputItemDetails.icon} alt={outputItemDetails.name} /></div>
                            <div className="text-left">
                                <p className="text-xl font-bold">{outputItemDetails.name}</p>
                                <p className="text-lg">Quantité: {workbench.output_quantity}</p>
                            </div>
                        </div>
                    </Card>
                    <Button onClick={handleCollect} disabled={isProcessing} size="lg" className="mt-4">
                        <Package className="mr-2 h-5 w-5" />
                        Récupérer
                    </Button>
                </div>
            );
        }

        if (activeJob) {
            return (
                <div className="text-center flex flex-col items-center gap-4 p-8">
                    <h3 className="text-2xl font-bold text-yellow-400">Fabrication en cours...</h3>
                    <Card className="bg-slate-700/50 p-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 relative"><ItemIcon iconName={activeJob.result_item_icon} alt={activeJob.result_item_name} /></div>
                            <div className="text-left">
                                <p className="text-xl font-bold">{activeJob.result_item_name}</p>
                                <p className="text-lg">Quantité: {activeJob.result_quantity}</p>
                            </div>
                        </div>
                    </Card>
                    <div className="w-full max-w-md mt-4">
                        <Progress value={craftingProgress} className="w-full" />
                        <div className="flex justify-between text-sm mt-1">
                            <span>{craftingProgress.toFixed(0)}%</span>
                            <span className="font-mono flex items-center"><Clock className="inline w-4 h-4 mr-1" />{timeLeft}s</span>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <h3 className="font-bold text-lg mb-2">Recettes disponibles</h3>
                    <ScrollArea className="h-96 pr-4">
                        <div className="space-y-2">
                            {recipes.map(recipe => (
                                <Card key={recipe.id}
                                    className={`p-3 cursor-pointer transition-colors ${selectedRecipe?.id === recipe.id ? 'bg-slate-600 border-blue-500' : 'bg-slate-700/50 border-slate-700 hover:bg-slate-700'}`}
                                    onClick={() => setSelectedRecipe(recipe)}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 relative"><ItemIcon iconName={allItems.find(i => i.id === recipe.result_item_id)?.icon} alt={allItems.find(i => i.id === recipe.result_item_id)?.name || ''} /></div>
                                        <div>
                                            <p className="font-semibold">{allItems.find(i => i.id === recipe.result_item_id)?.name}</p>
                                            <p className="text-xs text-slate-400">Temps: {recipe.craft_time_seconds}s</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
                <div className="md:col-span-2">
                    {selectedRecipe ? (
                        <Card className="bg-slate-900/50 h-full flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <div className="w-10 h-10 relative"><ItemIcon iconName={allItems.find(i => i.id === selectedRecipe.result_item_id)?.icon} alt={allItems.find(i => i.id === selectedRecipe.result_item_id)?.name || ''} /></div>
                                    <span className="text-2xl">{allItems.find(i => i.id === selectedRecipe.result_item_id)?.name}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col justify-between">
                                <div>
                                    <h4 className="font-bold mb-2">Ingrédients requis :</h4>
                                    <div className="space-y-2 mb-4">
                                        {getIngredientComponent(selectedRecipe.ingredient1_id, selectedRecipe.ingredient1_quantity)}
                                        {getIngredientComponent(selectedRecipe.ingredient2_id, selectedRecipe.ingredient2_quantity)}
                                        {getIngredientComponent(selectedRecipe.ingredient3_id, selectedRecipe.ingredient3_quantity)}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <Clock className="w-5 h-5" />
                                        <span>Temps total: {selectedRecipe.craft_time_seconds}s</span>
                                    </div>
                                </div>
                                <Button onClick={handleStartCraft} disabled={!canCraft || isProcessing} size="lg" className="w-full mt-4">
                                    <Hammer className="mr-2 h-5 w-5" />
                                    Fabriquer {selectedRecipe.result_quantity}x
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            <p className="flex items-center gap-2"><Info className="w-5 h-5" /> Sélectionnez une recette pour voir les détails.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-full bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <Hammer className="w-7 h-7 text-white" />
                        <span className="text-2xl">Établi</span>
                    </DialogTitle>
                </DialogHeader>
                <TooltipProvider>
                    {renderContent()}
                </TooltipProvider>
            </DialogContent>
        </Dialog>
    );
}