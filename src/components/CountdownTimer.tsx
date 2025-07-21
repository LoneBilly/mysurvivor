import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  endTime: string;
  onComplete?: () => void;
}

const CountdownTimer = ({ endTime, onComplete }: CountdownTimerProps) => {
  const calculateTimeLeft = () => {
    const difference = +new Date(endTime) - +new Date();
    let timeLeft = {
      total: difference,
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.round((difference / 1000) % 60),
    };

    if (timeLeft.seconds === 60) {
      timeLeft.minutes += 1;
      timeLeft.seconds = 0;
    }
    
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      if (newTimeLeft.total <= 0 && onComplete) {
        onComplete();
      }
    }, 1000);

    return () => clearTimeout(timer);
  });

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  if (timeLeft.total <= 0) {
    return <span>Terminé !</span>;
  }

  return (
    <span className="font-mono text-lg text-white">
      {formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
    </span>
  );
};

export default CountdownTimer;