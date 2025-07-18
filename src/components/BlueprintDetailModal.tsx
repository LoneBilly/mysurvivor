"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import ItemSlot from './ItemSlot'; // Import the new ItemSlot component

// Define types for the blueprint and its nested objects based on schema
interface Item {
  id: number;
  name: string;
  icon?: string;
  type: string;
  stackable: boolean;
}

interface CraftingRecipe {
  id: number;
  result_item_id: number;
  result_quantity: number;
  craft_time_seconds: number;
  slot1_item_id?: number;
  slot1_quantity?: number;
  slot2_item_id?: number;
  slot2_quantity?: number;
  slot3_item_id?: number;
  slot3_quantity?: number;
}

interface BlueprintData {
  id: number;
  name: string; // Name of the blueprint itself (e.g., "Blueprint: Wooden Axe")
  description: string;
  icon?: string;
  recipe: CraftingRecipe;
  result_item: Item; // Details of the item that is crafted
  slot1_item?: Item; // Details for ingredient 1
  slot2_item?: Item; // Details for ingredient 2
  slot3_item?: Item; // Details for ingredient 3
}

interface BlueprintDetailModalProps {
  blueprint: BlueprintData;
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean; // Prop to indicate mobile view
}

const BlueprintDetailModal: React.FC<BlueprintDetailModalProps> = ({ blueprint, isOpen, onClose, isMobile }) => {
  if (!blueprint) return null;

  const { recipe, result_item, slot1_item, slot2_item, slot3_item } = blueprint;

  const ingredients = [
    { item: slot1_item, quantity: recipe.slot1_quantity },
    { item: slot2_item, quantity: recipe.slot2_quantity },
    { item: slot3_item, quantity: recipe.slot3_quantity },
  ].filter(ing => ing.item && ing.quantity); // Filter out empty slots

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] md:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{blueprint.name}</DialogTitle>
          <DialogDescription>{blueprint.description}</DialogDescription>
        </DialogHeader>

        {/* Main content area for recipe display */}
        <div className={cn(
          "py-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8",
          "flex-wrap", // Allow items to wrap to the next line on smaller screens
          "px-4", // Add horizontal padding for better mobile readability
          isMobile ? "overflow-y-auto no-scrollbar" : ""
        )}>
          {ingredients.length > 0 ? (
            <>
              <div className="flex flex-wrap justify-center gap-4">
                {ingredients.map((ing, index) => (
                  <ItemSlot key={index} item={ing.item} quantity={ing.quantity} />
                ))}
              </div>
              <ArrowRight className="h-8 w-8 text-gray-500 flex-shrink-0 my-4 sm:my-0" />
              <ItemSlot item={result_item} quantity={recipe.result_quantity} />
            </>
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-400">Aucune recette définie pour ce blueprint.</p>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 pt-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-0 sm:mr-auto">
            Temps de fabrication: {recipe.craft_time_seconds} secondes
          </div>
          <Button onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BlueprintDetailModal;