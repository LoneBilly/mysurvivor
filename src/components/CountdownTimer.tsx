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
    const totalSeconds = Math.max(0, Math.ceil(diff / 1000));

    if (totalSeconds === 0) {
      return { totalSeconds: 0, formatted: '0s' };
    }
    
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return { totalSeconds, formatted: `${days}j` };
    if (hours > 0) return { totalSeconds, formatted: `${hours}h ${minutes}m` };
    if (minutes > 0) return { totalSeconds, formatted: `${minutes}m ${seconds}s` };
    return { totalSeconds, formatted: `${seconds}s` };
  }, [endTime]);

  const [remaining, setRemaining] = useState(calculateRemaining());

  useEffect(() => {
    completedRef.current = false;
    setIsFinalizing(false);
    setRemaining(calculateRemaining());
  }, [endTime, calculateRemaining]);

  useEffect(() => {
    if (remaining.totalSeconds <= 0) {
      if (!completedRef.current && !isFinalizing) {
        completedRef.current = true;
        setIsFinalizing(true);
        onCompleteRef.current();
      }
      return;
    }

    const timer = setInterval(() => {
      setRemaining(calculateRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, [remaining, calculateRemaining, isFinalizing]);

  if (isFinalizing) {
    return (
      <div className="flex items-center justify-center gap-1 text-xs">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Finalisation...</span>
      </div>
    );
  }

  return <>{remaining.formatted}</>;
};

export default CountdownTimer;