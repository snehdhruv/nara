import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Book } from "@/types/nara/book";
import { 
  cleanTranscriptText, 
  splitIntoSentences,
  calculateWordTimings,
  findActiveWord,
  WordTiming,
  TextSegmentTiming
} from "@/utils/text-processing";

interface AudiobookPanelProps {
  book: Book;
  currentPosition: number;
  isPlaying: boolean;
}

interface ProcessedSegment {
  originalIndex: number;
  sentences: string[];
  startTime: number;
  endTime: number;
  wordTimings: WordTiming[];
}

export const AudiobookPanelV2: React.FC<AudiobookPanelProps> = ({
  book,
  currentPosition,
  isPlaying
}) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const activeSegmentRef = React.useRef<HTMLDivElement>(null);
  const activeWordRef = React.useRef<HTMLSpanElement>(null);
  const lastScrollPositionRef = React.useRef(0);
  const userHasScrolledRef = React.useRef(false);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Process book content into sentence-based segments with word timings
  const processedContent = React.useMemo(() => {
    if (!book.content || book.content.length === 0) return [];
    
    const processed: ProcessedSegment[] = [];
    
    book.content.forEach((paragraph, index) => {
      // Clean and split into sentences
      const cleanedText = cleanTranscriptText(paragraph.text);
      const sentences = splitIntoSentences(cleanedText);
      
      if (sentences.length === 0) return;
      
      // Calculate timing for each sentence
      const duration = paragraph.endTime - paragraph.startTime;
      const avgTimePerChar = duration / cleanedText.length;
      
      let currentTime = paragraph.startTime;
      const sentenceTimings: { sentence: string; start: number; end: number }[] = [];
      
      sentences.forEach(sentence => {
        const sentenceDuration = sentence.length * avgTimePerChar;
        sentenceTimings.push({
          sentence,
          start: currentTime,
          end: currentTime + sentenceDuration
        });
        currentTime += sentenceDuration;
      });
      
      // Calculate word-level timings for the entire segment
      const fullText = sentences.join(' ');
      const wordTimings = calculateWordTimings(
        fullText,
        paragraph.startTime,
        paragraph.endTime
      );
      
      processed.push({
        originalIndex: index,
        sentences,
        startTime: paragraph.startTime,
        endTime: paragraph.endTime,
        wordTimings
      });
    });
    
    return processed;
  }, [book.content, book.id]);

  // Find active segment and word
  const activeInfo = React.useMemo(() => {
    const segment = processedContent.find(
      seg => currentPosition >= seg.startTime && currentPosition < seg.endTime
    );
    
    if (!segment) {
      // Find the closest segment
      const closest = processedContent.reduce((prev, curr) => {
        if (curr.startTime <= currentPosition) return curr;
        return prev;
      }, processedContent[0]);
      
      return {
        segmentIndex: processedContent.indexOf(closest),
        segment: closest,
        activeWord: null,
        activeSentenceIndex: -1
      };
    }
    
    // Find active word
    const activeWord = findActiveWord(segment.wordTimings, currentPosition);
    
    // Find which sentence the active word belongs to
    let wordsSoFar = 0;
    let activeSentenceIndex = -1;
    
    if (activeWord) {
      for (let i = 0; i < segment.sentences.length; i++) {
        const sentenceWords = segment.sentences[i].split(/\s+/).length;
        if (activeWord.index < wordsSoFar + sentenceWords) {
          activeSentenceIndex = i;
          break;
        }
        wordsSoFar += sentenceWords;
      }
    }
    
    return {
      segmentIndex: processedContent.indexOf(segment),
      segment,
      activeWord,
      activeSentenceIndex
    };
  }, [processedContent, currentPosition]);

  // Simple auto-scroll that actually works
  React.useEffect(() => {
    if (!isPlaying || userHasScrolledRef.current || !activeWordRef.current || !scrollContainerRef.current) return;
    
    console.log('[Auto-scroll] Following word:', activeInfo.activeWord?.word);
    
    // Just scroll the active word into view
    activeWordRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });
  }, [activeInfo.activeWord?.index, isPlaying]);

  // Track manual scrolling
  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const currentScroll = container.scrollTop;
      
      // Detect manual scroll (significant change not from auto-scroll)
      if (Math.abs(currentScroll - lastScrollPositionRef.current) > 200) {
        userHasScrolledRef.current = true;
        console.log('[Auto-scroll] Manual scroll detected, pausing auto-scroll');
        
        // Clear existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        // Re-enable auto-scroll after 3 seconds of no manual scrolling
        scrollTimeoutRef.current = setTimeout(() => {
          userHasScrolledRef.current = false;
          console.log('[Auto-scroll] Re-enabling auto-scroll');
        }, 3000);
      }
      
      lastScrollPositionRef.current = currentScroll;
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Render word with highlighting
  const renderWord = (
    word: WordTiming,
    index: number,
    isInActiveSegment: boolean
  ) => {
    const isActive = isInActiveSegment && activeInfo.activeWord?.index === index;
    const isPast = isInActiveSegment && activeInfo.activeWord && index < activeInfo.activeWord.index;
    
    return (
      <span
        key={`${word.word}-${index}`}
        ref={isActive ? activeWordRef : null}
        className={`inline-block mr-1 ${
          isActive 
            ? 'text-amber-900 font-semibold bg-amber-100 px-1 rounded' 
            : isPast 
              ? 'text-wood-600 opacity-90' 
              : 'text-wood-800'
        }`}
        style={{ wordBreak: 'break-word' }}
      >
        {word.word}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-cream-100 to-cream-200 relative">
      {/* Reading Progress Header */}
      <div className="bg-wood-800 text-cream-100 px-8 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
              isPlaying 
                ? 'bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.6)]' 
                : 'bg-gray-400'
            }`} />
            <span className="text-sm font-medium">
              {isPlaying ? 'Narrating' : 'Paused'}
            </span>
            <span className="text-xs opacity-75 font-mono">
              {Math.floor(currentPosition / 60)}:{(Math.floor(currentPosition) % 60).toString().padStart(2, '0')}
              {' / '}
              {Math.floor((book.content?.[book.content.length - 1]?.endTime || 0) / 60)}:
              {(Math.floor(book.content?.[book.content.length - 1]?.endTime || 0) % 60).toString().padStart(2, '0')}
            </span>
          </div>
          
          {activeInfo.segment && (
            <div className="text-xs opacity-75">
              Segment {activeInfo.segmentIndex + 1} of {processedContent.length}
            </div>
          )}
        </div>
        
        {/* Fine-grained progress bar */}
        <div className="mt-2 h-1 bg-wood-900 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-600"
            animate={{
              width: `${(currentPosition / (book.content?.[book.content.length - 1]?.endTime || 1)) * 100}%`
            }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-8 py-6 scroll-smooth"
      >
        <div className="w-full max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            <h1 className="text-3xl font-bold mb-2 text-wood-900">{book.title}</h1>
            <h2 className="text-xl text-wood-700 mb-8">
              Chapter {book.currentChapter}: {book.chapterTitle}
            </h2>
            
            {/* Render processed segments */}
            <div className="space-y-6 w-full">
              {processedContent.map((segment, segmentIndex) => {
                const isActiveSegment = segmentIndex === activeInfo.segmentIndex;
                const segmentElement = (
                  <motion.div
                    key={`segment-${segmentIndex}`}
                    ref={isActiveSegment ? activeSegmentRef : null}
                    className={`relative transition-all duration-300 ${
                      isActiveSegment 
                        ? 'scale-[1.02]' 
                        : segmentIndex < activeInfo.segmentIndex 
                          ? 'opacity-70' 
                          : 'opacity-90'
                    }`}
                  >
                    {/* Segment indicator */}
                    <AnimatePresence>
                      {isActiveSegment && (
                        <motion.div
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: '4px', opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          className="absolute -left-4 top-0 bottom-0 bg-amber-500 rounded-full"
                        />
                      )}
                    </AnimatePresence>
                    
                    {/* Render sentences with word-level highlighting */}
                    <div className={`p-4 rounded-lg transition-all duration-300 ${
                      isActiveSegment 
                        ? 'bg-gradient-to-r from-amber-50 to-transparent shadow-md' 
                        : ''
                    }`}>
                      <p className="text-lg leading-relaxed break-words hyphens-auto w-full">
                        {segment.wordTimings.map((word, wordIndex) => 
                          renderWord(word, wordIndex, isActiveSegment)
                        )}
                      </p>
                    </div>
                  </motion.div>
                );
                
                return segmentElement;
              })}
            </div>
            
            {/* Loading indicator if no content */}
            {processedContent.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-wood-800 mb-4" />
                <p className="text-wood-600">Loading transcript...</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};