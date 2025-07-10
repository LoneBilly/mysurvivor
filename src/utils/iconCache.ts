import { supabase } from '@/integrations/supabase/client';

interface CachedUrl {
  url: string;
  expiresAt: number;
}

const iconCache = new Map<string, CachedUrl>();
const URL_VALIDITY_SECONDS = 60; // Durée de validité de l'URL définie dans la fonction Edge

export const getCachedSignedUrl = async (itemName: string): Promise<string | null> => {
  const cached = iconCache.get(itemName);

  // Vérifie si une URL valide et non expirée est dans le cache
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  // Si non mise en cache ou expirée, en récupérer une nouvelle
  try {
    const { data, error } = await supabase.functions.invoke('get-item-icon-url', {
      body: { itemName },
    });

    if (error) throw error;
    if (!data.signedUrl) return null;

    const newUrl = data.signedUrl;
    // Mettre en cache pour 55 secondes pour être sûr
    const expiresAt = Date.now() + (URL_VALIDITY_SECONDS - 5) * 1000; 

    iconCache.set(itemName, { url: newUrl, expiresAt });
    return newUrl;
  } catch (e) {
    console.error(`Échec de l'obtention de l'URL signée pour ${itemName}`, e);
    return null;
  }
};