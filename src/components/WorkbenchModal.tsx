// ... existing code ...

const WorkbenchModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: WorkbenchModalProps) => {
  // ... existing code ...

  const displayedOutputItem = optimisticOutputItem || itemToCollect;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-full bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Hammer className="w-7 h-7 text-white" />
              <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Établi</DialogTitle>
            </div>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-center">Établi</h3>
                  <Button variant="outline" size="sm" onClick={() => setIsBlueprintModalOpen(true)}>
                    <BookOpen className="w-4 h-4 mr-2" /> Blueprints
                  </Button>
                </div>
                <div className="bg-black/20 rounded-lg p-4 border border-slate-700 space-y-4">
                  <div className="grid grid-cols-5 gap-2" data-slot-target="crafting">
                    <div />
                    {ingredientSlots.map((item, index) => (
                      <div key={item?.id || index}>
                        <InventorySlot
                          item={item}
                          index={index}
                          isUnlocked={true}
                          onDragStart={(idx, node, e) => handleDragStart(idx, 'crafting', node, e)}
                          onItemClick={(clickedItem) => setDetailedItem({ item: clickedItem, source: 'crafting' })}
                          isBeingDragged={draggedItem?.source === 'crafting' && draggedItem?.index === index}
                          isDragOver={dragOver?.target === 'crafting' && dragOver?.index === index}
                          isLocked={!!currentJob || craftsRemaining > 0}
                        />
                      </div>
                    ))}
                    <div />
                  </div>
                  <div className="grid grid-cols-5 items-center gap-2">
                    <div className="col-span-2 flex justify-end">
                        <ArrowRight className="w-8 h-8 text-gray-500" />
                    </div>
                    <div 
                      className={cn(
                        "relative w-full aspect-square bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center",
                        displayedOutputItem && "cursor-grab active:cursor-grabbing"
                      )}
                      draggable={!!displayedOutputItem}
                      onDragStart={handleDragStartOutput}
                      onDragEnd={() => setIsDraggingOutput(false)}
                    >
                      {currentJob ? (
                        <>
                          <ItemIcon iconName={getIconUrl(currentJob.result_item_icon) || currentJob.result_item_icon} alt={currentJob.result_item_name} className="grayscale opacity-50" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-6 h-6 animate-spin text-white" />
                              {displayedOutputItem && (
                                <span className="text-sm font-bold text-white">
                                  x{displayedOutputItem.quantity}
                                </span>
                              )}
                            </div>
                          </div>
                        </>
                      ) : displayedOutputItem ? (
                        <>
                          <ItemIcon iconName={getIconUrl(displayedOutputItem.items?.icon) || displayedOutputItem.items?.icon} alt={displayedOutputItem.items?.name || ''} />
                          <span className="absolute bottom-1 right-1.5 text-lg font-bold text-white z-10" style={{ textShadow: '1px 1px 2px black' }}>
                            x{displayedOutputItem.quantity}
                          </span>
                        </>
                      ) : resultItem && (
                        <>
                          <ItemIcon iconName={getIconUrl(resultItem.icon) || resultItem.icon} alt={resultItem.name} />
                          {matchedRecipe && resultItem.stackable && (
                            <span className="absolute bottom-1 right-1.5 text-lg font-bold text-white z-10" style={{ textShadow: '1px 1px 2px black' }}>
                              x{craftQuantity * matchedRecipe.result_quantity}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="col-span-2" />
                  </div>
                  
                  <div className="h-[120px] flex flex-col justify-center items-center space-y-2">
                    {currentJob || craftsRemaining > 0 ? (
                      <div className="w-full space-y-2 px-4">
                        <div className="flex items-center gap-2">
                          <Progress value={currentJob ? progress : 0} className="flex-grow" />
                          <Button size="icon" variant="destructive" onClick={handleCancelCraft} disabled={isLoadingAction}>
                            <Square className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-center text-sm text-gray-300 font-mono">
                          {currentJob && timeRemaining > 0 ? `${timeRemaining}s` : (currentJob ? 'Terminé...' : 'Démarrage...')}
                          {craftsRemaining > 1 && (
                            <span className="ml-2 text-yellow-400">({craftsRemaining - 1} en file)</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full px-4 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span>Quantité: <span className="font-bold text-white">{craftQuantity}</span></span>
                        </div>
                        <Slider
                            value={[craftQuantity]}
                            onValueChange={(value) => setCraftQuantity(value[0])}
                            min={1}
                            max={maxCraftQuantity}
                            disabled={isLoadingAction}
                        />
                        <Button 
                          onClick={handleStartBatchCraft} 
                          disabled={!matchedRecipe || isLoadingAction || craftQuantity === 0}
                          className="w-full"
                        >
                          {isLoadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : `Fabriquer ${craftQuantity}x`}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                // ... rest of the code ...
            </div>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => construction && onDemolish(construction)}>
              <Trash2 className="w-4 h-4 mr-2" /> Détruire l'établi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      // ... rest of the code ...
    </>
  );
};

export default WorkbenchModal;