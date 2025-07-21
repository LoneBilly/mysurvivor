import { useState, useEffect, useRef } from 'react';

export const useAccurateCountdown = (initialSeconds: number) => {
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const fetchTimeRef = useRef<number>(0);

  useEffect(() => {
    fetchTimeRef.current = Date.now();
    setRemainingSeconds(initialSeconds);

    if (initialSeconds <= 0) {
      return;
    }

    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - fetchTimeRef.current) / 1000);
      const newRemaining = initialSeconds - elapsedSeconds;

      if (newRemaining <= 0) {
        setRemainingSeconds(0);
        clearInterval(interval);
      } else {
        setRemainingSeconds(newRemaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [initialSeconds]);

  return remainingSeconds;
};