import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseConstruction } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { AlertTriangle, Rabbit } from 'lucide-react';

interface TrapModalProps {
    isOpen: boolean;
    onClose: () => void;
    construction: BaseConstruction | null;
    onUpdate: () => void;
}

const TrapModal: React.FC<TrapModalProps> = ({ isOpen, onClose, construction, onUpdate }) => {
    if (!isOpen || !construction) return null;

    const status = construction.building_state?.status || 'disarmed';
    const hasLoot = construction.output_item_id !== null;

    const handleArm = async () => {
        const { error } = await supabase.rpc('arm_trap', { p_construction_id: construction.id });
        if (error) {
            showError(error.message);
        } else {
            showSuccess("Piège armé.");
            onUpdate();
            onClose();
        }
    };

    const handleClaim = async () => {
        const { error } = await supabase.rpc('claim_trap_loot', { p_construction_id: construction.id });
        if (error) {
            showError(error.message);
        } else {
            showSuccess("Butin récupéré.");
            onUpdate();
            onClose();
        }
    };

    const renderContent = () => {
        if (hasLoot || status === 'triggered_animal') {
            return (
                <div className="flex flex-col items-center gap-4">
                    <Rabbit className="w-16 h-16 text-green-400" />
                    <p className="text-center">Le piège a attrapé quelque chose !</p>
                    <Button onClick={handleClaim} className="w-full">Récupérer le butin</Button>
                </div>
            );
        }

        switch (status) {
            case 'armed':
                return (
                    <div className="flex flex-col items-center gap-4">
                        <AlertTriangle className="w-16 h-16 text-yellow-400" />
                        <p className="text-center">Le piège est armé et attend une proie.</p>
                    </div>
                );
            case 'disarmed':
            default:
                return (
                    <div className="flex flex-col items-center gap-4">
                        <AlertTriangle className="w-16 h-16 text-gray-500" />
                        <p className="text-center">Le piège est désarmé.</p>
                        <Button onClick={handleArm} className="w-full">Armer le piège</Button>
                    </div>
                );
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Piège</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    {renderContent()}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Fermer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default TrapModal;