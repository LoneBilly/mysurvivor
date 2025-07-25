import { BaseInterface } from "@/components/BaseInterface";
import { usePlayerData } from "@/hooks/usePlayerData";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { user } = useAuth();
  const { data: playerData, isLoading, error } = usePlayerData();

  if (!user) {
    return (
        <div className="container mx-auto p-4 text-center">
            <h1 className="text-2xl font-bold">Bienvenue</h1>
            <p>Veuillez vous connecter pour continuer.</p>
        </div>
    )
  }

  if (isLoading) return <div className="container mx-auto p-4">Chargement des données du joueur...</div>;
  if (error) return <div className="container mx-auto p-4">Erreur: {error.message}</div>;
  if (!playerData) return <div className="container mx-auto p-4">Aucune donnée de joueur trouvée.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Tableau de bord</h1>
      <BaseInterface playerData={playerData} />
    </div>
  );
}