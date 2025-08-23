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

interface SentenceTiming {
  text: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  paragraphIndex: number;
}

// Cache for word timing calculations
const wordTimingCache = new Map<string, WordWithTiming[]>();
// Cache for sentence timing calculations (better performance)
const sentenceTimingCache = new Map<string, SentenceTiming[]>();

export const AudiobookPanel: React.FC<AudiobookPanelProps> = ({
  book,
  currentPosition,
  isPlaying
}) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const currentParagraphRef = React.useRef<HTMLParagraphElement>(null);
  const activeWordRef = React.useRef<HTMLSpanElement>(null);

  // Parse content into sentences with timing information for better performance
  const sentencesWithTiming = React.useMemo(() => {
    if (!book.content || book.content.length === 0) return [];
    
    // Create cache key from book content
    const contentHash = book.id + '_' + JSON.stringify(book.content).slice(0, 100);
    
    // Check cache first for sentences
    let cachedSentences = sentenceTimingCache.get(contentHash);
    if (!cachedSentences) {
      console.log('[AudiobookPanel] Computing sentence timings for first time...');
      const sentences: SentenceTiming[] = [];
      
      book.content.forEach((paragraph, pIndex) => {
        const text = paragraph.text;
        const duration = paragraph.endTime - paragraph.startTime;
        
        // Split into sentences using a more robust approach
        const sentenceParts = text.split(/([.!?]+\s+)/).filter(part => part.trim().length > 0);
        const completeSentences: string[] = [];
        let currentSentence = '';
        
        sentenceParts.forEach((part) => {
          currentSentence += part;
          // If this part ends with sentence ending punctuation, complete the sentence
          if (/[.!?]+\s*$/.test(part.trim())) {
            completeSentences.push(currentSentence.trim());
            currentSentence = '';
          }
        });
        
        // Add remaining text as a sentence if any
        if (currentSentence.trim()) {
          completeSentences.push(currentSentence.trim());
        }
        
        // If no sentences found, treat entire paragraph as one sentence
        if (completeSentences.length === 0) {
          completeSentences.push(text);
        }
        
        // Distribute time across sentences
        const sentenceDuration = duration / completeSentences.length;
        let currentTime = paragraph.startTime;
        
        completeSentences.forEach((sentence) => {
          sentences.push({
            text: sentence,
            startTime: currentTime,
            endTime: currentTime + sentenceDuration,
            isActive: false,
            paragraphIndex: pIndex
          });
          currentTime += sentenceDuration;
        });
      });
      
      // Cache the computed timings
      cachedSentences = sentences;
      sentenceTimingCache.set(contentHash, cachedSentences);
      console.log('[AudiobookPanel] Cached sentence timings for', sentences.length, 'sentences');
    }
    
    // Update active state based on current position (fast operation)
    return cachedSentences.map(sentence => ({
      ...sentence,
      isActive: currentPosition >= sentence.startTime && currentPosition < sentence.endTime
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

  // Find the currently active sentence
  const activeSentenceIndex = React.useMemo(() => {
    return sentencesWithTiming.findIndex(sentence => sentence.isActive);
  }, [sentencesWithTiming]);

  // Gentle auto-scroll to active sentence (less aggressive)
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

  // Auto-scroll to active sentence only if user hasn't manually scrolled
  React.useEffect(() => {
    if (!userScrolledManually && activeWordRef.current && scrollContainerRef.current && activeSentenceIndex !== -1) {
      activeWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [activeSentenceIndex, userScrolledManually]);

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
              {activeSentenceIndex >= 0 && (
                <span className="text-xs bg-green-100 px-2 py-1 rounded-full">
                  Sentence {activeSentenceIndex + 1} of {sentencesWithTiming.length}
                </span>
              )}
            </div>
            
            {/* Reading progress bar */}
            {sentencesWithTiming.length > 0 && (
              <div className="w-full bg-wood-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${Math.max(0, Math.min(100, (activeSentenceIndex / Math.max(1, sentencesWithTiming.length - 1)) * 100))}%`
                  }}
                >
                  <div className="h-full w-2 bg-green-200 rounded-full ml-auto animate-pulse"></div>
                </div>
              </div>
            )}
          </div>
          
          {book.content && book.content.length > 0 ? (
            <div className="text-lg leading-relaxed text-wood-800 space-y-4">
              {/* Render sentence-by-sentence with smooth highlighting */}
              <div className="sentence-highlighted-content">
                {sentencesWithTiming.map((sentenceData, index) => {
                  const isActive = index === activeSentenceIndex;
                  const isPastActive = index < activeSentenceIndex;
                  
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
                      {sentenceData.text}
                    </motion.p>
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
