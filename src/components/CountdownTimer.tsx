import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  endTime: string;
  onComplete?: () => void;
}

const CountdownTimer = ({ endTime, onComplete }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let animationFrameId: number;
    const end = new Date(endTime).getTime();

    const updateTimer = () => {
      if (isComplete) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        return;
      }

      const now = new Date().getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft('');
        setIsComplete(true);
        if (onComplete) {
          onComplete();
        }
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        return;
      }

      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      let timerString = '';
      if (hours > 0) {
        timerString += `${hours.toString().padStart(2, '0')}:`;
      }
      timerString += `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      setTimeLeft(timerString);
      animationFrameId = requestAnimationFrame(updateTimer);
    };

    updateTimer();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [endTime, onComplete, isComplete]);

  return <>{timeLeft}</>;
};

export default CountdownTimer;