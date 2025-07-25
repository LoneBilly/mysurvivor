import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BaseConstruction, InventoryItem } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Crosshair, ArrowRight } from 'lucide-react';
import { useGame } from '@/contexts/GameContext';

interface CrossbowModalProps {
    isOpen: boolean;
    onClose: () => void;
    construction: BaseConstruction | null;
    onUpdate: () => void;
}

const CrossbowModal: React.FC<CrossbowModalProps> = ({ isOpen, onClose, construction, onUpdate }) => {
    const { playerData, items } = useGame();
    const [selectedArrowStack, setSelectedArrowStack] = useState<InventoryItem | null>(null);
    const [quantity, setQuantity] = useState(1);

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
                        <Crosshair className="w-16 h-16 text-purple-400" />
                        <p className="mt-4 font-bold text-lg">Flèches chargées: {arrowQuantity}</p>
                        <p className="mt-1 text-sm">{isArmed ? "Statut: Armée" : "Statut: Non armée"}</p>
                    </div>
                    
                    <div>
                        <h3 className="font-semibold mb-2">Charger des flèches</h3>
                        {playerArrows.length > 0 ? (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    {playerArrows.map(item => (
                                        <Button key={item.id} variant={selectedArrowStack?.id === item.id ? "default" : "outline"} onClick={() => handleSelectStack(item)}>
                                            Pile de {item.quantity}
                                        </Button>
                                    ))}
                                </div>
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
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Fermer
                    </Button>
                    {!isArmed && arrowQuantity > 0 && (
                         <Button onClick={handleArm}>
                            Armer
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CrossbowModal;