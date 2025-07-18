import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Loader2, BookOpen, Search, Eye } from 'lucide-react';
import { CraftingRecipe, Item } from '@/types/game';
import { useGame } from '@/contexts/GameContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import BlueprintDetailModal from './BlueprintDetailModal';
import { useIsMobile } from '@/hooks/use-mobile';

interface BlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LearnedBlueprint {
  recipe_id: number;
}

const BlueprintModal = ({ isOpen, onClose }: BlueprintModalProps) => {
  const { items: allItems } = useGame();
  const isMobile = useIsMobile();
  const [learnedRecipes, setLearnedRecipes] = useState<CraftingRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedRecipeForDetail, setSelectedRecipeForDetail] = useState<CraftingRecipe | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchLearnedBlueprints = useCallback(async () => {
    setLoading(true);
    try {
      const { data: learnedData, error: learnedError } = await supabase
        .from('learned_blueprints')
        .select('recipe_id');
      
      if (learnedError) throw learnedError;

      const recipeIds = (learnedData as LearnedBlueprint[]).map(b => b.recipe_id);

      if (recipeIds.length === 0) {
        setLearnedRecipes([]);
        setLoading(false);
        return;
      }

      const { data: recipesData, error: recipesError } = await supabase
        .from('crafting_recipes')
        .select('*')
        .in('id', recipeIds);

      if (recipesError) throw recipesError;

      setLearnedRecipes(recipesData || []);

    } catch (error: any) {
      showError("Impossible de charger vos blueprints.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLearnedBlueprints();
      setSearchTerm('');
      setSelectedType('all');
      setSelectedRecipeForDetail(null);
      setIsDetailModalOpen(false);
    }
  }, [isOpen, fetchLearnedBlueprints]);

  const uniqueItemTypes = useMemo(() => {
    const types = new Set<string>();
    allItems.forEach(item => {
      if (item.type !== 'Blueprint') { // Exclude 'Blueprint' type
        types.add(item.type);
      }
    });
    return ['all', ...Array.from(types).sort()];
  }, [allItems]);

  const filteredRecipes = useMemo(() => {
    return learnedRecipes.filter(recipe => {
      const resultItem = allItems.find(item => item.id === recipe.result_item_id);
      const matchesSearch = resultItem?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'all' || resultItem?.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [learnedRecipes, allItems, searchTerm, selectedType]);

  const handleViewRecipe = (recipe: CraftingRecipe) => {
    setSelectedRecipeForDetail(recipe);
    setIsDetailModalOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl w-full h-[80vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col">
          <DialogHeader className="text-center flex-shrink-0">
            <BookOpen className="w-10 h-10 mx-auto text-white mb-2" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Blueprints</DialogTitle>
            <DialogDescription>Recettes que vous avez apprises.</DialogDescription>
          </DialogHeader>

          <div className={cn("flex flex-grow mt-4 min-h-0", isMobile ? "flex-col" : "flex-row")}>
            {/* Filters and Search */}
            <div className={cn("flex-shrink-0", isMobile ? "w-full mb-4" : "w-1/4 min-w-[150px] max-w-[200px] border-r border-slate-700 pr-4 overflow-y-auto no-scrollbar")}>
              {isMobile ? (
                <div className="flex flex-col gap-3">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher un blueprint..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20"
                    />
                  </div>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-white/10 border-white/20 px-3 h-10 rounded-lg text-white focus:ring-white/30 focus:border-white/30"
                  >
                    {uniqueItemTypes.map(type => (
                      <option key={type} value={type}>
                        {type === 'all' ? 'Tous les types' : type}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-lg mb-3">Types</h3>
                  <div className="flex flex-col space-y-2">
                    {uniqueItemTypes.map(type => (
                      <Button
                        key={type}
                        variant="ghost"
                        onClick={() => setSelectedType(type)}
                        className={cn(
                          "justify-start",
                          selectedType === type && "bg-white/10 hover:bg-white/15"
                        )}
                      >
                        {type === 'all' ? 'Tous' : type}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Right Panel: List */}
            <div className={cn("flex-grow flex flex-col min-h-0", isMobile ? "pl-0" : "pl-4")}>
              {!isMobile && (
                <div className="relative mb-4 flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher un blueprint..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20"
                  />
                </div>
              )}

              <div className="flex-grow overflow-y-auto no-scrollbar space-y-3">
                {loading ? (
                  <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>
                ) : filteredRecipes.length > 0 ? (
                  filteredRecipes.map(recipe => {
                    const resultItem = allItems.find(item => item.id === recipe.result_item_id);
                    if (!resultItem) return null;

                    return (
                      <Card key={recipe.id} className="bg-white/5 border-white/10">
                        <CardContent className="p-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-grow min-w-0">
                            <div className="w-12 h-12 relative flex-shrink-0">
                              <img src={resultItem.icon ? (resultItem.icon.startsWith('http') ? resultItem.icon : `/icons/${resultItem.icon}`) : '/icons/default.webp'} alt={resultItem.name} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-grow min-w-0">
                              <p className="font-bold text-white truncate">{resultItem.name}</p>
                              <p className="text-sm text-gray-400 truncate">x{recipe.result_quantity}</p>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => handleViewRecipe(recipe)}>
                            <Eye className="w-4 h-4 mr-2" /> Voir la recette
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <p className="text-center text-gray-400 py-10">
                    {searchTerm || selectedType !== 'all' ? "Aucun blueprint trouvé avec ces critères." : "Vous n'avez appris aucun blueprint."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BlueprintDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        recipe={selectedRecipeForDetail}
      />
    </>
  );
};

export default BlueprintModal;