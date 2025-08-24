import React from "react";
import { Input, Select, SelectItem, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { useAvailableBooks } from "@/hooks/nara/use-available-books";

interface HistoryProps {
  onSelectBook: (bookId: string) => void;
}

export const History: React.FC<HistoryProps> = ({ onSelectBook }) => {
  const { books } = useAvailableBooks();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterBy, setFilterBy] = React.useState("all");

  // Get listening history (books with progress > 0, sorted by last played)
  const historyBooks = React.useMemo(() => {
    let filtered = books
      .filter(book => book.progress > 0) // Only books that have been started
      .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0)); // Sort by last played

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(query) || 
        book.author.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (filterBy !== "all") {
      filtered = filtered.filter(book => {
        switch (filterBy) {
          case "completed":
            return book.progress >= 0.9;
          case "in-progress":
            return book.progress > 0 && book.progress < 0.9;
          case "recently-played":
            const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            return (book.lastPlayedAt || 0) > weekAgo;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [books, searchQuery, filterBy]);

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return "Never";
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      if (diffInHours < 1) return "Just now";
      return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24 * 7) {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatPosition = (position: number): string => {
    const hours = Math.floor(position / 3600);
    const minutes = Math.floor((position % 3600) / 60);
    const seconds = Math.floor(position % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 0.9) return "success";
    if (progress >= 0.5) return "warning";
    return "primary";
  };

  const getStatusText = (progress: number) => {
    if (progress >= 0.9) return "Completed";
    if (progress >= 0.5) return "Half way";
    if (progress >= 0.1) return "Started";
    return "Just started";
  };

  // Statistics
  const stats = React.useMemo(() => {
    const completed = historyBooks.filter(book => book.progress >= 0.9).length;
    const inProgress = historyBooks.filter(book => book.progress > 0 && book.progress < 0.9).length;
    const totalListeningTime = historyBooks.reduce((total, book) => {
      return total + (book.duration * book.progress);
    }, 0);

    return { completed, inProgress, totalListeningTime };
  }, [historyBooks]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Listening History
        </h1>
        
        {/* Search and Filters */}
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="Search your history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startContent={<Icon icon="lucide:search" className="w-4 h-4 text-gray-400" />}
            className="flex-1"
            variant="bordered"
          />
          
          <Select
            placeholder="Filter"
            selectedKeys={[filterBy]}
            onSelectionChange={(keys) => setFilterBy(Array.from(keys)[0] as string)}
            className="w-48"
            variant="bordered"
          >
            <SelectItem key="all">All History</SelectItem>
            <SelectItem key="recently-played">Recently Played</SelectItem>
            <SelectItem key="in-progress">In Progress</SelectItem>
            <SelectItem key="completed">Completed</SelectItem>
          </Select>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {historyBooks.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Books Started</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.completed}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.inProgress}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatDuration(stats.totalListeningTime)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Listened</div>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-auto p-6">
        {historyBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <Icon icon="lucide:clock" className="w-16 h-16 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? "No history found" : "No listening history yet"}
            </h3>
            <p className="text-center">
              {searchQuery 
                ? "Try adjusting your search or filters" 
                : "Start listening to audiobooks to build your history"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {historyBooks.map((book) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
                className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer"
                onClick={() => onSelectBook(book.id)}
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
                    
                    {/* Progress overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${book.progress * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Book Info */}
                  <div className="flex-1 ml-4 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-1">
                          {book.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-xs mb-2">
                          by {book.author}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Chip 
                          size="sm" 
                          variant="flat" 
                          color={getProgressColor(book.progress)}
                          className="text-xs"
                        >
                          {getStatusText(book.progress)}
                        </Chip>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${book.progress * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {Math.round(book.progress * 100)}%
                      </span>
                    </div>
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Last played {formatDate(book.lastPlayedAt)}</span>
                      {book.lastPosition && (
                        <span>Position: {formatPosition(book.lastPosition)}</span>
                      )}
                      {book.duration && (
                        <span>Duration: {formatDuration(book.duration)}</span>
                      )}
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