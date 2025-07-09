import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaderboard } from "@/components/Leaderboard";
import { Link } from "react-router-dom";

export default function Index() {
  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl w-full mx-auto flex flex-col items-center">
        <Card className="bg-white text-black border-2 border-black shadow-[8px_8px_0px_#000] rounded-none mb-8 w-full">
          <CardHeader>
            <CardTitle className="text-3xl sm:text-4xl font-bold text-center">
              Bienvenue dans l'Aventure
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6 p-6">
            <p className="text-center text-lg">
              Votre survie commence maintenant. Êtes-vous prêt à relever le défi ?
            </p>
            <Link to="/game">
              <Button 
                size="lg" 
                className="bg-black text-white hover:bg-gray-800 rounded-none px-8 py-4 text-lg font-bold animate-pulse-border"
              >
                Commencer l'aventure
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Leaderboard />
      </div>
    </div>
  );
}