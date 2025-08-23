import React from "react";
import { Slider, Button } from "@heroui/react";
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
    <div className="flex items-center justify-between w-full px-6 py-4 bg-white border-b border-gray-200">
      {/* Left section: Back button + Book info */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <Button
          isIconOnly
          variant="light"
          className="text-gray-600 hover:text-gray-800"
          onPress={onBackToDashboard}
          aria-label="Back to dashboard"
        >
          <Icon icon="lucide:chevron-left" width={20} />
        </Button>
        
        <img 
          src={book.coverUrl} 
          alt={book.title} 
          className="h-12 w-12 rounded object-cover"
        />
        
        <div className="min-w-0">
          <h2 className="font-semibold text-base text-gray-900 truncate">{book.title}</h2>
          <p className="text-sm text-gray-600 truncate">Narrated by {book.narrator}</p>
        </div>
      </div>

      {/* Center section: Media controls + Progress */}
      <div className="flex items-center gap-6 flex-1 max-w-3xl mx-8">
        {/* Media controls */}
        <div className="flex items-center gap-2">
          <Button 
            isIconOnly 
            variant="light" 
            className="text-gray-600 hover:text-gray-800"
            onPress={() => {}}
            aria-label="Previous chapter"
          >
            <Icon icon="lucide:skip-back" width={20} />
          </Button>

          <Button 
            isIconOnly 
            variant="flat" 
            className="h-12 w-12 rounded-full bg-gray-900 text-white hover:bg-gray-800"
            onPress={togglePlayback}
            aria-label={isPlaying ? "Pause" : "Play"}
            data-testid={isPlaying ? "pause-button" : "play-button"}
          >
            <Icon icon={isPlaying ? "lucide:pause" : "lucide:play"} width={20} />
          </Button>

          <Button 
            isIconOnly 
            variant="light"
            className="text-gray-600 hover:text-gray-800" 
            onPress={() => {}}
            aria-label="Next chapter"
          >
            <Icon icon="lucide:skip-forward" width={20} />
          </Button>
        </div>

        {/* Progress section */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-sm text-gray-600 font-mono tabular-nums flex-shrink-0" data-testid="current-time">
            {formatTime(currentPosition)}
          </span>
          
          <Slider 
            aria-label="Progress" 
            value={percentComplete} 
            className="flex-1"
            size="sm"
            color="warning"
            classNames={{
              track: "bg-gray-200",
              filler: "bg-orange-400"
            }}
          />
          
          <span className="text-sm text-gray-600 font-mono tabular-nums flex-shrink-0">
            {formatTime(totalDuration)}
          </span>
        </div>
      </div>

      {/* Right section: Playback speed */}
      <div className="flex items-center flex-shrink-0">
        <Button 
          variant="light" 
          size="sm"
          className="text-gray-700 hover:text-gray-900 font-medium"
          onPress={() => {
            const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
            const currentIndex = speeds.indexOf(playbackSpeed);
            const nextIndex = (currentIndex + 1) % speeds.length;
            setPlaybackSpeed(speeds[nextIndex]);
          }}
        >
          {playbackSpeed}x
        </Button>
      </div>
    </div>
  );
};
