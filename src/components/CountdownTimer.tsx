import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface CountdownTimerProps {
  endTime: string;
  onComplete: () => void;
}

const CountdownTimer = ({ endTime, onComplete }: CountdownTimerProps) => {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedRef = useRef(false);

  const [isFinalizing, setIsFinalizing] = useState(false);

  const calculateRemaining = useCallback(() => {
    const diff = new Date(endTime).getTime() - Date.now();

    if (diff <= 0) {
      return { totalSeconds: 0, formatted: '0.0s' };
    }
    
    const totalSecondsFloat = diff / 1000;
    
    if (totalSecondsFloat < 10) {
        return { totalSeconds: totalSecondsFloat, formatted: `${totalSecondsFloat.toFixed(1)}s` };
    }

    const totalSecondsInt = Math.ceil(totalSecondsFloat);
    
    const days = Math.floor(totalSecondsInt / 86400);
    const hours = Math.floor((totalSecondsInt % 86400) / 3600);
    const minutes = Math.floor((totalSecondsInt % 3600) / 60);
    const seconds = totalSecondsInt % 60;

    if (days > 0) return { totalSeconds: totalSecondsInt, formatted: `${days}j` };
    if (hours > 0) return { totalSeconds: totalSecondsInt, formatted: `${hours}h ${minutes}m` };
    if (minutes > 0) return { totalSeconds: totalSecondsInt, formatted: `${minutes}m ${seconds}s` };
    return { totalSeconds: totalSecondsInt, formatted: `${seconds}s` };
  }, [endTime]);

  const [remaining, setRemaining] = useState(calculateRemaining());

  useEffect(() => {
    completedRef.current = false;
    setIsFinalizing(false);
    setRemaining(calculateRemaining());
  }, [endTime, calculateRemaining]);

  useEffect(() => {
    if (isFinalizing) {
      onCompleteRef.current();
    }
  }, [isFinalizing]);

  useEffect(() => {
    if (isFinalizing) return;

    let animationFrameId: number;

    const loop = () => {
      const newRemaining = calculateRemaining();
      setRemaining(newRemaining);

      if (newRemaining.totalSeconds <= 0) {
        if (!completedRef.current) {
          completedRef.current = true;
          setIsFinalizing(true);
        }
      } else {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isFinalizing, calculateRemaining]);

  if (isFinalizing) {
    return <Loader2 className="w-5 h-5 animate-spin" />;
  }

  return (
    <div className="flex flex-col items-center justify-center text-white gap-1">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-xs font-mono">
        {remaining.formatted}
      </span>
    </div>
  );
};

export default CountdownTimer;