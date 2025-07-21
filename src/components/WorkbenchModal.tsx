import { Button } from "@/components/ui/button";
import { BaseConstruction, InventoryItem } from "@/types/game";
import { Hammer, Trash2, ArrowRight, Loader2, BookOpen, Square } from "lucide-react";
import { useState, useEffect } from "react";
import { useGame } from "@/contexts/GameContext";
import InventorySlot from "./InventorySlot";
import ItemIcon from "./ItemIcon";
import ItemDetailModal from "./ItemDetailModal";
import BlueprintModal from "./BlueprintModal";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import WorkbenchInventorySelectorModal from "./WorkbenchInventorySelectorModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ActionModal from "./ActionModal";
import { useWorkbench } from "@/hooks/useWorkbench";
import { showError } from "@/utils/toast";
import BuildingUpgradePanel from "./BuildingUpgradePanel";

interface WorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: (silent?: boolean) => void;
  onOpenInventory: () => void;
}

const WorkbenchModal = ({ isOpen, onClose, construction, onDemolish, onUpdate, onOpenInventory }: WorkbenchModalProps) => {
  const { playerData, getIconUrl } = useGame();
  const [detailedItem, setDetailedItem] = useState<{ item: InventoryItem; source: 'crafting' } | null>(null);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [craftQuantity, setCraftQuantity] = useState(1);
  const [isInventorySelectorOpen, setIsInventorySelectorOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState<number | null>(null);
  const [inventoryFullModal, setInventoryFullModal] = useState(false);

  const {
    isLoadingAction,
    currentJob,
    ingredientSlots,
    outputItem,
    matchedRecipe,
    resultItem,
    maxCraftQuantity,
    progress,
    timeRemaining,
    startCraft,
    cancelCraft,
    collectOutput,
    discardOutput,
    moveItemToInventory,
    moveItemFromInventory,
    draggedItem,
    dragOver,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  } = useWorkbench(construction, onUpdate);

  useEffect(() => {
    if (craftQuantity > maxCraftQuantity) setCraftQuantity(maxCraftQuantity > 0 ? maxCraftQuantity : 1);
    if (maxCraftQuantity === 0 && craftQuantity !== 1) setCraftQuantity(1);
  }, [maxCraftQuantity, craftQuantity]);

  useEffect(() => {
    const moveHandler = (e: MouseEvent | TouchEvent) => {
      const { clientX, clientY } = 'touches' in e ? e.touches[0] : e;
      handleDragMove(clientX, clientY);
    };
    const endHandler = () => handleDragEnd();

    if (draggedItem) {
      window.addEventListener('mousemove', moveHandler);
      window.addEventListener('mouseup', endHandler);
      window.addEventListener('touchmove', moveHandler, { passive: false });
      window.addEventListener('touchend', endHandler);
    }

    return () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', endHandler);
      window.removeEventListener('touchmove', moveHandler);
      window.removeEventListener('touchend', endHandler);
    };
  }, [draggedItem, handleDragMove, handleDragEnd]);

  const handleStartCraft = () => {
    startCraft(craftQuantity);
  };

  const handleCollect = async () => {
    const { inventoryFull } = await collectOutput();
    if (inventoryFull) {
      setInventoryFullModal(true);
    }
  };

  const handleDiscard = async () => {
    setInventoryFullModal(false);
    await discardOutput();
  };

  const handleOpenInventorySelector = (slotIndex: number) => {
    setTargetSlot(slotIndex);
    setIsInventorySelectorOpen(true);
  };

  const handleItemSelectForWorkbench = async (item: InventoryItem, quantity: number) => {
    if (targetSlot === null) return;
    setIsInventorySelectorOpen(false);
    await moveItemFromInventory(item.id, quantity, targetSlot);
    setTargetSlot(null);
  };

  const handleRemoveItemFromWorkbench = async (item: InventoryItem) => {
    if (isLoadingAction) return;
    await moveItemToInventory(item.id, item.quantity);
  };

  if (!isOpen || !construction) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-sm bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Hammer className="w-7 h-7 text-white" />
              <div>
                <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Établi</DialogTitle>
                <p className="text-sm text-neutral-400 font-mono mt-1">Niveau {construction.level}</p>
              </div>
            </div>
          </DialogHeader>
          
          <div className="w-full max-w-sm mx-auto">
            <div className="bg-black/20 rounded-lg p-3 border border-slate-700 space-y-3">
              <div className="flex flex-row items-center justify-center gap-2">
                {/* Ingredients */}
                <div className="grid grid-cols-3 gap-1" data-slot-target="workbench">
                  {ingredientSlots.map((item, index) => (
                    <div key={item?.id || index} className="w-12 h-12">
                      <InventorySlot
                        item={item}
                        index={index}
                        isUnlocked={true}
                        onDragStart={(idx, node, e) => handleDragStart(idx, node, e)}
                        onItemClick={() => handleOpenInventorySelector(index)}
                        isBeingDragged={draggedItem?.index === index}
                        isDragOver={dragOver?.index === index}
                        isLocked={!!currentJob}
                        onRemove={handleRemoveItemFromWorkbench}
                      />
                    </div>
                  ))}
                </div>

                <ArrowRight className="w-5 h-5 text-gray-500 shrink-0" />

                {/* Result */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={outputItem && !currentJob ? handleCollect : undefined}
                    disabled={isLoadingAction || !!currentJob || !outputItem}
                    className={cn(
                      "relative w-14 h-14 bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center",
                      outputItem && !currentJob && "cursor-pointer hover:bg-slate-900/80 hover:border-slate-500 transition-colors"
                    )}
                  >
                    {currentJob ? (
                      <>
                        <ItemIcon iconName={getIconUrl(currentJob.result_item_icon) || currentJob.result_item_icon} alt={currentJob.result_item_name} className="grayscale opacity-50" />
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-lg text-white">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          {currentJob.initial_quantity > 1 && (
                            <span className="text-xs font-mono mt-1">
                              {currentJob.initial_quantity - currentJob.quantity + 1}/{currentJob.initial_quantity}
                            </span>
                          )}
                        </div>
                      </>
                    ) : outputItem ? (
                      <>
                        <ItemIcon iconName={getIconUrl(outputItem.items?.icon) || outputItem.items?.icon} alt={outputItem.items?.name || ''} />
                        <span className="absolute bottom-1 right-1.5 text-lg font-bold text-white z-10" style={{ textShadow: '1px 1px 2px black' }}>
                          x{outputItem.quantity}
                        </span>
                      </>
                    ) : resultItem ? (
                      <>
                        <ItemIcon iconName={getIconUrl(resultItem.icon) || resultItem.icon} alt={resultItem.name} />
                        <div className="absolute inset-0 bg-black/30 rounded-lg"></div>
                      </>
                    ) : null}
                  </button>
                </div>
              </div>
              
              <div className="pt-3 border-t border-slate-700">
                <div className="h-auto flex flex-col justify-center items-center space-y-2">
                  {currentJob ? (
                    <div className="w-full space-y-2 px-4">
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="flex-grow" indicatorClassName="transition-none" />
                        <Button size="icon" variant="destructive" onClick={cancelCraft} disabled={isLoadingAction}>
                          <Square className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-center text-sm text-gray-300 font-mono h-5 flex items-center justify-center gap-x-3">
                        {isLoadingAction && !currentJob ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            {timeRemaining && <span>{timeRemaining}</span>}
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {matchedRecipe && maxCraftQuantity > 0 ? (
                        <div className="w-full px-4 space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span>Quantité: <span className="font-bold text-white">{craftQuantity}</span></span>
                          </div>
                          <Slider value={[craftQuantity]} onValueChange={(value) => setCraftQuantity(value[0])} min={1} max={maxCraftQuantity} step={1} disabled={isLoadingAction} />
                          <Button onClick={handleStartCraft} disabled={!matchedRecipe || isLoadingAction || craftQuantity === 0} className="w-full">
                            {isLoadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : `Fabriquer ${craftQuantity}x`}
                          </Button>
                        </div>
                      ) : matchedRecipe ? (
                        <p className="text-center text-xs text-yellow-400 px-4">
                          {resultItem && !resultItem.stackable && outputItem ? "Collectez l'objet pour fabriquer." : "Ressources insuffisantes."}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400">Placez des ingrédients pour voir les recettes.</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <BuildingUpgradePanel construction={construction} onClose={onClose} />

          <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsBlueprintModalOpen(true)}>
              <BookOpen className="w-4 h-4 mr-2" /> Blueprints
            </Button>
            <Button variant="destructive" onClick={() => onDemolish(construction)}>
              <Trash2 className="w-4 h-4 mr-2" /> Détruire l'établi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ItemDetailModal
        isOpen={!!detailedItem}
        onClose={() => setDetailedItem(null)}
        item={detailedItem?.item || null}
        source={detailedItem?.source}
        onUse={() => showError("Vous ne pouvez pas utiliser un objet depuis l'établi.")}
        onDropOne={() => {}}
        onDropAll={() => {}}
        onUpdate={onUpdate}
        onTransferFromWorkbench={() => {}}
      />
      <BlueprintModal isOpen={isBlueprintModalOpen} onClose={() => setIsBlueprintModalOpen(false)} />
      <WorkbenchInventorySelectorModal
        isOpen={isInventorySelectorOpen}
        onClose={() => setIsInventorySelectorOpen(false)}
        inventory={playerData.inventory}
        onSelectItem={handleItemSelectForWorkbench}
      />
      <ActionModal
        isOpen={inventoryFullModal}
        onClose={() => setInventoryFullModal(false)}
        title="Inventaire plein"
        description="Votre inventaire est plein. Vous pouvez faire de la place ou jeter l'objet fabriqué pour continuer."
        actions={[
          { label: "Faire de la place", onClick: () => { setInventoryFullModal(false); onOpenInventory(); }, variant: "default" },
          { label: "Jeter l'objet", onClick: handleDiscard, variant: "destructive" },
        ]}
      />
    </>
  );
};

export default WorkbenchModal;