import { Progress } from "@/components/ui/progress";

interface CraftingProgressBarProps {
  progress: number;
}

const CraftingProgressBar = ({ progress }: CraftingProgressBarProps) => {
  return (
    <div className="absolute bottom-1 left-1 right-1 h-1.5 bg-gray-900/50 rounded-full overflow-hidden border border-black/20">
      <div
        className="h-full bg-yellow-400 rounded-full"
        style={{ width: `${progress}%`, transition: 'width 0.2s linear' }}
      />
    </div>
  );
};

export default CraftingProgressBar;