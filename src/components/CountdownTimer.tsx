import { useState, useEffect, useCallback, useRef } from 'react';

interface CountdownTimerProps {
  endTime: string;
  onComplete: () => void;
  totalDurationMs: number;
}

const CountdownTimer = ({ endTime, onComplete, totalDurationMs }: CountdownTimerProps) => {
  const calculateState = useCallback(() => {
    const now = Date.now();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return { remaining: 'Terminé', progress: 100, isFinished: true };
    
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    const remaining = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    const progress = Math.min(100, ((totalDurationMs - diff) / totalDurationMs) * 100);
    
    return { remaining, progress, isFinished: false };
  }, [endTime, totalDurationMs]);

  const [state, setState] = useState(calculateState);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (state.isFinished) return;
    const interval = setInterval(() => {
      const newState = calculateState();
      setState(newState);
      if (newState.isFinished) {
        clearInterval(interval);
        onCompleteRef.current();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [state.isFinished, calculateState]);

  return (
    <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
      <span>Expire dans</span>
      <span className="font-mono">{state.remaining}</span>
    </div>
  );
};

export default CountdownTimer;