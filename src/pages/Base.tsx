import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlayerData, BaseConstruction } from '@/types';
import CampfireModal from '@/components/modals/CampfireModal';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Base = () => {
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCampfireModalOpen, setIsCampfireModalOpen] = useState(false);
  const [selectedCampfire, setSelectedCampfire] = useState<BaseConstruction | null>(null);

  const fetchPlayerData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.rpc('get_full_player_data', { p_user_id: user.id });
    if (error) {
      console.error("Error fetching player data", error);
    } else {
      setPlayerData(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlayerData();
  }, []);

  const handleCampfireClick = (campfire: BaseConstruction) => {
    setSelectedCampfire(campfire);
    setIsCampfireModalOpen(true);
  };

  const onFuelAdded = () => {
    fetchPlayerData();
  };

  if (loading) {
    return <div>Chargement de la base...</div>;
  }

  if (!playerData) {
    return <div>Données du joueur non trouvées.</div>;
  }

  const campfire = playerData.baseConstructions.find(b => b.type === 'campfire');

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Ma Base</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {playerData.baseConstructions.map(construction => {
          if (construction.type === 'campfire') {
            return (
              <Card key={construction.id}>
                <CardHeader>
                  <CardTitle className="flex items-center"><Flame className="mr-2" /> Feu de camp</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Niveau {construction.level}</p>
                  <Button className="mt-2" onClick={() => handleCampfireClick(construction)}>
                    Gérer le feu
                  </Button>
                </CardContent>
              </Card>
            );
          }
          // Vous pouvez ajouter d'autres types de constructions ici
          return (
             <Card key={construction.id}>
                <CardHeader>
                  <CardTitle>{construction.type}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Position: ({construction.x}, {construction.y})</p>
                  <p>Niveau: {construction.level}</p>
                </CardContent>
              </Card>
          );
        })}
      </div>

      {selectedCampfire && playerData.inventory && (
        <CampfireModal
          open={isCampfireModalOpen}
          onOpenChange={setIsCampfireModalOpen}
          campfire={selectedCampfire}
          inventory={playerData.inventory}
          onFuelAdded={onFuelAdded}
        />
      )}
    </div>
  );
};

export default Base;