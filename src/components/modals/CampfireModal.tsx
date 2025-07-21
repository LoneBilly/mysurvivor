import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useState, useEffect } from "react"
import { Flame, Clock } from "lucide-react"
import { BaseConstruction, InventoryItem } from "@/types"

interface CampfireModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campfire: BaseConstruction;
  inventory: InventoryItem[];
  onFuelAdded: () => void;
}

export default function CampfireModal({ open, onOpenChange, campfire, inventory, onFuelAdded }: CampfireModalProps) {
  const { toast } = useToast()
  const [quantity, setQuantity] = useState(1)
  const [burnTime, setBurnTime] = useState(campfire.burn_time_remaining_seconds ?? 0)

  useEffect(() => {
    if (!campfire) return;

    const updateBurnTime = () => {
        const secondsPassed = campfire.fuel_last_updated_at ? Math.floor((Date.now() - new Date(campfire.fuel_last_updated_at).getTime()) / 1000) : 0;
        const remaining = Math.max(0, (campfire.burn_time_remaining_seconds ?? 0) - secondsPassed);
        setBurnTime(remaining);
    }

    updateBurnTime();
    const interval = setInterval(updateBurnTime, 1000);

    return () => clearInterval(interval);
  }, [campfire]);

  const woodInInventory = inventory.find(item => item.items.name === 'Bois')

  const handleAddFuel = async () => {
    if (!woodInInventory) {
      toast({ title: "Erreur", description: "Vous n'avez pas de bois.", variant: "destructive" })
      return
    }
    if (quantity <= 0 || quantity > woodInInventory.quantity) {
      toast({ title: "Erreur", description: "Quantité invalide.", variant: "destructive" })
      return
    }

    const { error } = await supabase.rpc('add_fuel_to_campfire', {
      p_inventory_id: woodInInventory.id,
      p_quantity: quantity,
    })

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Succès", description: `${quantity} bois ajouté(s) au feu.` })
      onFuelAdded()
      onOpenChange(false)
    }
  }

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "Éteint"
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
    const s = Math.floor(seconds % 60).toString().padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Flame className="mr-2" /> Feu de camp
          </DialogTitle>
          <DialogDescription>
            Gérez votre feu de camp. Ajoutez du combustible pour le maintenir allumé.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-center p-4 bg-secondary rounded-md">
            <Clock className="w-6 h-6 mr-4 text-secondary-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Temps de combustion restant</p>
              <p className="text-2xl font-bold">{formatTime(burnTime)}</p>
            </div>
          </div>
          <div>
            <Label htmlFor="fuel">Ajouter du bois</Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input
                id="fuel"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                min="1"
                max={woodInInventory?.quantity || 1}
                disabled={!woodInInventory || woodInInventory.quantity === 0}
              />
              <Button onClick={handleAddFuel} disabled={!woodInInventory || woodInInventory.quantity === 0}>
                Ajouter
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Vous avez {woodInInventory?.quantity || 0} bois dans votre inventaire.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}