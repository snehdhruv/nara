import React from "react";
import { motion } from "framer-motion";
import { Book } from "@/types/nara/book";

interface AudiobookPanelProps {
  book: Book;
  currentPosition: number;
  isPlaying: boolean;
}

export const AudiobookPanel: React.FC<AudiobookPanelProps> = ({
  book,
  currentPosition,
  isPlaying
}) => {

  // Calculate which paragraph to highlight based on current position
  const currentParagraphIndex = React.useMemo(() => {
    if (!book.content) return -1;
    return book.content.findIndex(
      paragraph => 
        currentPosition >= paragraph.startTime && 
        currentPosition <= paragraph.endTime
    );
  }, [book.content, currentPosition]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-cream-200 relative">
      <div className="flex-1 overflow-auto p-8 relative">
        <motion.div 
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-2xl font-bold mb-6 text-wood-800">{book.title}</h1>
          <h2 className="text-xl text-wood-600 mb-8">Chapter {book.currentChapter}: {book.chapterTitle}</h2>
          
          {/* Audio playback status indicator */}
          <div className="mb-6 p-3 bg-wood-100 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-wood-700">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              {isPlaying ? 'Playing' : 'Paused'}
              <span className="ml-2 font-mono text-xs">
                {Math.floor(currentPosition / 60)}:{(Math.floor(currentPosition) % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
          
          {book.content && book.content.length > 0 ? (
            <div className="space-y-6 text-medium leading-relaxed text-wood-800">
              {book.content.map((paragraph, index) => (
                <motion.p 
                  key={index}
                  className={`${index === currentParagraphIndex ? 'bg-wood-100 -mx-2 px-2 py-1 rounded-medium' : ''}`}
                  animate={{ 
                    opacity: index === currentParagraphIndex ? 1 : 0.8,
                    scale: index === currentParagraphIndex ? 1 : 0.99,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {paragraph.text}
                </motion.p>
              ))}
            </div>
          ) : (
            <div className="text-center text-wood-600 py-12">
              <p>Loading chapter content...</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
