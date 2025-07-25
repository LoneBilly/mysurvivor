import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Item } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import ItemIcon from '@/components/ItemIcon';
import { getPublicIconUrl } from '@/utils/imageUrls';

interface ItemFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemToEdit: Partial<Item> | null;
    onSave: () => void;
}

const ItemFormModal = ({ isOpen, onClose, itemToEdit, onSave }: ItemFormModalProps) => {
    const [formData, setFormData] = useState<Partial<Item>>({});
    const [icons, setIcons] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [itemTypes, setItemTypes] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            setFormData(itemToEdit || { name: '', description: '', icon: '', stackable: true, type: 'Items divers', use_action_text: null, effects: {} });
        }
    }, [isOpen, itemToEdit]);

    useEffect(() => {
        const fetchIconsAndTypes = async () => {
            const { data: iconData, error: iconError } = await supabase.storage.from('items').list();
            if (iconError) {
                console.error("Error fetching icons:", iconError);
            } else {
                const iconNames = iconData
                    .map(file => file.name)
                    .filter(name => name !== '.emptyfolderplaceholder' && !name.endsWith('.json'));
                setIcons(iconNames);
            }

            const { data: typesData, error: typesError } = await supabase
                .from('items')
                .select('type');
            
            if (typesError) {
                console.error("Error fetching item types:", typesError);
            } else if (typesData) {
                const uniqueTypes = [...new Set(typesData.map(item => item.type).filter(Boolean))];
                setItemTypes(uniqueTypes);
            }
        };
        if (isOpen) {
            fetchIconsAndTypes();
        }
    }, [isOpen]);

    const handleChange = (field: keyof Item, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!formData.name || !formData.type) {
            showError("Le nom et le type sont obligatoires.");
            return;
        }
        setLoading(true);
        const { error } = await supabase.from('items').upsert({ ...formData });
        if (error) {
            showError(error.message);
        } else {
            showSuccess(`Objet ${itemToEdit?.id ? 'mis à jour' : 'créé'} !`);
            onSave();
            onClose();
        }
        setLoading(false);
    };

    const iconUrl = useMemo(() => {
        if (!formData.icon) return null;
        return getPublicIconUrl(formData.icon);
    }, [formData.icon]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{itemToEdit?.id ? "Modifier l'objet" : "Créer un objet"}</DialogTitle>
                    <DialogDescription>Remplissez les détails de l'objet.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="icon" className="text-right">Icône</Label>
                        <div className="col-span-3 flex items-center gap-2">
                            <Select onValueChange={(value) => handleChange('icon', value)} value={formData.icon || ''}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir une icône" />
                                </SelectTrigger>
                                <SelectContent>
                                    <ScrollArea className="h-72">
                                        {icons.map(icon => (
                                            <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                                        ))}
                                    </ScrollArea>
                                </SelectContent>
                            </Select>
                            {formData.icon && (
                                <div className="w-10 h-10 bg-slate-700 rounded-md flex items-center justify-center relative flex-shrink-0">
                                    <ItemIcon iconName={iconUrl} alt={formData.name || ''} />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Nom</Label>
                        <Input id="name" value={formData.name || ''} onChange={(e) => handleChange('name', e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Description</Label>
                        <Textarea id="description" value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">Type</Label>
                        <Select onValueChange={(value) => handleChange('type', value)} value={formData.type || ''}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Choisir un type" />
                            </SelectTrigger>
                            <SelectContent>
                                {itemTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stackable" className="text-right">Empilable</Label>
                        <Switch id="stackable" checked={formData.stackable} onCheckedChange={(checked) => handleChange('stackable', checked)} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="use_action_text" className="text-right">Texte d'action</Label>
                        <Input id="use_action_text" value={formData.use_action_text || ''} onChange={(e) => handleChange('use_action_text', e.target.value)} className="col-span-3" placeholder="Ex: Manger, Boire, Lire" />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sauvegarder'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ItemFormModal;