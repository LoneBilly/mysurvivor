import { supabase } from '@/integrations/supabase/client';

export const getPublicIconUrl = (iconName: string | null): string | null => {
  if (!iconName) {
    return null;
  }
  
  if (iconName.startsWith('http')) {
    return iconName;
  }

  const baseName = iconName.split('.')[0];
  const webpIconName = `${baseName}.webp`;

  const { data } = supabase.storage.from('items.icons').getPublicUrl(webpIconName);
  
  return data.publicUrl;
};