import React from "react";
import { motion } from "framer-motion";
import { Book } from "@/types/nara/book";

interface AudiobookPanelProps {
  book: Book;
  currentPosition: number;
  isPlaying: boolean;
}

interface WordWithTiming {
  word: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
}

// Cache for word timing calculations
const wordTimingCache = new Map<string, WordWithTiming[]>();

export const AudiobookPanel: React.FC<AudiobookPanelProps> = ({
  book,
  currentPosition,
  isPlaying
}) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const currentParagraphRef = React.useRef<HTMLParagraphElement>(null);
  const activeWordRef = React.useRef<HTMLSpanElement>(null);

  // Parse content into words with timing information using improved algorithm and caching
  const wordsWithTiming = React.useMemo(() => {
    if (!book.content || book.content.length === 0) return [];
    
    // Create cache key from book content
    const contentHash = book.id + '_' + JSON.stringify(book.content).slice(0, 100);
    
    // Check cache first
    let cachedWords = wordTimingCache.get(contentHash);
    if (!cachedWords) {
      console.log('[AudiobookPanel] Computing word timings for first time...');
      const words: WordWithTiming[] = [];
      
      book.content.forEach((paragraph) => {
        const text = paragraph.text;
        const paragraphWords = text.split(/\s+/).filter(word => word.trim().length > 0);
        const duration = paragraph.endTime - paragraph.startTime;
        
        // Calculate word weights based on length and complexity
        const wordWeights = paragraphWords.map(word => {
          const baseWeight = 1.0;
          const lengthWeight = Math.max(0.5, word.length / 8); // Longer words take more time
          const punctuationWeight = /[.!?;,]/.test(word) ? 1.3 : 1.0; // Punctuation adds pause
          const capitalWeight = /^[A-Z]/.test(word) ? 1.1 : 1.0; // Capitalized words (names) take slightly more time
          return baseWeight * lengthWeight * punctuationWeight * capitalWeight;
        });
        
        const totalWeight = wordWeights.reduce((sum, weight) => sum + weight, 0);
        let currentTime = paragraph.startTime;
        
        paragraphWords.forEach((word, index) => {
          const wordDuration = (wordWeights[index] / totalWeight) * duration;
          const startTime = currentTime;
          const endTime = startTime + wordDuration;
          
          words.push({
            word: word.trim(),
            startTime,
            endTime,
            isActive: false // Will be set below
          });
          
          currentTime = endTime;
        });
        
        // Add paragraph break marker
        words.push({
          word: '\n\n',
          startTime: paragraph.endTime - 0.1,
          endTime: paragraph.endTime,
          isActive: false
        });
      });
      
      // Cache the computed timings
      cachedWords = words;
      wordTimingCache.set(contentHash, cachedWords);
      console.log('[AudiobookPanel] Cached word timings for', words.length, 'words');
    }
    
    // Update active state based on current position (fast operation)
    return cachedWords.map(word => ({
      ...word,
      isActive: currentPosition >= word.startTime && currentPosition < word.endTime
    }));
  }, [book.content, book.id, currentPosition]);

  // Calculate which paragraph to highlight based on current position
  const currentParagraphIndex = React.useMemo(() => {
    if (!book.content || book.content.length === 0) return -1;
    
    // Find the paragraph that contains the current position
    for (let i = 0; i < book.content.length; i++) {
      const paragraph = book.content[i];
      if (currentPosition >= paragraph.startTime && currentPosition < paragraph.endTime) {
        return i;
      }
    }
    
    // If no exact match, find the closest paragraph before current position
    let closest = -1;
    for (let i = 0; i < book.content.length; i++) {
      const paragraph = book.content[i];
      if (paragraph.startTime <= currentPosition) {
        closest = i;
      } else {
        break;
      }
    }
    
    return closest;
  }, [book.content, currentPosition]);

  // Find the currently active word
  const activeWordIndex = React.useMemo(() => {
    return wordsWithTiming.findIndex(word => word.isActive);
  }, [wordsWithTiming]);

  // Auto-scroll to active word
  React.useEffect(() => {
    if (activeWordRef.current && scrollContainerRef.current) {
      activeWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [activeWordIndex]);

  // Auto-scroll to current paragraph fallback
  React.useEffect(() => {
    if (currentParagraphRef.current && scrollContainerRef.current && activeWordIndex === -1) {
      currentParagraphRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [currentParagraphIndex, activeWordIndex]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-cream-200 relative">
      <div className="flex-1 overflow-auto p-8 relative" ref={scrollContainerRef}>
        <motion.div 
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-2xl font-bold mb-6 text-wood-800">{book.title}</h1>
          <h2 className="text-xl text-wood-600 mb-8">Chapter {book.currentChapter}: {book.chapterTitle}</h2>
          
          {/* Audio playback status indicator */}
          <div className="mb-6 p-4 bg-wood-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-wood-700">
                <div className={`w-2 h-2 rounded-full transition-colors ${isPlaying ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                {isPlaying ? 'Playing' : 'Paused'}
                <span className="ml-2 font-mono text-xs">
                  {Math.floor(currentPosition / 60)}:{(Math.floor(currentPosition) % 60).toString().padStart(2, '0')}
                </span>
              </div>
              {activeWordIndex >= 0 && (
                <span className="text-xs bg-green-100 px-2 py-1 rounded-full">
                  Word {activeWordIndex + 1} of {wordsWithTiming.filter(w => w.word !== '\n\n').length}
                </span>
              )}
            </div>
            
            {/* Reading progress bar */}
            {wordsWithTiming.length > 0 && (
              <div className="w-full bg-wood-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${Math.max(0, Math.min(100, (activeWordIndex / Math.max(1, wordsWithTiming.filter(w => w.word !== '\n\n').length - 1)) * 100))}%`
                  }}
                >
                  <div className="h-full w-2 bg-green-200 rounded-full ml-auto animate-pulse"></div>
                </div>
              </div>
            )}
          </div>
          
          {book.content && book.content.length > 0 ? (
            <div className="text-lg leading-relaxed text-wood-800 space-y-4">
              {/* Render word-by-word with real-time highlighting */}
              <div className="word-highlighted-content">
                {wordsWithTiming.map((wordData, index) => {
                  if (wordData.word === '\n\n') {
                    return <div key={index} className="h-4" />;
                  }
                  
                  const isActive = index === activeWordIndex;
                  const isPastActive = index < activeWordIndex;
                  
                  return (
                    <motion.span
                      key={index}
                      ref={isActive ? activeWordRef : null}
                      className={`
                        inline-block transition-all duration-200 rounded-md px-1 mx-0.5
                        cursor-default select-none
                        ${isActive 
                          ? 'bg-gradient-to-r from-yellow-200 to-yellow-300 text-wood-900 shadow-lg font-semibold border border-yellow-400' 
                          : isPastActive 
                            ? 'text-wood-500 opacity-70'
                            : 'text-wood-800'
                        }
                      `}
                      animate={{
                        backgroundColor: isActive 
                          ? 'linear-gradient(to right, #FEF08A, #FDE047)' // yellow gradient
                          : 'transparent',
                        scale: isActive ? 1.08 : 1,
                        boxShadow: isActive 
                          ? '0 4px 12px rgba(251, 191, 36, 0.4), 0 2px 4px rgba(0, 0, 0, 0.1)'
                          : '0 0 0 rgba(0, 0, 0, 0)',
                        y: isActive ? -1 : 0
                      }}
                      transition={{ 
                        duration: 0.15,
                        ease: "easeOut"
                      }}
                      whileHover={!isActive && !isPastActive ? {
                        scale: 1.02,
                        color: '#92400e' // hover color
                      } : {}}
                    >
                      {wordData.word}
                    </motion.span>
                  );
                })}
              </div>
              
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm">
                  <div className="font-medium text-gray-700 mb-2">Debug Info:</div>
                  <div>Current Position: {currentPosition.toFixed(2)}s</div>
                  <div>Active Word Index: {activeWordIndex}</div>
                  <div>Total Words: {wordsWithTiming.length}</div>
                  <div>Current Paragraph: {currentParagraphIndex + 1} of {book.content?.length || 0}</div>
                  {activeWordIndex >= 0 && (
                    <div>
                      Active Word: "{wordsWithTiming[activeWordIndex]?.word}" 
                      ({wordsWithTiming[activeWordIndex]?.startTime.toFixed(2)}s - {wordsWithTiming[activeWordIndex]?.endTime.toFixed(2)}s)
                    </div>
                  )}
                </div>
              )}
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
