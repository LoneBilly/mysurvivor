import { useState, useEffect } from 'react';
import { CraftingJob } from '@/types/game';

interface CraftingProgressBarProps {
  job: CraftingJob;
}

const CraftingProgressBar = ({ job }: CraftingProgressBarProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = new Date(job.started_at).getTime();
    const endTime = new Date(job.ends_at).getTime();
    const totalDuration = endTime - startTime;

    if (totalDuration <= 0) {
      setProgress(100);
      return;
    }

    let animationFrameId: number;

    const updateProgress = () => {
      const now = Date.now();
      const elapsedTime = now - startTime;
      const currentProgress = Math.min(100, (elapsedTime / totalDuration) * 100);
      setProgress(currentProgress);

      if (currentProgress < 100) {
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => cancelAnimationFrame(animationFrameId);
  }, [job]);

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