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

interface WordChunkTiming {
  text: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  paragraphIndex: number;
  wordCount: number;
}

// Cache for word timing calculations
const wordTimingCache = new Map<string, WordWithTiming[]>();
// Cache for word chunk timing calculations (10 words per chunk)
const wordChunkTimingCache = new Map<string, WordChunkTiming[]>();

export const AudiobookPanel: React.FC<AudiobookPanelProps> = ({
  book,
  currentPosition,
  isPlaying
}) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const currentParagraphRef = React.useRef<HTMLParagraphElement>(null);
  const activeWordRef = React.useRef<HTMLSpanElement>(null);

  // Parse content into 10-word chunks with timing information for optimal animation
  const wordChunksWithTiming = React.useMemo(() => {
    if (!book.content || book.content.length === 0) return [];
    
    // Create cache key from book content
    const contentHash = book.id + '_' + JSON.stringify(book.content).slice(0, 100);
    
    // Check cache first for word chunks
    let cachedWordChunks = wordChunkTimingCache.get(contentHash);
    if (!cachedWordChunks) {
      console.log('[AudiobookPanel] Computing 10-word chunk timings for first time...');
      const wordChunks: WordChunkTiming[] = [];
      
      book.content.forEach((paragraph, pIndex) => {
        const text = paragraph.text;
        const duration = paragraph.endTime - paragraph.startTime;
        
        // Split into words and group into chunks of 10
        const words = text.split(/\s+/).filter(word => word.trim().length > 0);
        const chunks: string[] = [];
        
        for (let i = 0; i < words.length; i += 10) {
          const chunk = words.slice(i, i + 10).join(' ');
          chunks.push(chunk);
        }
        
        // If no chunks found, treat entire paragraph as one chunk
        if (chunks.length === 0) {
          chunks.push(text);
        }
        
        // Distribute time across word chunks based on their word count
        const totalWords = words.length;
        let currentTime = paragraph.startTime;
        
        chunks.forEach((chunk) => {
          const wordsInChunk = chunk.split(/\s+/).filter(w => w.trim().length > 0).length;
          const chunkDuration = (wordsInChunk / totalWords) * duration;
          
          wordChunks.push({
            text: chunk,
            startTime: currentTime,
            endTime: currentTime + chunkDuration,
            isActive: false,
            paragraphIndex: pIndex,
            wordCount: wordsInChunk
          });
          currentTime += chunkDuration;
        });
      });
      
      // Cache the computed timings
      cachedWordChunks = wordChunks;
      wordChunkTimingCache.set(contentHash, cachedWordChunks);
      console.log('[AudiobookPanel] Cached word chunk timings for', wordChunks.length, 'chunks');
    }
    
    // Update active state based on current position (fast operation)
    return cachedWordChunks.map(chunk => ({
      ...chunk,
      isActive: currentPosition >= chunk.startTime && currentPosition < chunk.endTime
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

  // Find the currently active word chunk
  const activeChunkIndex = React.useMemo(() => {
    return wordChunksWithTiming.findIndex(chunk => chunk.isActive);
  }, [wordChunksWithTiming]);

  // Gentle auto-scroll to active word chunk (less aggressive)
  const [userScrolledManually, setUserScrolledManually] = React.useState(false);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Track manual scrolling
  React.useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      setUserScrolledManually(true);
      
      // Reset after 3 seconds of no scrolling
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setUserScrolledManually(false);
      }, 3000);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced auto-scroll with React best practices
  const autoScrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const isInitialRenderRef = React.useRef(true);
  const lastScrolledChunkRef = React.useRef(-1);

  React.useEffect(() => {
    // Clear any pending auto-scroll
    if (autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current);
    }

    // Don't auto-scroll if user has manually scrolled recently or no active chunk
    if (userScrolledManually || activeChunkIndex === -1 || !activeWordRef.current || !scrollContainerRef.current) {
      return;
    }

    // Don't auto-scroll if we're on the same chunk (prevents jitter)
    if (activeChunkIndex === lastScrolledChunkRef.current && !isInitialRenderRef.current) {
      return;
    }

    // Use requestAnimationFrame for smooth, frame-synchronized scrolling
    const performScroll = () => {
      if (!activeWordRef.current || !scrollContainerRef.current) return;

      const scrollBehavior = isInitialRenderRef.current ? 'instant' : 'smooth';
      const blockPosition = isInitialRenderRef.current ? 'center' : 'nearest';

      try {
        activeWordRef.current.scrollIntoView({
          behavior: scrollBehavior as ScrollBehavior,
          block: blockPosition as ScrollLogicalPosition,
          inline: 'nearest'
        });
        
        lastScrolledChunkRef.current = activeChunkIndex;
        isInitialRenderRef.current = false;
        
        console.log(`[AutoScroll] Scrolled to chunk ${activeChunkIndex} (${scrollBehavior})`);
      } catch (error) {
        console.warn('[AutoScroll] Scroll failed:', error);
      }
    };

    // Use requestAnimationFrame for better performance
    autoScrollTimeoutRef.current = setTimeout(() => {
      requestAnimationFrame(performScroll);
    }, isInitialRenderRef.current ? 50 : 100); // Faster initial scroll

    return () => {
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
    };
  }, [activeChunkIndex, userScrolledManually, wordChunksWithTiming.length]);

  // Reset initial render flag when content changes
  React.useEffect(() => {
    isInitialRenderRef.current = true;
    lastScrolledChunkRef.current = -1;
  }, [book.id]);

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
              {activeChunkIndex >= 0 && (
                <span className="text-xs bg-green-100 px-2 py-1 rounded-full">
                  Chunk {activeChunkIndex + 1} of {wordChunksWithTiming.length} ({wordChunksWithTiming[activeChunkIndex]?.wordCount || 0} words)
                </span>
              )}
            </div>
            
            {/* Reading progress bar */}
            {wordChunksWithTiming.length > 0 && (
              <div className="w-full bg-wood-200 rounded-full h-2 relative">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${Math.max(0, Math.min(100, (activeChunkIndex / Math.max(1, wordChunksWithTiming.length - 1)) * 100))}%`
                  }}
                />
                {/* Animated progress bubble that shows exact position */}
                <div 
                  className="absolute top-0 w-3 h-3 bg-green-500 rounded-full shadow-lg transform -translate-x-1/2 -translate-y-0.5 transition-all duration-300 ease-out animate-pulse"
                  style={{
                    left: `${(() => {
                      if (wordChunksWithTiming.length === 0) return 0;
                      
                      // Calculate fine-grained position within active chunk
                      const activeChunk = wordChunksWithTiming[activeChunkIndex];
                      if (!activeChunk) return (activeChunkIndex / Math.max(1, wordChunksWithTiming.length - 1)) * 100;
                      
                      // Progress within the current chunk based on time
                      const chunkProgress = Math.max(0, Math.min(1, 
                        (currentPosition - activeChunk.startTime) / (activeChunk.endTime - activeChunk.startTime)
                      ));
                      
                      // Total progress = completed chunks + progress in current chunk
                      const completedChunks = activeChunkIndex / wordChunksWithTiming.length;
                      const currentChunkProgress = chunkProgress / wordChunksWithTiming.length;
                      
                      return Math.max(0, Math.min(100, (completedChunks + currentChunkProgress) * 100));
                    })()}%`
                  }}
                />
              </div>
            )}
          </div>
          
          {book.content && book.content.length > 0 ? (
            <div className="text-lg leading-relaxed text-wood-800 space-y-4">
              {/* Render word chunks with smooth highlighting (10 words at a time) */}
              <div className="word-chunk-highlighted-content">
                {wordChunksWithTiming.map((chunkData, index) => {
                  const isActive = index === activeChunkIndex;
                  const isPastActive = index < activeChunkIndex;
                  
                  return (
                    <motion.p
                      key={index}
                      ref={isActive ? activeWordRef : null}
                      className={`
                        mb-4 p-3 rounded-lg transition-all duration-300 cursor-default select-text
                        ${isActive 
                          ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-wood-900 shadow-md border-l-4 border-yellow-400' 
                          : isPastActive 
                            ? 'text-wood-600 opacity-80 bg-gray-50'
                            : 'text-wood-800 bg-transparent'
                        }
                      `}
                      animate={{
                        scale: isActive ? 1.02 : 1,
                        backgroundColor: isActive 
                          ? 'rgba(254, 240, 138, 0.3)' // subtle yellow
                          : isPastActive
                            ? 'rgba(0, 0, 0, 0.02)'
                            : 'rgba(0, 0, 0, 0)',
                        borderLeftWidth: isActive ? 4 : 0,
                        borderLeftColor: isActive ? '#FBBF24' : 'transparent'
                      }}
                      transition={{ 
                        duration: 0.4,
                        ease: "easeInOut"
                      }}
                      whileHover={!isActive ? {
                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                        scale: 1.01
                      } : {}}
                                          >
                        {chunkData.text}
                      </motion.p>
                  );
                })}
              </div>
              
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm">
                  <div className="font-medium text-gray-700 mb-2">Debug Info:</div>
                  <div>Current Position: {currentPosition.toFixed(2)}s</div>
                  <div>Active Chunk Index: {activeChunkIndex}</div>
                  <div>Total Chunks: {wordChunksWithTiming.length}</div>
                  <div>Current Paragraph: {currentParagraphIndex + 1} of {book.content?.length || 0}</div>
                  {activeChunkIndex >= 0 && (
                    <div>
                      Active Chunk ({wordChunksWithTiming[activeChunkIndex]?.wordCount || 0} words): "{wordChunksWithTiming[activeChunkIndex]?.text.substring(0, 50)}..." 
                      ({wordChunksWithTiming[activeChunkIndex]?.startTime.toFixed(2)}s - {wordChunksWithTiming[activeChunkIndex]?.endTime.toFixed(2)}s)
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
