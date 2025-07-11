import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

const MarketBuyTab = () => {
  return (
    <Card className="h-full w-full bg-gray-800/50 border-gray-700 flex flex-col items-center justify-center text-center p-8">
      <CardContent>
        <Construction className="w-16 h-16 text-yellow-400 mb-4" />
        <h3 className="text-xl font-bold text-white">En construction</h3>
        <p className="text-gray-400 mt-2">
          La section d'achat du marché est en cours de développement. Revenez bientôt pour échanger avec d'autres survivants !
        </p>
      </CardContent>
    </Card>
  );
};

export default MarketBuyTab;