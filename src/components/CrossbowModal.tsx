import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BaseConstruction, InventoryItem } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Crosshair, ArrowRight, RotateCw, Hammer, Trash2 } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CrossbowModalProps {
    isOpen: boolean;
    onClose: () => void;
    construction: BaseConstruction | null;
    onUpdate: () => void;
    onDemolish: (construction: BaseConstruction) => void;
    onInspect: (construction: BaseConstruction) => void;
}

const CrossbowModal: React.FC<CrossbowModalProps> = ({ isOpen, onClose, construction, onUpdate, onDemolish, onInspect }) => {
    const { playerData, items } = useGame();
    const [selectedArrowStack, setSelectedArrowStack] = useState<InventoryItem | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [popoverOpen, setPopoverOpen] = useState(false);

    if (!isOpen || !construction) return null;

    const isArmed = construction.building_state?.is_armed || false;
    const arrowQuantity = construction.building_state?.arrow_quantity || 0;
    const arrowItem = items?.find(i => i.name === 'Flèche');
    const playerArrows = playerData?.inventory?.filter(i => i.item_id === arrowItem?.id) || [];

    const handleLoad = async () => {
        if (!selectedArrowStack) {
            showError("Veuillez sélectionner des flèches.");
            return;
        }
        const { error } = await supabase.rpc('load_crossbow', { 
            p_construction_id: construction.id,
            p_inventory_id: selectedArrowStack.id,
            p_quantity: quantity
        });
        if (error) {
            showError(error.message);
        } else {
            showSuccess(`${quantity} flèche(s) chargée(s).`);
            onUpdate();
            onClose();
        }
    };

    const handleArm = async () => {
        const { error } = await supabase.rpc('arm_crossbow', { p_construction_id: construction.id });
        if (error) {
            showError(error.message);
        } else {
            showSuccess("Arbalète armée.");
            onUpdate();
            onClose();
        }
    };
    
    const handleSelectStack = (item: InventoryItem) => {
        setSelectedArrowStack(item);
        setQuantity(1);
        setPopoverOpen(false);
    }

    const handleRotate = async () => {
        const currentRotation = construction.rotation || 0;
        const newRotation = (currentRotation + 1) % 4;
        const { error } = await supabase.rpc('rotate_building', {
            p_construction_id: construction.id,
            p_direction: newRotation,
        });

        if (error) {
            showError(error.message);
        } else {
            showSuccess("Rotation effectuée.");
            onUpdate();
        }
    };

    const handleDemolishClick = () => {
        onClose();
        onDemolish(construction);
    }

    const handleInspectClick = () => {
        onClose();
        onInspect(construction);
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Arbalète de défense</DialogTitle>
                    <DialogDescription>
                        Chargez et armez l'arbalète pour défendre votre base.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div className="text-center flex flex-col items-center">
                        <div className="relative">
                            <Crosshair className="w-16 h-16 text-purple-400" />
                            <Button size="icon" variant="outline" className="absolute -top-2 -right-2 w-8 h-8 rounded-full" onClick={handleRotate}>
                                <RotateCw className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="mt-4 font-bold text-lg">Flèches chargées: {arrowQuantity}</p>
                        <p className="mt-1 text-sm">{isArmed ? "Statut: Armée" : "Statut: Non armée"}</p>
                    </div>
                    
                    <div>
                        <h3 className="font-semibold mb-2">Charger des flèches</h3>
                        {playerArrows.length > 0 ? (
                            <div className="space-y-2">
                                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start">
                                            {selectedArrowStack ? `Pile de ${selectedArrowStack.quantity} flèches` : "Sélectionner des flèches"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width]">
                                        <div className="space-y-1">
                                            {playerArrows.map(item => (
                                                <Button key={item.id} variant="ghost" className="w-full justify-start" onClick={() => handleSelectStack(item)}>
                                                    Pile de {item.quantity} flèches
                                                </Button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {selectedArrowStack && (
                                    <div className="flex items-center gap-2 pt-2">
                                        <Input 
                                            type="number"
                                            placeholder="Quantité"
                                            value={String(quantity)}
                                            onChange={(e) => setQuantity(Math.min(Number(e.target.value), selectedArrowStack.quantity))}
                                            min={1}
                                            max={selectedArrowStack.quantity}
                                            className="flex-grow"
                                        />
                                        <Button onClick={handleLoad} size="icon"><ArrowRight className="w-4 h-4" /></Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Vous n'avez pas de flèches dans votre inventaire.</p>
                        )}
                    </div>
                </div>
                <DialogFooter className="sm:justify-between gap-2">
                    <div>
                        <Button variant="outline" size="icon" onClick={handleInspectClick}><Hammer className="w-4 h-4" /></Button>
                        <Button variant="destructive" size="icon" className="ml-2" onClick={handleDemolishClick}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Fermer
                        </Button>
                        {!isArmed && arrowQuantity > 0 && (
                             <Button onClick={handleArm}>
                                Armer
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CrossbowModal;