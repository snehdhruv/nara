import React from "react";
import { Card, CardBody, Chip, Divider } from "@heroui/react";
import { motion } from "framer-motion";
import { Note } from "@/types/nara/note";
import { Icon } from "@iconify/react"; // Add missing Icon import

interface NotesPanelProps {
  notes: Note[];
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ notes }) => {
  return (
    <div className="w-2/5 bg-cream-50 overflow-auto p-6">
      <h2 className="text-xl font-semibold mb-4 text-wood-800">Breakout Notes</h2>
      
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[80%] text-center text-wood-500">
          <Icon icon="lucide:book-open" width={48} className="mb-4 opacity-50" />
          <p>No notes yet. Say &quot;Hey Narrator&quot; to start a conversation.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note, index) => (
            <NoteCard key={note.id} note={note} index={index} />
          ))}
        </div>
      )}
    </div>
  );
};

interface NoteCardProps {
  note: Note;
  index: number;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, index }) => {
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
      <Card className="shadow-sm bg-white border border-cream-200">
        <CardBody className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-wood-800">{note.title}</h3>
            <Chip size="sm" variant="flat" className="bg-wood-100 text-wood-800">
              {formatTimestamp(note.timestamp)}
            </Chip>
          </div>
          
          <p className="text-small text-wood-700 mb-4">{note.content}</p>
          
          <Divider className="my-3 bg-cream-200" />
          
          <div className="space-y-3">
            <CategorySection 
              title="What I Realized" 
              items={note.categories.realized} 
              icon="lucide:lightbulb"
              color="warning"
            />
            
            <CategorySection 
              title="What I Learned" 
              items={note.categories.learned} 
              icon="lucide:book"
              color="primary"
            />
            
            <CategorySection 
              title="How to Implement" 
              items={note.categories.implement} 
              icon="lucide:check-circle"
              color="success"
            />
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
};

interface CategorySectionProps {
  title: string;
  items: string[];
  icon: string;
  color: "primary" | "success" | "warning" | "danger";
}

const CategorySection: React.FC<CategorySectionProps> = ({ title, items, icon, color }) => {
  if (items.length === 0) return null;
  
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon icon={icon} className={`text-${color}`} width={16} />
        <h4 className="text-tiny font-medium text-default-600">{title}</h4>
      </div>
      <ul className="space-y-1 pl-6">
        {items.map((item, i) => (
          <li key={i} className="text-small list-disc">{item}</li>
        ))}
      </ul>
    </div>
  );
};

const formatTimestamp = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
