import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const { playerData, loading, refreshBaseState, refreshInventory, refreshVitals, refreshScouting } = useGame();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Chargement des données du joueur...</div>;
  }

  if (!playerData || !playerData.playerState) {
    return (
        <div className="flex flex-col justify-center items-center h-screen">
            <p>Données du joueur non trouvées.</p>
            <Button onClick={() => supabase.auth.signOut()} className="mt-4">Se déconnecter</Button>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Tableau de Bord de {playerData.playerState.username || 'Joueur'}</h1>
        <Button onClick={() => supabase.auth.signOut()}>Se déconnecter</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>Stats Vitales</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Vie: {playerData.playerState.vie}</p>
            <p>Energie: {playerData.playerState.energie}</p>
            <p>Faim: {playerData.playerState.faim}</p>
            <p>Soif: {playerData.playerState.soif}</p>
            <p>Crédits: {playerData.playerState.credits}</p>
            <Button onClick={refreshVitals} className="mt-2 w-full">Rafraîchir</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Inventaire & Coffres</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Objets (Inventaire): {playerData.inventory.length}</p>
            <p>Objets (Coffres): {playerData.chestItems.length}</p>
            <Button onClick={refreshInventory} className="mt-2 w-full">Rafraîchir</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Base & Artisanat</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Constructions: {playerData.baseConstructions.length}</p>
            <p>Jobs (Artisanat): {playerData.craftingJobs.length}</p>
            <p>Jobs (Construction): {playerData.constructionJobs.length}</p>
            <Button onClick={refreshBaseState} className="mt-2 w-full">Rafraîchir</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Missions</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Missions d'éclaireur: {playerData.scoutingMissions.length}</p>
            <Button onClick={refreshScouting} className="mt-2 w-full">Rafraîchir</Button>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4">Données brutes du joueur</h2>
      <Card>
        <CardContent className="p-0">
            <pre className="bg-gray-900 text-white p-4 rounded-md overflow-auto max-h-96">
                {JSON.stringify(playerData, null, 2)}
            </pre>
        </CardContent>
      </Card>
    </div>
  );
}