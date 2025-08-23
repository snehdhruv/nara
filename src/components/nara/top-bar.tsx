import React from "react";
import { Slider, Button, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Book } from "@/types/nara/book";

interface TopBarProps {
  book: Book;
  isPlaying: boolean;
  currentPosition: number;
  togglePlayback: () => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  onBackToDashboard: () => void; // Add back navigation prop
}

export const TopBar: React.FC<TopBarProps> = ({
  book,
  isPlaying,
  currentPosition,
  togglePlayback,
  playbackSpeed,
  setPlaybackSpeed,
  onBackToDashboard // Add parameter
}) => {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const totalDuration = book.duration;
  const percentComplete = (currentPosition / totalDuration) * 100;

  return (
    <div className="flex items-center px-6 py-3 bg-cream-50 border-b border-cream-300 shadow-sm">
      <Button
        isIconOnly
        variant="light"
        className="mr-2 text-wood-700"
        onPress={onBackToDashboard}
        aria-label="Back to dashboard"
      >
        <Icon icon="lucide:chevron-left" width={20} />
      </Button>
      
      <div className="flex items-center gap-4">
        <img 
          src={book.coverUrl} 
          alt={book.title} 
          className="h-12 w-12 rounded-sm shadow-sm object-cover"
        />
        <div>
          <h2 className="font-semibold text-medium text-wood-800">{book.title}</h2>
          <p className="text-small text-wood-600">Narrated by {book.narrator}</p>
        </div>
      </div>

      <div className="flex-1 flex items-center gap-4 px-8">
        <Button 
          isIconOnly 
          variant="light" 
          className="text-wood-600 hover:text-wood-800"
          onPress={() => {}}
          aria-label="Previous chapter"
        >
          <Icon icon="lucide:skip-back" width={20} />
        </Button>

        <Button 
          isIconOnly 
          variant="flat" 
          color="primary"
          className="h-10 w-10 rounded-full bg-wood-600 text-white hover:bg-wood-700"
          onPress={togglePlayback}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <Icon icon={isPlaying ? "lucide:pause" : "lucide:play"} width={20} />
        </Button>

        <Button 
          isIconOnly 
          variant="light"
          className="text-wood-600 hover:text-wood-800" 
          onPress={() => {}}
          aria-label="Next chapter"
        >
          <Icon icon="lucide:skip-forward" width={20} />
        </Button>

        <div className="flex-1 flex items-center gap-3">
          <span className="text-tiny text-wood-600">{formatTime(currentPosition)}</span>
          <Slider 
            aria-label="Progress" 
            value={percentComplete} 
            className="flex-1"
            size="sm"
            color="warning"
          />
          <span className="text-tiny text-wood-600">{formatTime(totalDuration)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Tooltip content="Playback speed">
          <Button 
            variant="light" 
            size="sm"
            className="text-wood-700"
            onPress={() => {
              const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
              const currentIndex = speeds.indexOf(playbackSpeed);
              const nextIndex = (currentIndex + 1) % speeds.length;
              setPlaybackSpeed(speeds[nextIndex]);
            }}
          >
            {playbackSpeed}x
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};
