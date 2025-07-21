import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, Flame, Wrench } from "lucide-react";
import BuildingForm from './BuildingForm';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Item } from '@/types/admin';
import CampfireManager from './CampfireManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BuildingManagerProps {
  buildings: any[];
  onBuildingsUpdate: () => void;
  allItems: Item[];
}

const BuildingManager = ({ buildings, onBuildingsUpdate, allItems }: BuildingManagerProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<any | null>(null);

  const handleEdit = (building: any) => {
    setSelectedBuilding(building);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setSelectedBuilding(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (buildingType: string) => {
    if (window.confirm(`Voulez-vous vraiment supprimer le bâtiment ${buildingType} ?`)) {
      const { error } = await supabase.from('building_definitions').delete().eq('type', buildingType);
      if (error) {
        showError(`Erreur lors de la suppression : ${error.message}`);
      } else {
        showSuccess("Bâtiment supprimé.");
        onBuildingsUpdate();
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedBuilding(null);
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <Tabs defaultValue="definitions" className="w-full flex flex-col flex-1 min-h-0">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="definitions"><Wrench className="w-4 h-4 mr-2" />Définitions</TabsTrigger>
          <TabsTrigger value="campfire"><Flame className="w-4 h-4 mr-2" />Feu de camp</TabsTrigger>
        </TabsList>
        <TabsContent value="definitions" className="flex-1 min-h-0 mt-4 flex flex-col">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h2 className="text-2xl font-bold">Gestion des Bâtiments</h2>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNew}>
                  <PlusCircle className="w-4 h-4 mr-2" /> Ajouter un bâtiment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] bg-gray-800 border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle>{selectedBuilding ? "Modifier" : "Ajouter"} un bâtiment</DialogTitle>
                </DialogHeader>
                <BuildingForm
                  building={selectedBuilding}
                  onSuccess={() => {
                    handleFormClose();
                    onBuildingsUpdate();
                  }}
                  onCancel={handleFormClose}
                />
              </DialogContent>
            </Dialog>
          </div>
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type (ID)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildings.map((building) => (
                  <TableRow key={building.type}>
                    <TableCell>{building.name}</TableCell>
                    <TableCell>{building.type}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(building)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(building.type)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="campfire" className="flex-1 min-h-0 mt-4 overflow-auto">
          <CampfireManager allItems={allItems} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BuildingManager;