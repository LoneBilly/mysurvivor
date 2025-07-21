import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface CountdownTimerProps {
  endTime: string;
  onComplete?: () => void;
}

const CountdownTimer = ({ endTime, onComplete }: CountdownTimerProps) => {
  const calculateTimeLeft = () => {
    const difference = +new Date(endTime) - +new Date();
    if (difference <= 0) {
      return { total: 0, minutes: 0, seconds: 0 };
    }
    
    const totalSeconds = Math.floor(difference / 1000);
    
    const timeLeft = {
      total: difference,
      minutes: Math.floor(totalSeconds / 60),
      seconds: totalSeconds % 60,
    };
    
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      if (newTimeLeft.total <= 0) {
        clearInterval(timer);
        if (onComplete) {
          onComplete();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, onComplete]);

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  if (!isClient) {
    return <Loader2 className="w-6 h-6 animate-spin text-white" />;
  }

  if (timeLeft.total <= 0) {
    return null;
  }

  return (
    <span className="font-mono text-lg text-white">
      {formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
    </span>
  );
};

export default CountdownTimer;