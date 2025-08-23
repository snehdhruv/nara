import React from "react";
import { Chip } from "@heroui/react";
import { motion } from "framer-motion";
import { Note } from "@/types/nara/note";
import { Icon } from "@iconify/react";

interface NotesPanelProps {
  notes: Note[];
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ notes }) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Sort notes by timestamp (earliest first) - one continuous conversation
  const sortedNotes = React.useMemo(() => 
    [...notes].sort((a, b) => a.timestamp - b.timestamp), 
    [notes]
  );

  // Simple auto-scroll when notes change
  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [notes.length]);

  return (
    <div className="w-2/5 bg-cream-50 flex flex-col h-full">
      {/* Fixed header */}
      <div className="flex-shrink-0 p-6 pb-4">
        <h2 className="text-xl font-semibold text-wood-800">Breakout Notes</h2>
      </div>
      
      {/* Single white box containing all notes */}
      <div className="flex-1 mx-6 mb-6 min-h-0">
        <div className="bg-white rounded-lg shadow-sm border border-cream-200 h-full">
          {notes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-wood-500 p-8">
              <Icon icon="lucide:book-open" width={48} className="mb-4 opacity-50" />
              <p>No notes yet. Say &quot;Hey Narrator&quot; to start a conversation.</p>
            </div>
          ) : (
            <div 
              ref={scrollContainerRef}
              className="h-full overflow-y-auto p-6"
            >
              <div className="space-y-6">
                {sortedNotes.map((note, index) => (
                  <NoteSection 
                    key={note.id} 
                    note={note} 
                    index={index}
                    isLast={index === sortedNotes.length - 1}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface NoteSectionProps {
  note: Note;
  index: number;
  isLast: boolean;
}

const NoteSection: React.FC<NoteSectionProps> = ({ note, index, isLast }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1]
      }}
    >
      <div className="pb-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-wood-800 mb-1">{note.title}</h3>
            {note.topic && (
              <Chip size="sm" variant="flat" className="bg-blue-100 text-blue-800 mb-2">
                {note.topic}
              </Chip>
            )}
          </div>
          <div className="ml-3 flex flex-col items-end gap-1">
            <Chip size="sm" variant="flat" className="bg-orange-100 text-orange-800">
              📖 {formatAudiobookTimestamp(note.audiobookPosition)}
            </Chip>
            <Chip size="sm" variant="flat" className="bg-wood-100 text-wood-600 text-xs">
              {formatWallClockTime(note.timestamp)}
            </Chip>
          </div>
        </div>
        
        <p className="text-small text-wood-700 leading-relaxed">{note.content}</p>
        
        {/* Separator line between notes (except for last note) */}
        {!isLast && (
          <div className="mt-6 pt-0">
            <div className="h-px bg-cream-200"></div>
          </div>
        )}
      </div>
    </motion.div>
  );
};



const formatAudiobookTimestamp = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
};

const formatWallClockTime = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
};
