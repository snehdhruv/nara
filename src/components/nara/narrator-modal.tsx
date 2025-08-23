import React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { Book } from "@/types/nara/book";

interface NarratorModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConversationComplete: (summary: string) => void;
  book: Book;
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "narrator";
  isProcessing?: boolean;
}

export const NarratorModal: React.FC<NarratorModalProps> = ({
  isOpen,
  onOpenChange,
  onConversationComplete,
  book
}) => {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add initial greeting message
      setMessages([
        {
          id: "initial",
          text: `Hi there! I'm the narrator for "${book.title}". How can I help you understand the content better?`,
          sender: "narrator"
        }
      ]);
    }
  }, [isOpen, book.title, messages.length]);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || isProcessing) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user"
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsProcessing(true);

    // Simulate AI response after a delay
    setTimeout(() => {
      let responseText = "";
      
      // Simulate different responses based on user input
      if (inputValue.toLowerCase().includes("2-minute rule")) {
        responseText = "The 2-minute rule from Atomic Habits suggests that when you're building a new habit, it should take less than two minutes to do. The idea is to make your habits so easy that you'll do them even when you don't feel motivated. For example, 'read before bed each night' becomes 'read one page before bed each night.' Would you like me to explain how you can apply this to a specific habit you're trying to build?";
      } else if (inputValue.toLowerCase().includes("habit")) {
        responseText = "In Atomic Habits, James Clear explains that habits are the compound interest of self-improvement. Small changes often appear to make no difference until you cross a critical threshold. The most powerful outcomes are the result of many small decisions over time. What specific habit are you interested in developing?";
      } else {
        responseText = "That's an interesting question about " + book.title + ". The key insight here is that small habits can lead to remarkable results when practiced consistently over time. Would you like me to elaborate on any specific concept from the book?";
      }

      const narratorMessage: Message = {
        id: Date.now().toString(),
        text: responseText,
        sender: "narrator"
      };

      setMessages(prev => [...prev, narratorMessage]);
      setIsProcessing(false);
    }, 1500);
  };

  const handleFinishConversation = () => {
    // Generate a summary based on the conversation
    const summary = "We discussed the 2-minute rule from Atomic Habits and how to apply it to build sustainable habits by starting with very small actions.";
    
    onConversationComplete(summary);
    onOpenChange(false);
    
    // Clear messages for next conversation
    setTimeout(() => {
      setMessages([]);
    }, 300);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onOpenChange}
      size="2xl"
      scrollBehavior="inside"
      classNames={{
        base: "bg-cream-50"
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 border-b border-cream-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-wood-100 flex items-center justify-center">
                  <Icon icon="lucide:mic" className="text-wood-700" width={20} />
                </div>
                <div>
                  <h3 className="text-wood-800">Conversation with Narrator</h3>
                  <p className="text-small text-wood-600">{book.narrator} - {book.title}</p>
                </div>
              </div>
            </ModalHeader>
            
            <ModalBody className="py-4">
              <div className="space-y-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.sender === 'user' 
                            ? 'bg-wood-600 text-white rounded-tr-none' 
                            : 'bg-cream-200 text-wood-800 rounded-tl-none'
                        }`}
                      >
                        {message.text}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-cream-200 p-3 rounded-lg rounded-tl-none flex items-center gap-1">
                      <span className="w-2 h-2 bg-wood-400 rounded-full animate-pulse" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-2 h-2 bg-wood-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }}></span>
                      <span className="w-2 h-2 bg-wood-400 rounded-full animate-pulse" style={{ animationDelay: "600ms" }}></span>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ModalBody>
            
            <ModalFooter className="flex flex-col gap-3 border-t border-cream-300 pt-3">
              <div className="flex w-full gap-2">
                <Input
                  placeholder="Ask the narrator a question..."
                  value={inputValue}
                  onValueChange={setInputValue}
                  className="bg-cream-100"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                  endContent={
                    <Button
                      isIconOnly
                      variant="light"
                      className="text-wood-600"
                      onPress={handleSendMessage}
                      isDisabled={!inputValue.trim() || isProcessing}
                    >
                      <Icon icon="lucide:send" width={18} />
                    </Button>
                  }
                />
              </div>
              
              <div className="flex justify-between w-full">
                <Button 
                  variant="light" 
                  className="text-wood-700"
                  onPress={onClose}
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-wood-600 text-white hover:bg-wood-700 border-none"
                  onPress={handleFinishConversation}
                >
                  Finish & Generate Notes
                </Button>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
