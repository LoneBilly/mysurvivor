import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Admin = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold">Panel d'Administration</h1>
          <Button onClick={() => navigate('/')}>Retour au jeu</Button>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Bienvenue, Admin !</h2>
          <p className="text-gray-400">
            C'est ici que vous pourrez gérer les aspects du jeu. Des fonctionnalités comme la gestion des joueurs, la visualisation des statistiques globales et la modification des paramètres du jeu seront ajoutées prochainement.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Admin;