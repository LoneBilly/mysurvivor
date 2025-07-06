import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";

interface BaseViewProps {
  onExit: () => void;
}

const BaseView = ({ onExit }: BaseViewProps) => {
  const gridSize = 11;
  const center = Math.floor(gridSize / 2);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 rounded-lg p-4 text-white">
      <h2 className="text-2xl font-bold mb-4">Mon Campement</h2>
      <div className="w-full max-w-md aspect-square grid gap-1" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
        {Array.from({ length: gridSize * gridSize }).map((_, index) => {
          const x = index % gridSize;
          const y = Math.floor(index / gridSize);
          const isCenter = x === center && y === center;

          return (
            <div
              key={index}
              className="aspect-square bg-gray-700 rounded flex items-center justify-center"
            >
              {isCenter && <Flame className="text-orange-500 w-3/4 h-3/4" />}
            </div>
          );
        })}
      </div>
      <Button onClick={onExit} className="mt-6 bg-blue-600 hover:bg-blue-700">
        Sortir du campement
      </Button>
    </div>
  );
};

export default BaseView;