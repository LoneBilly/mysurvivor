interface CampfireProgressBarProps {
  progress: number;
}

const CampfireProgressBar = ({ progress }: CampfireProgressBarProps) => {
  return (
    <div className="absolute bottom-1 left-1 right-1 h-1.5 bg-gray-900/50 rounded-full overflow-hidden border border-black/20">
      <div
        className="h-full bg-orange-500 rounded-full"
        style={{ width: `${progress}%`, transition: 'width 1s linear' }}
      />
    </div>
  );
};

export default CampfireProgressBar;