import React from "react";
import { Button, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { useConvex, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Mock user ID for now - in real app, get from auth
const MOCK_USER_ID = "user1" as any;

interface BookmarksProps {
  onSelectBook: (bookId: string) => void;
}

export const Bookmarks: React.FC<BookmarksProps> = ({ onSelectBook }) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  
  // Get bookmarked audiobooks
  const bookmarks = useQuery(api.bookmarks.getUserBookmarks, { userId: MOCK_USER_ID });
  const removeBookmark = useMutation(api.bookmarks.removeBookmark);

  // Filter bookmarks based on search
  const filteredBookmarks = React.useMemo(() => {
    if (!bookmarks) return [];
    
    if (!searchQuery) return bookmarks;
    
    const query = searchQuery.toLowerCase();
    return bookmarks.filter(book => 
      book.title.toLowerCase().includes(query) || 
      book.author.toLowerCase().includes(query)
    );
  }, [bookmarks, searchQuery]);

  const handleRemoveBookmark = async (audiobookId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      await removeBookmark({
        userId: MOCK_USER_ID,
        audiobookId: audiobookId as any
      });
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
      alert('Failed to remove bookmark. Please try again.');
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (!bookmarks) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Bookmarks
        </h1>
        
        {/* Search */}
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="Search bookmarked books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startContent={<Icon icon="lucide:search" className="w-4 h-4 text-gray-400" />}
            className="flex-1"
            variant="bordered"
          />
        </div>

        {/* Stats */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {filteredBookmarks.length} bookmarked book{filteredBookmarks.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Bookmarks List */}
      <div className="flex-1 overflow-auto p-6">
        {filteredBookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <Icon icon="lucide:bookmark" className="w-16 h-16 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? "No bookmarks found" : "No bookmarks yet"}
            </h3>
            <p className="text-center">
              {searchQuery 
                ? "Try adjusting your search" 
                : "Bookmark audiobooks to access them quickly later"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookmarks.map((book) => (
              <motion.div
                key={book._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
                className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer"
                onClick={() => onSelectBook(book._id)}
              >
                <div className="flex p-4">
                  {/* Cover Image */}
                  <div className="w-16 h-20 relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex-shrink-0">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon icon="lucide:book" className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Book Info */}
                  <div className="flex-1 ml-4 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-1">
                          {book.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-xs mb-2">
                          by {book.author}
                        </p>
                        
                        {/* Progress */}
                        {book.progress > 0 && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 max-w-32">
                              <div 
                                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${book.progress * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {Math.round(book.progress * 100)}%
                            </span>
                          </div>
                        )}
                        
                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          {book.duration && (
                            <span>{formatDuration(book.duration)}</span>
                          )}
                          <span>Bookmarked {formatDate(book.bookmarkedAt)}</span>
                          {book.lastPlayedAt && (
                            <span>Last played {formatDate(book.lastPlayedAt)}</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Remove bookmark button */}
                      <Button
                        isIconOnly
                        size="sm"
                        color="default"
                        variant="light"
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                        onClick={(e) => handleRemoveBookmark(book._id, e)}
                      >
                        <Icon icon="lucide:bookmark-x" className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};