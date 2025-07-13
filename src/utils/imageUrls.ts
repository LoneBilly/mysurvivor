const SUPABASE_URL = 'https://odnnuqgkkzhmkxfafzhp.supabase.co';
const ICONS_BUCKET_PATH = '/storage/v1/object/public/items.icons/';

export const getItemIconUrl = (iconName: string | null): string | null => {
  if (!iconName || !iconName.includes('.')) {
    // Retourne null si ce n'est pas un nom de fichier valide (contient une extension)
    return null;
  }
  
  // Si c'est déjà une URL complète (pour la rétrocompatibilité, au cas où)
  if (iconName.startsWith('http')) {
    return iconName;
  }

  return `${SUPABASE_URL}${ICONS_BUCKET_PATH}${iconName}`;
};