import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

const profileSchema = z.object({
  username: z.string()
    .min(3, 'Le pseudo doit faire au moins 3 caractères.')
    .max(20, 'Le pseudo ne doit pas dépasser 20 caractères.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Le pseudo ne peut contenir que des lettres, des chiffres et des underscores.'),
});

const CreateProfile = () => {
  const { user, reloadProfile } = useAuth();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user) {
      showError('Utilisateur non trouvé. Veuillez vous reconnecter.');
      navigate('/login');
      return;
    }

    const { error } = await supabase
      .from('player_profiles')
      .update({ username: values.username })
      .eq('id', user.id);

    if (error) {
      showError(error.code === '23505' ? 'Ce pseudo est déjà pris.' : 'Erreur lors de la création du profil.');
    } else {
      showSuccess('Profil créé ! Bienvenue !');
      await reloadProfile();
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700 text-white">
        <CardHeader>
          <CardTitle className="text-white">Créez votre profil</CardTitle>
          <CardDescription className="text-gray-400">Choisissez un pseudo pour commencer votre aventure.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Pseudo</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Votre pseudo de survivant" 
                        {...field} 
                        className="bg-gray-700 border-gray-600 text-white focus:ring-blue-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {form.formState.isSubmitting ? 'Création...' : 'Commencer à jouer'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateProfile;