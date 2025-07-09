import { Link } from "react-router-dom";
import AnimatedBorderButton from "@/components/ui/AnimatedBorderButton";
import Leaderboard from "@/components/Leaderboard";
import { Gamepad2 } from "lucide-react";

export default function Index() {
  return (
    <div className="w-full min-h-screen bg-[#111] text-white">
      <div className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4 gap-12">
        <div className="text-center">
          <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-purple-400" />
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
            SURVIVAL ZONE
          </h1>
          <p className="text-lg text-gray-400 mt-2">
            Le dernier espoir de l'humanité repose sur vous.
          </p>
        </div>

        <div className="w-full max-w-md lg:max-w-lg flex flex-col gap-8">
          <Link to="/game">
            <AnimatedBorderButton className="w-full">
              Commencer l'aventure
            </AnimatedBorderButton>
          </Link>

          <Leaderboard />
        </div>
      </div>
    </div>
  );
}