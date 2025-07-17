import { supabase } from '@/integrations/supabase/client';

export const getPublicIconUrl = (iconName: string | null): string | null => {
  if (!iconName) {
    return null;
  }
  
  if (iconName.startsWith('http')) {
    return iconName;
  }

  // Heuristique pour différencier les icônes Lucide des fichiers de stockage.
  // Les icônes Lucide sont généralement en PascalCase et n'ont pas d'extensions de fichier.
  const isLucideIcon = /^[A-Z]/.test(iconName) && !iconName.includes('.');

  if (isLucideIcon) {
    // C'est un nom d'icône Lucide, pas un fichier dans le stockage.
    // Retourne null pour que le composant ItemIcon puisse le gérer comme un nom de composant.
    return null;
  }

  const baseName = iconName.split('.')[0];
  const webpIconName = `${baseName}.webp`;

  const { data } = supabase.storage.from('items.icons').getPublicUrl(webpIconName);
  
  return data.publicUrl;
};