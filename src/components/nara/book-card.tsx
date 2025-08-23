"use client"

import React from "react";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { Button, Tooltip, Popover, PopoverTrigger, PopoverContent } from "@heroui/react";

interface BookInfo {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  progress?: number;
  narrator: string;
  lastPosition: number;
  duration?: string;
  genre?: string;
  rating?: number;
  publishedYear?: number;
  description?: string;
  tags?: string[];
}

interface BookCardProps {
  book: BookInfo;
  onSelectBook: (bookId: string) => void;
  showProgress?: boolean;
  variant?: 'shelf' | 'grid';
}

export const BookCard: React.FC<BookCardProps> = ({ 
  book, 
  onSelectBook, 
  showProgress = false,
  variant = 'shelf' 
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  if (variant === 'shelf') {
    return (
      <motion.div
        key={book.id}
        whileHover={{ y: -15, rotateY: 5, rotateZ: -2 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="cursor-pointer flex-shrink-0 flex flex-col items-center relative"
        onClick={() => onSelectBook(book.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative flex flex-col items-center">
          {/* Book cover */}
          <div className="relative">
            <img 
              src={book.coverUrl} 
              alt={book.title}
              className="w-[clamp(100px,14vw,200px)] h-[clamp(150px,20vw,280px)] object-cover rounded-sm shadow-[6px_6px_12px_rgba(0,0,0,0.15)]"
            />
              
            {/* Book spine/side effect */}
            <div className="absolute top-0 bottom-0 right-[-6px] w-[6px] bg-[#d0ccc7] rounded-r-sm"></div>
            
            {/* Book bottom edge */}
            <div className="absolute bottom-[-6px] left-0 right-0 h-[6px] bg-[#d0ccc7] rounded-b-sm"></div>

            {/* Book shadow on shelf */}
            <div className="absolute bottom-[-12px] left-[10%] right-[10%] h-[4px] bg-black/15 blur-sm rounded-full"></div>

            {/* Hover overlay with quick actions */}
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/60 rounded-sm flex flex-col justify-between p-3"
              >
                <div className="flex justify-end gap-1">
                  <Tooltip content="Bookmark">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="solid"
                      className="bg-white/20 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle bookmark
                      }}
                    >
                      <Icon icon="lucide:bookmark" width={14} className="text-white" />
                    </Button>
                  </Tooltip>
                  
                  <Popover placement="top" showArrow>
                    <PopoverTrigger>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="solid"
                        className="bg-white/20 backdrop-blur-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Icon icon="lucide:more-horizontal" width={14} className="text-white" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-2">
                      <div className="flex flex-col gap-1">
                        <Button size="sm" variant="light" startContent={<Icon icon="lucide:share" width={14} />}>
                          Share
                        </Button>
                        <Button size="sm" variant="light" startContent={<Icon icon="lucide:download" width={14} />}>
                          Download
                        </Button>
                        <Button size="sm" variant="light" startContent={<Icon icon="lucide:star" width={14} />}>
                          Rate
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="text-white">
                  <div className="text-xs opacity-90 mb-1">
                    {book.duration && (
                      <div className="flex items-center gap-1 mb-1">
                        <Icon icon="lucide:clock" width={12} />
                        <span>{book.duration}</span>
                      </div>
                    )}
                    {book.narrator && (
                      <div className="text-xs opacity-75">
                        Narrated by {book.narrator}
                      </div>
                    )}
                  </div>
                  
                  {showProgress && book.progress !== undefined && (
                    <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full transition-all" 
                        style={{ width: `${book.progress * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {showProgress && book.progress !== undefined && !isHovered && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/60 rounded-sm px-3 py-2">
                <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full" 
                    style={{ width: `${book.progress * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 w-[clamp(100px,14vw,200px)] text-center">
          <h3 className="text-sm font-medium line-clamp-2 leading-tight">{book.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{book.author}</p>
          
          {/* Enhanced metadata */}
          <div className="mt-2 space-y-1">
            {book.rating && (
              <div className="flex items-center justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Icon
                    key={i}
                    icon="lucide:star"
                    width={10}
                    className={i < Math.floor(book.rating!) ? "text-yellow-400 fill-current" : "text-gray-300"}
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-1">
                  {book.rating.toFixed(1)}
                </span>
              </div>
            )}
            
            {book.genre && (
              <div className="inline-flex px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                {book.genre}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid variant for search results
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="cursor-pointer group relative"
      onClick={() => onSelectBook(book.id)}
    >
      <div className="relative">
        <img 
          src={book.coverUrl} 
          alt={book.title}
          className="w-full aspect-[2/3] object-cover rounded-md shadow-md mb-3 group-hover:shadow-xl transition-shadow"
        />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-md transition-all flex items-center justify-center">
          <Button
            isIconOnly
            className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelectBook(book.id);
            }}
          >
            <Icon icon="lucide:play" width={16} />
          </Button>
        </div>

        {/* Rating badge */}
        {book.rating && (
          <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
            <Icon icon="lucide:star" width={10} className="text-yellow-400 fill-current" />
            <span>{book.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-sm font-medium line-clamp-1">{book.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
        {book.duration && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Icon icon="lucide:clock" width={12} />
            <span>{book.duration}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};