"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { toast } from 'react-hot-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { Ban, Pencil, Trash2 } from 'lucide-react';

interface Item {
  id: number;
  name: string;
  description: string;
  icon: string;
  stackable: boolean;
  type: string;
  use_action_text: string | null;
  recipe_id: number | null;
  effects: any | null;
}

interface Recipe {
  id: number;
  result_item_id: number;
  result_quantity: number;
  slot1_item_id: number | null;
  slot1_quantity: number | null;
  slot2_item_id: number | null;
  slot2_quantity: number | null;
  slot3_item_id: number | null;
  slot3_quantity: number | null;
  craft_time_seconds: number;
}

const ItemManager = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    icon: '',
    stackable: true,
    type: 'Items divers',
    use_action_text: '',
    is_craftable: false,
    effects: '{}', // JSON string
  });
  const [newRecipe, setNewRecipe] = useState({
    result_quantity: 1,
    slot1_item_id: null as number | null,
    slot1_quantity: null as number | null,
    slot2_item_id: null as number | null,
    slot2_quantity: null as number | null,
    slot3_item_id: null as number | null,
    slot3_quantity: null as number | null,
    craft_time_seconds: 10,
  });

  const fetchItemsAndRecipes = async () => {
    const { data: itemsData, error: itemsError } = await supabase.from('items').select('*');
    const { data: recipesData, error: recipesError } = await supabase.from('crafting_recipes').select('*');

    if (itemsError) {
      console.error('Error fetching items:', itemsError);
      toast.error('Failed to fetch items.');
    } else {
      setItems(itemsData || []);
    }

    if (recipesError) {
      console.error('Error fetching recipes:', recipesError);
      toast.error('Failed to fetch recipes.');
    } else {
      setRecipes(recipesData || []);
    }
  };

  useEffect(() => {
    fetchItemsAndRecipes();
  }, []);

  const handleItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setNewItem(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setNewItem(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRecipeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewRecipe(prev => ({ ...prev, [name]: value === '' ? null : Number(value) }));
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedEffects = newItem.effects ? JSON.parse(newItem.effects) : null;

      const { data: newItems, error } = await supabase.rpc('create_item_and_recipe', {
        p_name: newItem.name,
        p_description: newItem.description,
        p_icon: newItem.icon,
        p_stackable: newItem.stackable,
        p_type: newItem.type,
        p_use_action_text: newItem.use_action_text || null,
        p_is_craftable: newItem.is_craftable,
        p_effects: parsedEffects,
        p_recipe_result_quantity: newItem.is_craftable ? newRecipe.result_quantity : 1,
        p_recipe_slot1_item_id: newItem.is_craftable ? newRecipe.slot1_item_id : null,
        p_recipe_slot1_quantity: newItem.is_craftable ? newRecipe.slot1_quantity : null,
        p_recipe_slot2_item_id: newItem.is_craftable ? newRecipe.slot2_item_id : null,
        p_recipe_slot2_quantity: newItem.is_craftable ? newRecipe.slot2_quantity : null,
        p_recipe_slot3_item_id: newItem.is_craftable ? newRecipe.slot3_item_id : null,
        p_recipe_slot3_quantity: newItem.is_craftable ? newRecipe.slot3_quantity : null,
        p_recipe_craft_time_seconds: newItem.is_craftable ? newRecipe.craft_time_seconds : 10,
      });

      if (error) {
        throw error;
      }

      toast.success('Item added successfully!');
      
      // Dynamically update the list with the new item(s)
      if (newItems && newItems.length > 0) {
        setItems(prevItems => [...prevItems, ...newItems]);
        // If a recipe was created, re-fetch recipes to ensure consistency
        if (newItem.is_craftable && newItems[0].recipe_id) {
            const { data: updatedRecipes, error: recipesFetchError } = await supabase.from('crafting_recipes').select('*');
            if (recipesFetchError) {
                console.error('Error re-fetching recipes:', recipesFetchError);
            } else {
                setRecipes(updatedRecipes || []);
            }
        }
      }

      // Reset form
      setNewItem({
        name: '',
        description: '',
        icon: '',
        stackable: true,
        type: 'Items divers',
        use_action_text: '',
        is_craftable: false,
        effects: '{}',
      });
      setNewRecipe({
        result_quantity: 1,
        slot1_item_id: null,
        slot1_quantity: null,
        slot2_item_id: null,
        slot2_quantity: null,
        slot3_item_id: null,
        slot3_quantity: null,
        craft_time_seconds: 10,
      });

    } catch (error: any) {
      console.error('Error adding item:', error);
      toast.error(`Failed to add item: ${error.message}`);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700 flex-shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:max-w-xs">
              {/* Search and filter inputs */}
              <Input
                type="text"
                placeholder="Search items..."
                className="w-full pl-10 bg-gray-900 border-gray-600 text-white"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </div>
            <Select>
              <SelectTrigger className="w-full sm:w-[180px] bg-gray-900 border-gray-600 text-white">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 text-white border-gray-600">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="resource">Resource</SelectItem>
                <SelectItem value="consumable">Consumable</SelectItem>
                {/* Add more types as needed */}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
            Add New Item
          </Button>
        </div>

        <div className="flex-grow p-4 overflow-auto">
          <h2 className="text-xl font-semibold mb-4">Add New Item</h2>
          <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" value={newItem.name} onChange={handleItemChange} required className="bg-gray-900 border-gray-600 text-white" />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" value={newItem.description} onChange={handleItemChange} className="bg-gray-900 border-gray-600 text-white" />
            </div>
            <div>
              <Label htmlFor="icon">Icon (URL or name)</Label>
              <Input id="icon" name="icon" value={newItem.icon} onChange={handleItemChange} className="bg-gray-900 border-gray-600 text-white" />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select name="type" value={newItem.type} onValueChange={(value) => handleItemChange({ target: { name: 'type', value, type: 'select' } } as React.ChangeEvent<HTMLSelectElement>)}>
                <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                  <SelectValue placeholder="Select item type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 text-white border-gray-600">
                  <SelectItem value="Items divers">Items divers</SelectItem>
                  <SelectItem value="Ressource">Ressource</SelectItem>
                  <SelectItem value="Consommable">Consommable</SelectItem>
                  <SelectItem value="Outil">Outil</SelectItem>
                  <SelectItem value="Arme">Arme</SelectItem>
                  <SelectItem value="Armure">Armure</SelectItem>
                  <SelectItem value="Sac à dos">Sac à dos</SelectItem>
                  <SelectItem value="Chaussures">Chaussures</SelectItem>
                  <SelectItem value="Vehicule">Vehicule</SelectItem>
                  <SelectItem value="Blueprint">Blueprint</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="stackable" name="stackable" checked={newItem.stackable} onCheckedChange={(checked) => handleItemChange({ target: { name: 'stackable', checked, type: 'checkbox' } } as any)} />
              <Label htmlFor="stackable">Stackable</Label>
            </div>
            <div>
              <Label htmlFor="use_action_text">Use Action Text</Label>
              <Input id="use_action_text" name="use_action_text" value={newItem.use_action_text} onChange={handleItemChange} className="bg-gray-900 border-gray-600 text-white" />
            </div>
            <div>
              <Label htmlFor="effects">Effects (JSON)</Label>
              <Textarea id="effects" name="effects" value={newItem.effects} onChange={handleItemChange} placeholder='{"restaure_vie": 20}' className="bg-gray-900 border-gray-600 text-white" />
            </div>
            <div className="flex items-center space-x-2 col-span-full">
              <Checkbox id="is_craftable" name="is_craftable" checked={newItem.is_craftable} onCheckedChange={(checked) => setNewItem(prev => ({ ...prev, is_craftable: checked as boolean }))} />
              <Label htmlFor="is_craftable">Is Craftable?</Label>
            </div>

            {newItem.is_craftable && (
              <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md border-gray-600">
                <h3 className="col-span-full text-lg font-semibold mb-2">Recipe Details</h3>
                <div>
                  <Label htmlFor="result_quantity">Result Quantity</Label>
                  <Input id="result_quantity" name="result_quantity" type="number" value={newRecipe.result_quantity} onChange={handleRecipeChange} min="1" className="bg-gray-900 border-gray-600 text-white" />
                </div>
                <div>
                  <Label htmlFor="craft_time_seconds">Craft Time (seconds)</Label>
                  <Input id="craft_time_seconds" name="craft_time_seconds" type="number" value={newRecipe.craft_time_seconds} onChange={handleRecipeChange} min="1" className="bg-gray-900 border-gray-600 text-white" />
                </div>
                {/* Slot 1 */}
                <div>
                  <Label htmlFor="slot1_item_id">Slot 1 Item</Label>
                  <Select name="slot1_item_id" value={newRecipe.slot1_item_id?.toString() || ''} onValueChange={(value) => handleRecipeChange({ target: { name: 'slot1_item_id', value, type: 'select' } } as React.ChangeEvent<HTMLSelectElement>)}>
                    <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 text-white border-gray-600">
                      {items.map(item => (
                        <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="slot1_quantity">Slot 1 Quantity</Label>
                  <Input id="slot1_quantity" name="slot1_quantity" type="number" value={newRecipe.slot1_quantity || ''} onChange={handleRecipeChange} min="1" className="bg-gray-900 border-gray-600 text-white" />
                </div>
                {/* Slot 2 */}
                <div>
                  <Label htmlFor="slot2_item_id">Slot 2 Item</Label>
                  <Select name="slot2_item_id" value={newRecipe.slot2_item_id?.toString() || ''} onValueChange={(value) => handleRecipeChange({ target: { name: 'slot2_item_id', value, type: 'select' } } as React.ChangeEvent<HTMLSelectElement>)}>
                    <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 text-white border-gray-600">
                      {items.map(item => (
                        <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="slot2_quantity">Slot 2 Quantity</Label>
                  <Input id="slot2_quantity" name="slot2_quantity" type="number" value={newRecipe.slot2_quantity || ''} onChange={handleRecipeChange} min="1" className="bg-gray-900 border-gray-600 text-white" />
                </div>
                {/* Slot 3 */}
                <div>
                  <Label htmlFor="slot3_item_id">Slot 3 Item</Label>
                  <Select name="slot3_item_id" value={newRecipe.slot3_item_id?.toString() || ''} onValueChange={(value) => handleRecipeChange({ target: { name: 'slot3_item_id', value, type: 'select' } } as React.ChangeEvent<HTMLSelectElement>)}>
                    <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 text-white border-gray-600">
                      {items.map(item => (
                        <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="slot3_quantity">Slot 3 Quantity</Label>
                  <Input id="slot3_quantity" name="slot3_quantity" type="number" value={newRecipe.slot3_quantity || ''} onChange={handleRecipeChange} min="1" className="bg-gray-900 border-gray-600 text-white" />
                </div>
              </div>
            )}
            <Button type="submit" className="col-span-full bg-green-600 hover:bg-green-700 text-white">Add Item</Button>
          </form>

          <h2 className="text-xl font-semibold mb-4">Existing Items</h2>
          <div className="rounded-md border border-gray-700 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-700">
                <TableRow>
                  <TableHead className="w-[50px] text-gray-300">ID</TableHead>
                  <TableHead className="text-gray-300">Name</TableHead>
                  <TableHead className="text-gray-300">Type</TableHead>
                  <TableHead className="text-gray-300">Stackable</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="border-b border-gray-700 hover:bg-gray-800">
                    <TableCell className="font-medium text-gray-300">{item.id}</TableCell>
                    <TableCell className="text-gray-300">{item.name}</TableCell>
                    <TableCell className="text-gray-300">{item.type}</TableCell>
                    <TableCell className="text-gray-300">{item.stackable ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-blue-400 hover:text-blue-300">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  );
};

export default ItemManager;