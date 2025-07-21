import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

const buildingSchema = z.object({
  type: z.string().min(1, "Le type est requis"),
  name: z.string().min(1, "Le nom est requis"),
  icon: z.string().optional(),
  build_time_seconds: z.number().int().min(0),
  cost_energy: z.number().int().min(0),
  cost_wood: z.number().int().min(0),
  cost_metal: z.number().int().min(0),
  cost_components: z.number().int().min(0),
});

type BuildingFormData = z.infer<typeof buildingSchema>;

interface BuildingFormProps {
  building?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const BuildingForm = ({ building, onSuccess, onCancel }: BuildingFormProps) => {
  const { register, handleSubmit, formState: { errors } } = useForm<BuildingFormData>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      type: building?.type || '',
      name: building?.name || '',
      icon: building?.icon || '',
      build_time_seconds: building?.build_time_seconds || 0,
      cost_energy: building?.cost_energy || 0,
      cost_wood: building?.cost_wood || 0,
      cost_metal: building?.cost_metal || 0,
      cost_components: building?.cost_components || 0,
    },
  });

  const onSubmit: SubmitHandler<BuildingFormData> = async (data) => {
    let error;
    if (building) {
      ({ error } = await supabase.from('building_definitions').update(data).eq('type', building.type));
    } else {
      ({ error } = await supabase.from('building_definitions').insert(data));
    }

    if (error) {
      showError(error.message);
    } else {
      showSuccess(`Bâtiment ${building ? 'mis à jour' : 'créé'} avec succès.`);
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Type (ID)</Label>
          <Input id="type" {...register('type')} disabled={!!building} />
          {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
        </div>
        <div>
          <Label htmlFor="name">Nom</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="icon">Icône (Lucide)</Label>
        <Input id="icon" {...register('icon')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="build_time_seconds">Temps de construction (s)</Label>
          <Input id="build_time_seconds" type="number" {...register('build_time_seconds', { valueAsNumber: true })} />
          {errors.build_time_seconds && <p className="text-red-500 text-xs mt-1">{errors.build_time_seconds.message}</p>}
        </div>
        <div>
          <Label htmlFor="cost_energy">Coût Énergie</Label>
          <Input id="cost_energy" type="number" {...register('cost_energy', { valueAsNumber: true })} />
          {errors.cost_energy && <p className="text-red-500 text-xs mt-1">{errors.cost_energy.message}</p>}
        </div>
        <div>
          <Label htmlFor="cost_wood">Coût Bois</Label>
          <Input id="cost_wood" type="number" {...register('cost_wood', { valueAsNumber: true })} />
          {errors.cost_wood && <p className="text-red-500 text-xs mt-1">{errors.cost_wood.message}</p>}
        </div>
        <div>
          <Label htmlFor="cost_metal">Coût Pierre</Label>
          <Input id="cost_metal" type="number" {...register('cost_metal', { valueAsNumber: true })} />
          {errors.cost_metal && <p className="text-red-500 text-xs mt-1">{errors.cost_metal.message}</p>}
        </div>
        <div>
          <Label htmlFor="cost_components">Coût Composants</Label>
          <Input id="cost_components" type="number" {...register('cost_components', { valueAsNumber: true })} />
          {errors.cost_components && <p className="text-red-500 text-xs mt-1">{errors.cost_components.message}</p>}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button>
        <Button type="submit">Sauvegarder</Button>
      </div>
    </form>
  );
};

export default BuildingForm;