import { useState, useEffect, useCallback, useRef } from 'react';

interface CountdownTimerProps {
  endTime: string;
  onComplete: () => void;
}

const CountdownTimer = ({ endTime, onComplete }: CountdownTimerProps) => {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const calculateRemaining = useCallback(() => {
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) {
      return { totalSeconds: 0, formatted: 'Terminé' };
    }
    
    const totalSeconds = Math.floor(diff / 1000);
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
    if (remaining.totalSeconds <= 0) {
      onCompleteRef.current();
      return;
    }

    const timer = setInterval(() => {
      const newRemaining = calculateRemaining();
      if (newRemaining.totalSeconds <= 0) {
        clearInterval(timer);
      }
      setRemaining(newRemaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [remaining.totalSeconds, calculateRemaining]);

  return <>{remaining.formatted}</>;
};

export default CountdownTimer;