import { useEffect } from "react";
// ... autres imports ...

interface WorkbenchModalProps {
  isOpen: boolean;
  onClose: () => void;
  construction: BaseConstruction | null;
  onDemolish: (construction: BaseConstruction) => void;
  onUpdate: () => void;
}

// ... code existant ...

const WorkbenchModal = ({ isOpen, onClose, construction, onDemolish, onUpdate }: WorkbenchModalProps) => {
  // ... code existant ...

  const [outputItem, setOutputItem] = useState<{ item_id: number, quantity: number } | null>(null);

  // ... code existant ...

  const handleFinalizeAndCollect = async (targetSlot: number | null = null) => {
    if (!outputSlot || !user || isCollecting) return;
    setIsCollecting(true);

    // Enregistrer l'item de sortie
    if (resultItem) {
      setOutputItem({ item_id: resultItem.id, quantity: outputSlot.quantity || 0 });
    }

    // ... reste du code ...
  };

  // Dans le useEffect qui surveille isContinuousCrafting, ajouter :
  useEffect(() => {
    if (!isContinuousCrafting || !matchedRecipe || !construction) return;

    const craftNextItem = () => {
      if (currentCraftCount >= maxCraftCount) {
        setIsContinuousCrafting(false);
        showSuccess("Fabrication en série terminée !");
        return;
      }

      const craftTime = matchedRecipe.craft_time_seconds * 1000;
      const startTime = Date.now();
      
      craftTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min(100, (elapsed / craftTime) * 100);
        setProgress(newProgress);

        // Calculer le temps restant
        const timeLeft = Math.ceil((craftTime - elapsed) / 1000);
        setTimeLeft(timeLeft);

        if (elapsed >= craftTime) {
          // ... reste du code ...
        }
      }, 100);
    };

    // ... reste du code ...

  // Dans le rendu de l'interface, ajouter :
  <div className="text-center text-sm text-gray-300">
    <p>Temps de fabrication: {matchedRecipe?.craft_time_seconds}s</p>
    {isContinuousCrafting && timeLeft > 0 && (
      <p>Temps restant: {timeLeft}s</p>
    )}
  </div>

  // ... reste du code ...
};

export default WorkbenchModal;