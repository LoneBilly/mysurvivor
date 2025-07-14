import { useState, useEffect, useCallback, useRef } from 'react';

interface CountdownTimerProps {
  endTime: string;
  onComplete: () => void;
}

const CountdownTimer = ({ endTime, onComplete }: CountdownTimerProps) => {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedRef = useRef(false);

  const calculateRemaining = useCallback(() => {
    const diff = new Date(endTime).getTime() - Date.now();
    const totalSeconds = Math.max(0, Math.floor(diff / 1000)); // Ensure it doesn't go negative

    if (totalSeconds === 0) {
      return { totalSeconds: 0, formatted: '0s' }; // Explicitly show '0s'
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
    setRemaining(calculateRemaining());
  }, [endTime, calculateRemaining]);

  useEffect(() => {
    if (remaining.totalSeconds <= 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        // Call onComplete after a small delay, but only if it's truly finished (totalSeconds is 0)
        if (remaining.totalSeconds === 0) {
          setTimeout(() => onCompleteRef.current(), 250);
        }
      }
      return;
    }

    const timer = setInterval(() => {
      setRemaining(calculateRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, [remaining, calculateRemaining]);

  return <>{remaining.formatted}</>;
};

export default CountdownTimer;