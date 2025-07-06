import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user) {
      showError('Erreur d\'authentification. Veuillez vous reconnecter.');
      return;
    }

    try {
      const { error } = await supabase
        .from('player_states')
        .update({ username: values.username })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') {
          showError('Ce pseudo est déjà pris. Veuillez en choisir un autre.');
        } else {
          console.error('Erreur lors de la création du profil:', error);
          showError('Erreur lors de la création du profil. Veuillez réessayer.');
        }
        return;
      }

      showSuccess('Profil créé avec succès ! Bienvenue dans le jeu !');
      await reloadProfile();
    } catch (error) {
      console.error('Erreur inattendue:', error);
      showError('Une erreur inattendue s\'est produite. Veuillez réessayer.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700 text-white">
        <CardHeader>
          <CardTitle className="text-white">Créez votre profil</CardTitle>
          <CardDescription className="text-gray-400">
            Choisissez un pseudo pour commencer votre aventure de survie.
          </CardDescription>
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
                        disabled={form.formState.isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  'Commencer à jouer'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateProfile;